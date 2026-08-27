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
      update: jest.fn(),
    },
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
      });

      const result = await service.getStatus('user-1');

      expect(result.isActive).toBe(true);
      expect(result.daysLeft).toBeGreaterThanOrEqual(2);
      expect(result.isTrial).toBe(false);
    });

    it('ad_free이고 inAppPurchaseToken이 없으면 isTrial=true (무료체험)', async () => {
      const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({
        subscriptionTier: SubscriptionTier.ad_free,
        subscriptionExpiresAt: future,
        inAppPurchaseToken: null,
      });

      const result = await service.getStatus('user-1');

      expect(result.isTrial).toBe(true);
    });
  });
});
