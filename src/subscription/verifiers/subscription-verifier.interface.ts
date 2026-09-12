import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';

/**
 * 해지를 누가 일으켰는지
 *
 * `REPLACEMENT`(업그레이드·플랜 변경으로 교체)와 `SYSTEM`(결제 실패로 시스템이 종료)을
 * 사용자 해지와 섞으면 이탈 통계가 망가진다. 자발적 이탈은 `USER`뿐이다.
 */
export type CancellationInitiator =
  | 'USER'
  | 'SYSTEM'
  | 'DEVELOPER'
  | 'REPLACEMENT';

/**
 * 해지 맥락 (Google만 제공)
 *
 * Apple은 취소 설문이 없고 `expirationIntent`가 가장 가까운 신호인데 아직 읽지 않는다.
 * 그래서 현재 이 값은 Android 구독에만 채워진다.
 */
export interface CancellationContext {
  initiator: CancellationInitiator;
  /** Google 취소 설문에서 사용자가 고른 사유 (설문은 선택이라 비어 있을 수 있다) */
  surveyReason?: string;
  /** `CANCEL_SURVEY_REASON_OTHERS`일 때만 들어오는 자유 입력 */
  surveyUserInput?: string;
  canceledAt?: Date;
}

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
  /** 해지 상태일 때만 존재. 자발적 이탈 여부와 사유를 남기는 데 쓴다 */
  cancellation?: CancellationContext;
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
