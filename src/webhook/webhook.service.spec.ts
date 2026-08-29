import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationTypeV2 } from '@apple/app-store-server-library';
import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';
import { WebhookService } from './webhook.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { IosSubscriptionVerifier } from '@/subscription/verifiers/ios-subscription.verifier';
import { AndroidSubscriptionVerifier } from '@/subscription/verifiers/android-subscription.verifier';
import {
  PurchaseVerificationFailedException,
  PurchaseVerificationUnavailableException,
} from '@/subscription/verifiers/verification-error';

describe('WebhookService (구독 웹훅)', () => {
  let service: WebhookService;

  const mockSubscriptionService = {
    findUserIdByOriginalTransactionId: jest.fn(),
    applyVerifiedPurchase: jest.fn(),
    expireSubscription: jest.fn(),
  };

  const mockIosVerifier = {
    decodeNotification: jest.fn(),
  };

  const mockAndroidVerifier = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const iosVerified = (overrides = {}) => ({
    platform: SubscriptionPlatform.IOS,
    productId: 'family_planner_ad_free_monthly',
    originalTransactionId: 'orig-tx-1',
    tier: SubscriptionTier.ad_free,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    autoRenewing: true,
    status: SubscriptionStatus.active,
    ...overrides,
  });

  const googlePayload = (payload: unknown) => ({
    message: { data: Buffer.from(JSON.stringify(payload)).toString('base64') },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: IosSubscriptionVerifier, useValue: mockIosVerifier },
        { provide: AndroidSubscriptionVerifier, useValue: mockAndroidVerifier },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    // clearAllMocks는 호출 기록만 지우고 구현은 남기므로, 앞선 테스트의 mockRejectedValue가 새어나가지 않도록 reset한다
    jest.resetAllMocks();
  });

  describe('handleAppleWebhook', () => {
    it('영수증이 무효한 영구 실패는 삼키고 200 취급 (재시도해도 동일)', async () => {
      mockIosVerifier.decodeNotification.mockRejectedValue(
        new PurchaseVerificationFailedException(),
      );

      const result = await service.handleAppleWebhook({
        signedPayload: 'broken',
      });

      expect(result).toEqual({ message: 'Apple webhook 수신 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('일시적 장애는 예외를 던져 Apple의 재시도를 유도', async () => {
      mockIosVerifier.decodeNotification.mockRejectedValue(
        new PurchaseVerificationUnavailableException(),
      );

      await expect(
        service.handleAppleWebhook({ signedPayload: 'payload' }),
      ).rejects.toThrow(PurchaseVerificationUnavailableException);
    });

    it('DB 오류 등 예상치 못한 예외도 삼키지 않고 재시도를 유도', async () => {
      mockIosVerifier.decodeNotification.mockResolvedValue({
        notification: {
          notificationType: NotificationTypeV2.DID_RENEW,
          data: {},
          signedDate: Date.now(),
        },
        verified: iosVerified(),
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );
      mockSubscriptionService.applyVerifiedPurchase.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(
        service.handleAppleWebhook({ signedPayload: 'payload' }),
      ).rejects.toThrow('DB connection lost');
    });

    it('signedPayload가 없으면 검증 없이 정상 응답', async () => {
      const result = await service.handleAppleWebhook({});

      expect(result).toEqual({ message: 'Apple webhook 수신 완료' });
      expect(mockIosVerifier.decodeNotification).not.toHaveBeenCalled();
    });

    it('테스트 알림은 반영 없이 정상 응답', async () => {
      mockIosVerifier.decodeNotification.mockResolvedValue({
        notification: { notificationType: NotificationTypeV2.TEST, data: {} },
        verified: null,
      });

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 처리 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('거래 정보가 없는 알림(예: 요약 알림)은 조용히 무시', async () => {
      mockIosVerifier.decodeNotification.mockResolvedValue({
        notification: {
          notificationType: NotificationTypeV2.RENEWAL_EXTENSION,
          data: {},
        },
        verified: null,
      });

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 수신 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('알 수 없는 originalTransactionId면 반영하지 않고 정상 응답', async () => {
      mockIosVerifier.decodeNotification.mockResolvedValue({
        notification: {
          notificationType: NotificationTypeV2.DID_RENEW,
          data: {},
          signedDate: Date.now(),
        },
        verified: iosVerified({ originalTransactionId: 'unknown-tx' }),
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        null,
      );

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 수신 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('DID_RENEW 알림은 subtype을 포함한 eventType으로 반영', async () => {
      const verified = iosVerified();
      mockIosVerifier.decodeNotification.mockResolvedValue({
        notification: {
          notificationType: NotificationTypeV2.DID_RENEW,
          subtype: 'BILLING_RECOVERY',
          data: {},
          signedDate: Date.now(),
        },
        verified,
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 처리 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).toHaveBeenCalledWith(
        'user-1',
        verified,
        expect.objectContaining({ eventType: 'DID_RENEW_BILLING_RECOVERY' }),
      );
      expect(mockSubscriptionService.expireSubscription).not.toHaveBeenCalled();
    });

    it('REVOKE(환불) 알림은 revoked 상태로 반영되어 혜택이 회수된다', async () => {
      const verified = iosVerified({
        status: SubscriptionStatus.revoked,
        autoRenewing: false,
      });
      mockIosVerifier.decodeNotification.mockResolvedValue({
        notification: {
          notificationType: NotificationTypeV2.REVOKE,
          data: {},
          signedDate: Date.now(),
        },
        verified,
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 처리 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ status: SubscriptionStatus.revoked }),
        expect.objectContaining({ eventType: NotificationTypeV2.REVOKE }),
      );
    });
  });

  describe('handleGoogleWebhook', () => {
    it('message.data가 없으면 바로 정상 응답', async () => {
      const result = await service.handleGoogleWebhook({});

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
      expect(mockAndroidVerifier.verify).not.toHaveBeenCalled();
    });

    it('구독 알림이 아닌 테스트 알림은 검증 없이 무시', async () => {
      const result = await service.handleGoogleWebhook(
        googlePayload({ testNotification: { version: '1.0' } }),
      );

      expect(result).toEqual({ message: 'Google webhook 처리 완료' });
      expect(mockAndroidVerifier.verify).not.toHaveBeenCalled();
    });

    it('영수증이 무효한 영구 실패는 삼키고 200 취급', async () => {
      mockAndroidVerifier.verify.mockRejectedValue(
        new PurchaseVerificationFailedException(),
      );

      const result = await service.handleGoogleWebhook(
        googlePayload({
          subscriptionNotification: {
            purchaseToken: 'token-1',
            notificationType: 4,
          },
        }),
      );

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
    });

    it('스토어 일시 장애는 예외를 던져 Pub/Sub 재전송을 유도', async () => {
      mockAndroidVerifier.verify.mockRejectedValue(
        new PurchaseVerificationUnavailableException(),
      );

      await expect(
        service.handleGoogleWebhook(
          googlePayload({
            subscriptionNotification: {
              purchaseToken: 'token-1',
              notificationType: 4,
            },
          }),
        ),
      ).rejects.toThrow(PurchaseVerificationUnavailableException);
    });

    it('알 수 없는 purchaseToken(역조회 실패)이면 반영하지 않음', async () => {
      mockAndroidVerifier.verify.mockResolvedValue({
        platform: SubscriptionPlatform.ANDROID,
        productId: 'family_planner_ad_free_monthly',
        originalTransactionId: 'token-unknown',
        tier: SubscriptionTier.ad_free,
        expiresAt: null,
        autoRenewing: true,
        status: SubscriptionStatus.active,
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        null,
      );

      const result = await service.handleGoogleWebhook(
        googlePayload({
          subscriptionNotification: {
            purchaseToken: 'token-unknown',
            notificationType: 4,
          },
        }),
      );

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('정상 갱신 알림은 재검증 후 알림 유형 이름으로 반영', async () => {
      const verified = {
        platform: SubscriptionPlatform.ANDROID,
        productId: 'family_planner_ad_free_monthly',
        originalTransactionId: 'token-1',
        tier: SubscriptionTier.ad_free,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenewing: true,
        status: SubscriptionStatus.active,
      };
      mockAndroidVerifier.verify.mockResolvedValue(verified);
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );

      const result = await service.handleGoogleWebhook(
        googlePayload({
          subscriptionNotification: {
            purchaseToken: 'token-1',
            notificationType: 2, // RENEWED
          },
          eventTimeMillis: String(Date.now()),
        }),
      );

      expect(result).toEqual({ message: 'Google webhook 처리 완료' });
      expect(mockAndroidVerifier.verify).toHaveBeenCalledWith('token-1');
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).toHaveBeenCalledWith(
        'user-1',
        verified,
        expect.objectContaining({ eventType: 'GOOGLE_RENEWED' }),
      );
    });

    it('업그레이드로 토큰이 교체되면 linkedPurchaseToken으로 사용자를 찾는다', async () => {
      mockAndroidVerifier.verify.mockResolvedValue({
        platform: SubscriptionPlatform.ANDROID,
        productId: 'family_planner_ad_free_monthly',
        originalTransactionId: 'token-new',
        linkedOriginalTransactionId: 'token-old',
        tier: SubscriptionTier.ad_free,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenewing: true,
        status: SubscriptionStatus.active,
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user-1');

      const result = await service.handleGoogleWebhook(
        googlePayload({
          subscriptionNotification: {
            purchaseToken: 'token-new',
            notificationType: 4,
          },
        }),
      );

      expect(result).toEqual({ message: 'Google webhook 처리 완료' });
      expect(
        mockSubscriptionService.findUserIdByOriginalTransactionId,
      ).toHaveBeenLastCalledWith('token-old');
      expect(mockSubscriptionService.applyVerifiedPurchase).toHaveBeenCalled();
    });

    it('환불(voidedPurchase) 알림은 즉시 revoked로 회수', async () => {
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );

      const result = await service.handleGoogleWebhook(
        googlePayload({
          voidedPurchaseNotification: {
            purchaseToken: 'token-1',
            orderId: 'order-1',
            productType: 1,
          },
        }),
      );

      expect(result).toEqual({ message: 'Google webhook 처리 완료' });
      expect(mockSubscriptionService.expireSubscription).toHaveBeenCalledWith(
        'user-1',
        SubscriptionStatus.revoked,
      );
      expect(mockAndroidVerifier.verify).not.toHaveBeenCalled();
    });
  });
});
