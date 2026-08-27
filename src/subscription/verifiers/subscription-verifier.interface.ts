import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';

export interface VerifiedPurchase {
  platform: SubscriptionPlatform;
  productId: string;
  /** Android: purchaseToken / iOS: originalTransactionId */
  originalTransactionId: string;
  latestTransactionId?: string;
  /** Google 업그레이드·재구독 시 교체된 이전 purchaseToken */
  linkedOriginalTransactionId?: string;
  tier: SubscriptionTier;
  /** 유예 기간 중에는 유예 종료 시점까지 연장된 값 */
  expiresAt: Date | null;
  autoRenewing: boolean;
  status: SubscriptionStatus;
}

export interface SubscriptionVerifier {
  /** 클라이언트가 전달한 영수증(purchaseToken / signedTransaction) 검증 */
  verify(token: string): Promise<VerifiedPurchase>;

  /** 저장해 둔 originalTransactionId로 스토어 최신 상태 재조회 (복원·재검증용) */
  verifyByOriginalTransactionId(
    originalTransactionId: string,
  ): Promise<VerifiedPurchase>;
}

export const ANDROID_SUBSCRIPTION_VERIFIER = Symbol(
  'ANDROID_SUBSCRIPTION_VERIFIER',
);
export const IOS_SUBSCRIPTION_VERIFIER = Symbol('IOS_SUBSCRIPTION_VERIFIER');
