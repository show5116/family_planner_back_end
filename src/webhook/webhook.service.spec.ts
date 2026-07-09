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

describe('WebhookService (구독 웹훅)', () => {
  let service: WebhookService;

  const mockSubscriptionService = {
    findUserIdByOriginalTransactionId: jest.fn(),
    applyVerifiedPurchase: jest.fn(),
    expireSubscription: jest.fn(),
  };

  const mockGetVerifier = {
    verifyAndDecodeTransaction: jest.fn(),
  };

  const mockIosVerifier = {
    verifyAndDecodeNotification: jest.fn(),
    getVerifier: jest.fn().mockReturnValue(mockGetVerifier),
    toVerifiedPurchase: jest.fn(),
  };

  const mockAndroidVerifier = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

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
    jest.clearAllMocks();
    mockIosVerifier.getVerifier.mockReturnValue(mockGetVerifier);
  });

  describe('handleAppleWebhook', () => {
    it('JWS 검증 자체가 실패해도 예외를 삼키고 200 취급 메시지를 반환', async () => {
      mockIosVerifier.verifyAndDecodeNotification.mockRejectedValue(
        new Error('invalid signature'),
      );

      const result = await service.handleAppleWebhook({
        signedPayload: 'broken',
      });

      expect(result).toEqual({ message: 'Apple webhook 수신 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('signedTransactionInfo가 없는 알림(예: 요약 알림)은 조용히 무시', async () => {
      mockIosVerifier.verifyAndDecodeNotification.mockResolvedValue({
        notificationType: NotificationTypeV2.RENEWAL_EXTENSION,
        data: {},
      });

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 수신 완료' });
      expect(mockGetVerifier.verifyAndDecodeTransaction).not.toHaveBeenCalled();
    });

    it('알 수 없는 originalTransactionId면 반영하지 않고 정상 응답', async () => {
      mockIosVerifier.verifyAndDecodeNotification.mockResolvedValue({
        notificationType: NotificationTypeV2.DID_RENEW,
        data: { signedTransactionInfo: 'signed-tx' },
        signedDate: Date.now(),
      });
      mockGetVerifier.verifyAndDecodeTransaction.mockResolvedValue({
        originalTransactionId: 'unknown-tx',
      });
      mockIosVerifier.toVerifiedPurchase.mockReturnValue({
        platform: SubscriptionPlatform.IOS,
        productId: 'premium_monthly',
        originalTransactionId: 'unknown-tx',
        tier: SubscriptionTier.premium,
        expiresAt: null,
        autoRenewing: true,
        status: SubscriptionStatus.active,
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

    it('DID_RENEW 알림은 applyVerifiedPurchase 호출 (expireSubscription 아님)', async () => {
      mockIosVerifier.verifyAndDecodeNotification.mockResolvedValue({
        notificationType: NotificationTypeV2.DID_RENEW,
        data: { signedTransactionInfo: 'signed-tx' },
        signedDate: Date.now(),
      });
      mockGetVerifier.verifyAndDecodeTransaction.mockResolvedValue({
        originalTransactionId: 'orig-tx-1',
      });
      const verified = {
        platform: SubscriptionPlatform.IOS,
        productId: 'premium_monthly',
        originalTransactionId: 'orig-tx-1',
        tier: SubscriptionTier.premium,
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
        autoRenewing: true,
        status: SubscriptionStatus.active,
      };
      mockIosVerifier.toVerifiedPurchase.mockReturnValue(verified);
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
        expect.objectContaining({ eventType: NotificationTypeV2.DID_RENEW }),
      );
      expect(mockSubscriptionService.expireSubscription).not.toHaveBeenCalled();
    });

    it('EXPIRED/REVOKE 알림은 expireSubscription을 호출 (applyVerifiedPurchase 아님)', async () => {
      mockIosVerifier.verifyAndDecodeNotification.mockResolvedValue({
        notificationType: NotificationTypeV2.REVOKE,
        data: { signedTransactionInfo: 'signed-tx' },
        signedDate: Date.now(),
      });
      mockGetVerifier.verifyAndDecodeTransaction.mockResolvedValue({
        originalTransactionId: 'orig-tx-1',
      });
      mockIosVerifier.toVerifiedPurchase.mockReturnValue({
        platform: SubscriptionPlatform.IOS,
        productId: 'premium_monthly',
        originalTransactionId: 'orig-tx-1',
        tier: SubscriptionTier.premium,
        expiresAt: null,
        autoRenewing: false,
        status: SubscriptionStatus.revoked,
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );

      const result = await service.handleAppleWebhook({
        signedPayload: 'payload',
      });

      expect(result).toEqual({ message: 'Apple webhook 처리 완료' });
      expect(mockSubscriptionService.expireSubscription).toHaveBeenCalledWith(
        'user-1',
      );
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });
  });

  describe('handleGoogleWebhook', () => {
    it('message.data가 없으면 바로 정상 응답', async () => {
      const result = await service.handleGoogleWebhook({});

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
      expect(mockAndroidVerifier.verify).not.toHaveBeenCalled();
    });

    it('구독 알림이 아닌 테스트 알림은 검증 없이 무시', async () => {
      const payload = { testNotification: {} };
      const data = Buffer.from(JSON.stringify(payload)).toString('base64');

      const result = await service.handleGoogleWebhook({ message: { data } });

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
      expect(mockAndroidVerifier.verify).not.toHaveBeenCalled();
    });

    it('purchaseToken 검증 실패 시 예외를 삼키고 200 취급', async () => {
      const payload = {
        subscriptionNotification: {
          purchaseToken: 'token-1',
          notificationType: 4,
        },
      };
      const data = Buffer.from(JSON.stringify(payload)).toString('base64');
      mockAndroidVerifier.verify.mockRejectedValue(new Error('invalid token'));

      const result = await service.handleGoogleWebhook({ message: { data } });

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
    });

    it('알 수 없는 purchaseToken(역조회 실패)이면 반영하지 않음', async () => {
      const payload = {
        subscriptionNotification: {
          purchaseToken: 'token-unknown',
          notificationType: 4,
        },
      };
      const data = Buffer.from(JSON.stringify(payload)).toString('base64');
      mockAndroidVerifier.verify.mockResolvedValue({
        platform: SubscriptionPlatform.ANDROID,
        productId: 'premium_monthly',
        originalTransactionId: 'token-unknown',
        tier: SubscriptionTier.premium,
        expiresAt: null,
        autoRenewing: true,
        status: SubscriptionStatus.active,
      });
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        null,
      );

      const result = await service.handleGoogleWebhook({ message: { data } });

      expect(result).toEqual({ message: 'Google webhook 수신 완료' });
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).not.toHaveBeenCalled();
    });

    it('정상 갱신 알림은 재검증 후 applyVerifiedPurchase 호출', async () => {
      const payload = {
        subscriptionNotification: {
          purchaseToken: 'token-1',
          notificationType: 2, // RENEWED
        },
        eventTimeMillis: String(Date.now()),
      };
      const data = Buffer.from(JSON.stringify(payload)).toString('base64');
      const verified = {
        platform: SubscriptionPlatform.ANDROID,
        productId: 'premium_monthly',
        originalTransactionId: 'token-1',
        tier: SubscriptionTier.premium,
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
        autoRenewing: true,
        status: SubscriptionStatus.active,
      };
      mockAndroidVerifier.verify.mockResolvedValue(verified);
      mockSubscriptionService.findUserIdByOriginalTransactionId.mockResolvedValue(
        'user-1',
      );

      const result = await service.handleGoogleWebhook({ message: { data } });

      expect(result).toEqual({ message: 'Google webhook 처리 완료' });
      expect(mockAndroidVerifier.verify).toHaveBeenCalledWith('token-1');
      expect(
        mockSubscriptionService.applyVerifiedPurchase,
      ).toHaveBeenCalledWith(
        'user-1',
        verified,
        expect.objectContaining({ eventType: 'GOOGLE_2' }),
      );
    });
  });
});
