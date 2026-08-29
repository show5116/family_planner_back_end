import { ConfigService } from '@nestjs/config';
import {
  AutoRenewStatus,
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  Status,
} from '@apple/app-store-server-library';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { IosSubscriptionVerifier } from './ios-subscription.verifier';
import { PurchaseVerificationFailedException } from './verification-error';

const DAY = 24 * 60 * 60 * 1000;

describe('IosSubscriptionVerifier.toVerifiedPurchase', () => {
  let verifier: IosSubscriptionVerifier;

  beforeEach(() => {
    verifier = new IosSubscriptionVerifier(new ConfigService());
  });

  const transaction = (
    overrides: Partial<JWSTransactionDecodedPayload> = {},
  ): JWSTransactionDecodedPayload =>
    ({
      originalTransactionId: 'original-1',
      transactionId: 'latest-1',
      productId: 'family_planner_ad_free_monthly',
      expiresDate: Date.now() + 30 * DAY,
      ...overrides,
    }) as JWSTransactionDecodedPayload;

  const renewalInfo = (
    overrides: Partial<JWSRenewalInfoDecodedPayload> = {},
  ): JWSRenewalInfoDecodedPayload =>
    ({
      autoRenewStatus: AutoRenewStatus.ON,
      ...overrides,
    }) as JWSRenewalInfoDecodedPayload;

  it('정상 구독은 active로 매핑된다', () => {
    const result = verifier.toVerifiedPurchase(transaction(), renewalInfo());

    expect(result.status).toBe(SubscriptionStatus.active);
    expect(result.tier).toBe(SubscriptionTier.ad_free);
    expect(result.autoRenewing).toBe(true);
  });

  it('자동 갱신을 끈 구독은 canceled로 매핑되고 만료일이 유지된다', () => {
    const expiresDate = Date.now() + 10 * DAY;

    const result = verifier.toVerifiedPurchase(
      transaction({ expiresDate }),
      renewalInfo({ autoRenewStatus: AutoRenewStatus.OFF }),
    );

    expect(result.status).toBe(SubscriptionStatus.canceled);
    expect(result.expiresAt).toEqual(new Date(expiresDate));
  });

  it('유예 기간에는 grace_period로 매핑되고 만료일이 유예 종료 시점까지 연장된다', () => {
    const gracePeriodExpiresDate = Date.now() + 3 * DAY;

    const result = verifier.toVerifiedPurchase(
      transaction({ expiresDate: Date.now() - DAY }),
      renewalInfo({ gracePeriodExpiresDate, isInBillingRetryPeriod: true }),
    );

    expect(result.status).toBe(SubscriptionStatus.grace_period);
    expect(result.expiresAt).toEqual(new Date(gracePeriodExpiresDate));
  });

  it('유예가 끝난 결제 재시도(계정 보류)는 on_hold로 매핑된다', () => {
    const result = verifier.toVerifiedPurchase(
      transaction({ expiresDate: Date.now() - DAY }),
      renewalInfo({
        gracePeriodExpiresDate: Date.now() - 2 * 60 * 60 * 1000,
        isInBillingRetryPeriod: true,
      }),
    );

    expect(result.status).toBe(SubscriptionStatus.on_hold);
  });

  it('재시도 없이 만료된 구독은 expired로 매핑된다', () => {
    const result = verifier.toVerifiedPurchase(
      transaction({ expiresDate: Date.now() - DAY }),
      renewalInfo({ isInBillingRetryPeriod: false }),
    );

    expect(result.status).toBe(SubscriptionStatus.expired);
  });

  it('환불된 구독은 만료일이 남아 있어도 revoked로 매핑된다', () => {
    const result = verifier.toVerifiedPurchase(
      transaction({ revocationDate: Date.now() }),
      renewalInfo(),
    );

    expect(result.status).toBe(SubscriptionStatus.revoked);
  });

  it('App Store Server API의 status를 우선 사용한다', () => {
    const result = verifier.toVerifiedPurchase(
      transaction(),
      renewalInfo(),
      Status.BILLING_GRACE_PERIOD,
    );

    expect(result.status).toBe(SubscriptionStatus.grace_period);
  });

  it('매핑되지 않은 상품 ID는 검증 실패(422)로 처리한다', () => {
    expect(() =>
      verifier.toVerifiedPurchase(
        transaction({ productId: 'unknown_product' }),
      ),
    ).toThrow(PurchaseVerificationFailedException);
  });
});
