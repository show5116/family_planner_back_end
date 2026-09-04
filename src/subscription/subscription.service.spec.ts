/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ANDROID_SUBSCRIPTION_VERIFIER,
  IOS_SUBSCRIPTION_VERIFIER,
  VerifiedPurchase,
} from './verifiers/subscription-verifier.interface';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prismaService: PrismaService;

  const mockTx = {
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    subscriptionEvent: {
      create: jest.fn(),
    },
    user: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  /** 체험 이월 대상이 아닌 일반 사용자 (applyVerifiedPurchase가 트랜잭션 안에서 조회) */
  const paidUser = {
    subscriptionTier: SubscriptionTier.premium,
    subscriptionExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
    inAppPurchaseToken: 'orig-tx-1',
    trialCarryoverDays: 0,
  };

  const mockPrismaService = {
    user: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAndroidVerifier = {
    verify: jest.fn(),
  };

  const mockIosVerifier = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: ANDROID_SUBSCRIPTION_VERIFIER,
          useValue: mockAndroidVerifier,
        },
        { provide: IOS_SUBSCRIPTION_VERIFIER, useValue: mockIosVerifier },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();

    mockTx.user.findUniqueOrThrow.mockResolvedValue(paidUser);

    // $transaction(callback) 형태 호출을 mockTx로 실행
    mockPrismaService.$transaction.mockImplementation(async (arg) => {
      if (typeof arg === 'function') {
        return arg(mockTx);
      }
      return Promise.all(arg);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyPurchase', () => {
    const userId = 'user-1';

    it('platform=ANDROID인데 purchaseToken이 없으면 400', async () => {
      await expect(
        service.verifyPurchase(userId, {
          platform: SubscriptionPlatform.ANDROID,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAndroidVerifier.verify).not.toHaveBeenCalled();
    });

    it('platform=IOS인데 signedTransaction이 없으면 400', async () => {
      await expect(
        service.verifyPurchase(userId, { platform: SubscriptionPlatform.IOS }),
      ).rejects.toThrow(BadRequestException);

      expect(mockIosVerifier.verify).not.toHaveBeenCalled();
    });

    it('검증 실패 시 verifier가 던진 예외를 그대로 전파', async () => {
      mockAndroidVerifier.verify.mockRejectedValue(
        new UnprocessableEntityException(
          'subscription.errors.verification_failed',
        ),
      );

      await expect(
        service.verifyPurchase(userId, {
          platform: SubscriptionPlatform.ANDROID,
          purchaseToken: 'invalid-token',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('검증 성공 시 Subscription/SubscriptionEvent/User가 트랜잭션 안에서 모두 갱신됨', async () => {
      const verified: VerifiedPurchase = {
        platform: SubscriptionPlatform.ANDROID,
        productId: 'premium_monthly',
        originalTransactionId: 'purchase-token-abc',
        tier: SubscriptionTier.premium,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenewing: true,
        status: SubscriptionStatus.active,
      };
      mockAndroidVerifier.verify.mockResolvedValue(verified);
      mockTx.subscription.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.premium,
        subscriptionExpiresAt: verified.expiresAt,
        inAppPurchaseToken: verified.originalTransactionId,
        subscription: {
          autoRenewing: true,
          status: SubscriptionStatus.active,
        },
      });

      const result = await service.verifyPurchase(userId, {
        platform: SubscriptionPlatform.ANDROID,
        purchaseToken: 'purchase-token-abc',
      });

      expect(mockTx.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({
            userId,
            tier: SubscriptionTier.premium,
            originalTransactionId: 'purchase-token-abc',
          }),
        }),
      );
      expect(mockTx.subscriptionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            eventType: 'VERIFY_PURCHASE',
          }),
        }),
      );
      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            subscriptionTier: SubscriptionTier.premium,
          }),
        }),
      );
      expect(result.tier).toBe(SubscriptionTier.premium);
    });
  });

  describe('applyVerifiedPurchase', () => {
    const userId = 'user-1';
    const verified: VerifiedPurchase = {
      platform: SubscriptionPlatform.IOS,
      productId: 'premium_monthly',
      originalTransactionId: 'orig-tx-1',
      tier: SubscriptionTier.premium,
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
      autoRenewing: true,
      status: SubscriptionStatus.active,
    };

    it('기존 lastVerifiedAt보다 과거 이벤트는 무시 (웹훅 순서 역전 방지)', async () => {
      mockTx.subscription.findUnique.mockResolvedValue({
        lastVerifiedAt: new Date('2026-07-05T00:00:00.000Z'),
      });

      await service.applyVerifiedPurchase(userId, verified, {
        eventType: 'DID_RENEW',
        rawPayload: {},
        occurredAt: new Date('2026-07-01T00:00:00.000Z'), // 과거
      });

      expect(mockTx.subscription.upsert).not.toHaveBeenCalled();
      expect(mockTx.user.update).not.toHaveBeenCalled();
    });

    it('lastVerifiedAt보다 최신 이벤트는 정상 반영', async () => {
      mockTx.subscription.findUnique.mockResolvedValue({
        lastVerifiedAt: new Date('2026-07-01T00:00:00.000Z'),
      });

      await service.applyVerifiedPurchase(userId, verified, {
        eventType: 'DID_RENEW',
        rawPayload: {},
        occurredAt: new Date('2026-07-05T00:00:00.000Z'),
      });

      expect(mockTx.subscription.upsert).toHaveBeenCalled();
      expect(mockTx.user.update).toHaveBeenCalled();
    });

    it('status가 expired/revoked면 User.subscriptionTier를 free로 되돌림', async () => {
      mockTx.subscription.findUnique.mockResolvedValue(null);

      await service.applyVerifiedPurchase(
        userId,
        { ...verified, status: SubscriptionStatus.revoked },
        { eventType: 'REVOKE', rawPayload: {} },
      );

      expect(mockTx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionTier: SubscriptionTier.free,
          }),
        }),
      );
    });
  });

  describe('무료 체험 잔여일 이월', () => {
    const userId = 'user-1';
    const now = new Date('2026-09-04T00:00:00.000Z');
    const storeExpiresAt = new Date('2026-10-04T00:00:00.000Z');

    const verified: VerifiedPurchase = {
      platform: SubscriptionPlatform.IOS,
      productId: 'family_planner_ad_free_monthly',
      originalTransactionId: 'orig-tx-1',
      tier: SubscriptionTier.ad_free,
      expiresAt: storeExpiresAt,
      autoRenewing: true,
      status: SubscriptionStatus.active,
    };

    /** 체험 10일 남은 사용자 */
    const trialUser = {
      subscriptionTier: SubscriptionTier.ad_free,
      subscriptionExpiresAt: new Date('2026-09-14T00:00:00.000Z'),
      inAppPurchaseToken: null,
      trialCarryoverDays: 0,
    };

    const userUpdateData = () =>
      mockTx.user.update.mock.calls[0][0].data as {
        subscriptionTier: SubscriptionTier;
        subscriptionExpiresAt: Date | null;
        trialCarryoverDays: number;
      };

    beforeEach(() => {
      mockTx.subscription.findUnique.mockResolvedValue(null);
    });

    it('체험 10일 남은 사용자가 결제하면 잔여일이 만료일에 더해진다', async () => {
      mockTx.user.findUniqueOrThrow.mockResolvedValue(trialUser);

      await service.applyVerifiedPurchase(userId, verified, {
        eventType: 'VERIFY_PURCHASE',
        rawPayload: {},
        occurredAt: now,
      });

      const data = userUpdateData();
      expect(data.trialCarryoverDays).toBe(10);
      expect(data.subscriptionExpiresAt).toEqual(
        new Date('2026-10-14T00:00:00.000Z'),
      );
    });

    it('체험이 없으면 스토어 만료일 그대로', async () => {
      mockTx.user.findUniqueOrThrow.mockResolvedValue({
        ...trialUser,
        subscriptionTier: SubscriptionTier.free,
        subscriptionExpiresAt: null,
      });

      await service.applyVerifiedPurchase(userId, verified, {
        eventType: 'VERIFY_PURCHASE',
        rawPayload: {},
        occurredAt: now,
      });

      const data = userUpdateData();
      expect(data.trialCarryoverDays).toBe(0);
      expect(data.subscriptionExpiresAt).toEqual(storeExpiresAt);
    });

    it('갱신 시에도 이월분이 유지되고 중복 적립되지 않는다', async () => {
      mockTx.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.ad_free,
        subscriptionExpiresAt: new Date('2026-10-14T00:00:00.000Z'),
        inAppPurchaseToken: 'orig-tx-1',
        trialCarryoverDays: 10,
      });

      await service.applyVerifiedPurchase(
        userId,
        { ...verified, expiresAt: new Date('2026-11-04T00:00:00.000Z') },
        {
          eventType: 'DID_RENEW',
          rawPayload: {},
          occurredAt: new Date('2026-10-04T00:00:00.000Z'),
        },
      );

      const data = userUpdateData();
      expect(data.trialCarryoverDays).toBe(10);
      expect(data.subscriptionExpiresAt).toEqual(
        new Date('2026-11-14T00:00:00.000Z'),
      );
    });

    it('환불(revoked)은 이월분과 무관하게 즉시 free로 회수', async () => {
      mockTx.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.ad_free,
        subscriptionExpiresAt: new Date('2026-10-14T00:00:00.000Z'),
        inAppPurchaseToken: 'orig-tx-1',
        trialCarryoverDays: 10,
      });

      await service.applyVerifiedPurchase(
        userId,
        { ...verified, status: SubscriptionStatus.revoked },
        { eventType: 'REFUND', rawPayload: {}, occurredAt: now },
      );

      const data = userUpdateData();
      expect(data.subscriptionTier).toBe(SubscriptionTier.free);
      expect(data.subscriptionExpiresAt).toBeNull();
      expect(data.trialCarryoverDays).toBe(0);
    });

    it('스토어 만료(expired)라도 이월분이 남아 있으면 그 기간까지 혜택 유지', async () => {
      mockTx.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.ad_free,
        subscriptionExpiresAt: new Date('2026-10-14T00:00:00.000Z'),
        inAppPurchaseToken: 'orig-tx-1',
        trialCarryoverDays: 10,
      });

      await service.applyVerifiedPurchase(
        userId,
        { ...verified, status: SubscriptionStatus.expired },
        {
          eventType: 'EXPIRED',
          rawPayload: {},
          occurredAt: new Date('2026-10-05T00:00:00.000Z'),
        },
      );

      const data = userUpdateData();
      expect(data.subscriptionTier).toBe(SubscriptionTier.ad_free);
      expect(data.subscriptionExpiresAt).toEqual(
        new Date('2026-10-14T00:00:00.000Z'),
      );
      expect(data.trialCarryoverDays).toBe(10);
    });

    it('이월분까지 모두 지나 만료되면 free + 이월분 초기화', async () => {
      mockTx.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.ad_free,
        subscriptionExpiresAt: new Date('2026-10-14T00:00:00.000Z'),
        inAppPurchaseToken: 'orig-tx-1',
        trialCarryoverDays: 10,
      });

      await service.applyVerifiedPurchase(
        userId,
        { ...verified, status: SubscriptionStatus.expired },
        {
          eventType: 'EXPIRED',
          rawPayload: {},
          occurredAt: new Date('2026-10-20T00:00:00.000Z'),
        },
      );

      const data = userUpdateData();
      expect(data.subscriptionTier).toBe(SubscriptionTier.free);
      expect(data.trialCarryoverDays).toBe(0);
    });
  });

  describe('findUserIdByOriginalTransactionId', () => {
    it('originalTransactionId로 userId를 역조회', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        userId: 'user-42',
      });

      const result =
        await service.findUserIdByOriginalTransactionId('orig-tx-1');

      expect(result).toBe('user-42');
      expect(prismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { originalTransactionId: 'orig-tx-1' },
        select: { userId: true },
      });
    });

    it('일치하는 구독이 없으면 null', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      const result = await service.findUserIdByOriginalTransactionId('unknown');

      expect(result).toBeNull();
    });
  });

  describe('expireSubscription', () => {
    it('Subscription을 expired로, User를 free로 되돌림', async () => {
      await service.expireSubscription('user-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.subscription.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { status: SubscriptionStatus.expired },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          subscriptionTier: SubscriptionTier.free,
          subscriptionExpiresAt: null,
          trialCarryoverDays: 0,
        },
      });
    });
  });

  describe('getStatus', () => {
    it('free tier면 isActive=false', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.free,
        subscriptionExpiresAt: null,
        inAppPurchaseToken: null,
        subscription: null,
      });

      const result = await service.getStatus('user-1');

      expect(result.isActive).toBe(false);
      expect(result.daysLeft).toBe(0);
    });

    it('premium이고 만료일이 미래면 isActive=true, daysLeft 계산', async () => {
      const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.premium,
        subscriptionExpiresAt: future,
        inAppPurchaseToken: 'token',
        subscription: {
          autoRenewing: false,
          status: SubscriptionStatus.canceled,
        },
      });

      const result = await service.getStatus('user-1');

      expect(result.isActive).toBe(true);
      expect(result.daysLeft).toBeGreaterThanOrEqual(2);
      expect(result.isTrial).toBe(false);
      // 해지(자동 갱신 OFF)한 구독은 autoRenewing=false
      expect(result.autoRenewing).toBe(false);
    });

    it('ad_free이고 inAppPurchaseToken이 없으면 isTrial=true (무료체험)', async () => {
      const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.ad_free,
        subscriptionExpiresAt: future,
        inAppPurchaseToken: null,
        subscription: null,
      });

      const result = await service.getStatus('user-1');

      expect(result.isTrial).toBe(true);
      expect(result.autoRenewing).toBe(false);
    });
  });
});
