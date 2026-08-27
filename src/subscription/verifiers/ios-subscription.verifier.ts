import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  APIError,
  APIException,
  AppStoreServerAPIClient,
  AutoRenewStatus,
  Environment,
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
  SignedDataVerifier,
  Status,
  VerificationException,
  VerificationStatus,
} from '@apple/app-store-server-library';
import { SubscriptionPlatform, SubscriptionStatus } from '@prisma/client';
import { resolveTierByProductId } from '../subscription-product.map';
import {
  PurchaseVerificationFailedException,
  PurchaseVerificationUnavailableException,
} from './verification-error';
import {
  SubscriptionVerifier,
  VerifiedPurchase,
} from './subscription-verifier.interface';

const APPLE_ROOT_CA_DIR = path.join(
  process.cwd(),
  'assets',
  'apple-root-certs',
);

/** 재시도해도 결과가 달라지지 않는 서명 검증 실패 */
const PERMANENT_VERIFICATION_STATUSES = new Set<VerificationStatus>([
  VerificationStatus.VERIFICATION_FAILURE,
  VerificationStatus.INVALID_APP_IDENTIFIER,
  VerificationStatus.INVALID_CERTIFICATE,
  VerificationStatus.INVALID_CHAIN_LENGTH,
  VerificationStatus.INVALID_ENVIRONMENT,
]);

/** 해당 환경에 거래가 존재하지 않음 (다른 환경을 조회해야 함) */
const TRANSACTION_NOT_FOUND_ERRORS = new Set<number>([
  APIError.ORIGINAL_TRANSACTION_ID_NOT_FOUND,
  APIError.TRANSACTION_ID_NOT_FOUND,
]);

/**
 * App Store Server API 구독 상태 → 내부 상태 매핑
 * BILLING_GRACE_PERIOD는 유예 기간이므로 tier를 유지하고,
 * BILLING_RETRY는 유예가 끝난 뒤의 재시도(혜택 없음)이므로 회수한다.
 */
const APPLE_STATUS_MAP: Record<number, SubscriptionStatus> = {
  [Status.ACTIVE]: SubscriptionStatus.active,
  [Status.EXPIRED]: SubscriptionStatus.expired,
  [Status.BILLING_RETRY]: SubscriptionStatus.on_hold,
  [Status.BILLING_GRACE_PERIOD]: SubscriptionStatus.grace_period,
  [Status.REVOKED]: SubscriptionStatus.revoked,
};

@Injectable()
export class IosSubscriptionVerifier implements SubscriptionVerifier {
  private readonly logger = new Logger(IosSubscriptionVerifier.name);
  private readonly verifiers = new Map<Environment, SignedDataVerifier>();
  private readonly apiClients = new Map<Environment, AppStoreServerAPIClient>();
  private rootCertificates: Buffer[];

  constructor(private readonly configService: ConfigService) {}

  /**
   * 클라이언트가 전달한 signedTransaction(JWS) 검증
   */
  async verify(signedTransaction: string): Promise<VerifiedPurchase> {
    const { result } = await this.runInBothEnvironments((verifier) =>
      verifier.verifyAndDecodeTransaction(signedTransaction),
    );
    return this.toVerifiedPurchase(result);
  }

  /**
   * originalTransactionId로 App Store Server API에서 최신 구독 상태 조회 (복원·재검증용)
   */
  async verifyByOriginalTransactionId(
    originalTransactionId: string,
  ): Promise<VerifiedPurchase> {
    const errors: unknown[] = [];

    for (const environment of this.getEnvironmentOrder()) {
      try {
        const client = this.getApiClient(environment);
        const response = await client.getAllSubscriptionStatuses(
          originalTransactionId,
        );

        const item =
          response.data
            ?.flatMap((group) => group.lastTransactions ?? [])
            .find(
              (transaction) =>
                transaction.originalTransactionId === originalTransactionId,
            ) ?? response.data?.[0]?.lastTransactions?.[0];

        if (!item?.signedTransactionInfo) {
          errors.push(new Error('lastTransactions 없음'));
          continue;
        }

        const verifier = this.getVerifier(environment);
        const transaction = await verifier.verifyAndDecodeTransaction(
          item.signedTransactionInfo,
        );
        const renewalInfo = item.signedRenewalInfo
          ? await verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo)
          : undefined;

        return this.toVerifiedPurchase(transaction, renewalInfo, item.status);
      } catch (error) {
        errors.push(error);

        // 거래를 찾지 못한 경우에만 다른 환경(Sandbox↔Production)을 마저 조회한다
        if (!this.isTransactionNotFound(error)) break;
      }
    }

    throw this.toVerificationError(errors);
  }

  /**
   * App Store Server Notifications V2의 signedPayload를 검증·디코딩한다.
   * 알림과 거래 정보를 같은 환경의 검증기로 함께 처리한다.
   */
  async decodeNotification(signedPayload: string): Promise<{
    notification: ResponseBodyV2DecodedPayload;
    verified: VerifiedPurchase | null;
  }> {
    const { result: notification, environment } =
      await this.runInBothEnvironments((verifier) =>
        verifier.verifyAndDecodeNotification(signedPayload),
      );

    const signedTransactionInfo = notification.data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      return { notification, verified: null };
    }

    const verifier = this.getVerifier(environment);
    const transaction = await verifier.verifyAndDecodeTransaction(
      signedTransactionInfo,
    );
    const renewalInfo = notification.data?.signedRenewalInfo
      ? await verifier.verifyAndDecodeRenewalInfo(
          notification.data.signedRenewalInfo,
        )
      : undefined;

    return {
      notification,
      verified: this.toVerifiedPurchase(transaction, renewalInfo),
    };
  }

  /**
   * 검증된 거래·갱신 정보를 내부 구독 정보로 변환
   */
  toVerifiedPurchase(
    transaction: JWSTransactionDecodedPayload,
    renewalInfo?: JWSRenewalInfoDecodedPayload,
    appleStatus?: Status | number,
  ): VerifiedPurchase {
    if (!transaction.originalTransactionId || !transaction.productId) {
      this.logger.warn('iOS 구독 검증 실패: 거래 정보 누락');
      throw new PurchaseVerificationFailedException();
    }

    const tier = resolveTierByProductId(transaction.productId);
    if (!tier) {
      this.logger.error(`매핑되지 않은 상품 ID: ${transaction.productId}`);
      throw new PurchaseVerificationFailedException(
        'subscription.errors.unknown_product',
      );
    }

    const expiresAt = transaction.expiresDate
      ? new Date(transaction.expiresDate)
      : null;
    const gracePeriodExpiresAt = renewalInfo?.gracePeriodExpiresDate
      ? new Date(renewalInfo.gracePeriodExpiresDate)
      : null;

    // 유예 기간 동안에는 만료일을 유예 종료 시점까지 연장해 tier를 유지한다
    const effectiveExpiresAt =
      gracePeriodExpiresAt && (!expiresAt || gracePeriodExpiresAt > expiresAt)
        ? gracePeriodExpiresAt
        : expiresAt;

    return {
      platform: SubscriptionPlatform.IOS,
      productId: transaction.productId,
      originalTransactionId: transaction.originalTransactionId,
      latestTransactionId: transaction.transactionId,
      tier,
      expiresAt: effectiveExpiresAt,
      autoRenewing: renewalInfo
        ? this.getAutoRenewStatus(renewalInfo) === AutoRenewStatus.ON
        : !transaction.revocationDate,
      status: this.resolveStatus(
        transaction,
        renewalInfo,
        effectiveExpiresAt,
        appleStatus,
      ),
    };
  }

  /**
   * 환불·유예 기간·구독 취소를 구분해 내부 상태를 결정
   */
  private resolveStatus(
    transaction: JWSTransactionDecodedPayload,
    renewalInfo: JWSRenewalInfoDecodedPayload | undefined,
    effectiveExpiresAt: Date | null,
    appleStatus?: Status | number,
  ): SubscriptionStatus {
    if (transaction.revocationDate) return SubscriptionStatus.revoked;

    const isAutoRenewOff =
      this.getAutoRenewStatus(renewalInfo) === AutoRenewStatus.OFF;

    const mapped =
      appleStatus === undefined ? undefined : APPLE_STATUS_MAP[appleStatus];
    if (mapped) {
      // 자동 갱신을 끈 구독은 만료일까지 tier를 유지한다
      return mapped === SubscriptionStatus.active && isAutoRenewOff
        ? SubscriptionStatus.canceled
        : mapped;
    }

    const now = Date.now();
    const gracePeriodExpiresDate = renewalInfo?.gracePeriodExpiresDate;

    // 결제에 실패했지만 아직 유예 기간이 남은 상태 (tier 유지)
    if (
      gracePeriodExpiresDate &&
      gracePeriodExpiresDate > now &&
      transaction.expiresDate &&
      transaction.expiresDate <= now
    ) {
      return SubscriptionStatus.grace_period;
    }

    if (effectiveExpiresAt && effectiveExpiresAt.getTime() <= now) {
      // 유예가 끝난 뒤에도 결제를 재시도 중이면 계정 보류로 본다
      return renewalInfo?.isInBillingRetryPeriod
        ? SubscriptionStatus.on_hold
        : SubscriptionStatus.expired;
    }

    return isAutoRenewOff
      ? SubscriptionStatus.canceled
      : SubscriptionStatus.active;
  }

  private getAutoRenewStatus(
    renewalInfo?: JWSRenewalInfoDecodedPayload,
  ): AutoRenewStatus | undefined {
    return renewalInfo?.autoRenewStatus as AutoRenewStatus | undefined;
  }

  /**
   * Sandbox와 Production은 서명 주체가 다르므로 두 환경 모두 시도한다
   */
  private async runInBothEnvironments<T>(
    decode: (verifier: SignedDataVerifier) => Promise<T>,
  ): Promise<{ result: T; environment: Environment }> {
    const errors: unknown[] = [];

    for (const environment of this.getEnvironmentOrder()) {
      try {
        const result = await decode(this.getVerifier(environment));
        return { result, environment };
      } catch (error) {
        errors.push(error);
      }
    }

    throw this.toVerificationError(errors);
  }

  /**
   * 수집된 오류 중 하나라도 일시적이면 503, 모두 영구 실패면 422로 변환
   */
  private toVerificationError(errors: unknown[]): Error {
    const hasTransient = errors.some(
      (error) =>
        !(error instanceof VerificationException) ||
        !PERMANENT_VERIFICATION_STATUSES.has(error.status),
    );

    const detail = errors
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join(' / ');

    if (hasTransient) {
      this.logger.error(`iOS 구독 검증 일시 실패: ${detail}`);
      return new PurchaseVerificationUnavailableException();
    }

    this.logger.warn(`iOS 구독 검증 실패 (무효한 영수증): ${detail}`);
    return new PurchaseVerificationFailedException();
  }

  private isTransactionNotFound(error: unknown): boolean {
    return (
      error instanceof APIException &&
      typeof error.apiError === 'number' &&
      TRANSACTION_NOT_FOUND_ERRORS.has(error.apiError)
    );
  }

  /**
   * 우선 조회할 환경을 앞에 둔 조회 순서 (테스트 환경에서는 Sandbox 우선)
   */
  private getEnvironmentOrder(): Environment[] {
    const preferSandbox =
      this.configService.get<string>('iap.ios.environment') === 'Sandbox';

    return preferSandbox
      ? [Environment.SANDBOX, Environment.PRODUCTION]
      : [Environment.PRODUCTION, Environment.SANDBOX];
  }

  private getVerifier(environment: Environment): SignedDataVerifier {
    const cached = this.verifiers.get(environment);
    if (cached) return cached;

    const bundleId = this.configService.get<string>('iap.ios.bundleId');
    const appAppleId = this.configService.get<number>('iap.ios.appAppleId');

    if (!bundleId) {
      throw new Error('IOS_BUNDLE_ID가 설정되지 않았습니다');
    }
    // 라이브러리가 Production 환경에서 appAppleId를 필수로 요구한다
    if (environment === Environment.PRODUCTION && !appAppleId) {
      throw new Error(
        'APPLE_APP_APPLE_ID가 설정되지 않았습니다 (Production 검증에 필요)',
      );
    }

    const verifier = new SignedDataVerifier(
      this.getRootCertificates(),
      true,
      environment,
      bundleId,
      environment === Environment.PRODUCTION ? appAppleId : undefined,
    );

    this.verifiers.set(environment, verifier);
    return verifier;
  }

  private getApiClient(environment: Environment): AppStoreServerAPIClient {
    const cached = this.apiClients.get(environment);
    if (cached) return cached;

    const bundleId = this.configService.get<string>('iap.ios.bundleId');
    const keyId = this.configService.get<string>('iap.ios.keyId');
    const issuerId = this.configService.get<string>('iap.ios.issuerId');
    const privateKey = this.configService.get<string>('iap.ios.privateKey');

    if (!bundleId || !keyId || !issuerId || !privateKey) {
      throw new Error('App Store Server API 환경변수가 설정되지 않았습니다');
    }

    const client = new AppStoreServerAPIClient(
      privateKey,
      keyId,
      issuerId,
      bundleId,
      environment,
    );

    this.apiClients.set(environment, client);
    return client;
  }

  private getRootCertificates(): Buffer[] {
    if (this.rootCertificates) return this.rootCertificates;

    const files = fs.existsSync(APPLE_ROOT_CA_DIR)
      ? fs.readdirSync(APPLE_ROOT_CA_DIR).filter((f) => f.endsWith('.cer'))
      : [];

    if (files.length === 0) {
      throw new Error(`Apple 루트 인증서가 없습니다 (${APPLE_ROOT_CA_DIR})`);
    }

    this.rootCertificates = files.map((f) =>
      fs.readFileSync(path.join(APPLE_ROOT_CA_DIR, f)),
    );
    return this.rootCertificates;
  }
}
