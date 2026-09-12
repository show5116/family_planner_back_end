import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { androidpublisher_v3, google } from 'googleapis';
import { SubscriptionPlatform, SubscriptionStatus } from '@prisma/client';
import { resolveTierByProductId } from '../subscription-product.map';
import {
  PurchaseVerificationFailedException,
  PurchaseVerificationUnavailableException,
} from './verification-error';
import {
  CancellationContext,
  SubscriptionVerifier,
  VerifiedPurchase,
} from './subscription-verifier.interface';

/** 취소 설문 자유 입력은 사용자가 쓰는 값이라 길이를 제한한다 */
const SURVEY_INPUT_MAX_LENGTH = 500;

/**
 * Google Play 구독 상태 → 내부 상태 매핑
 * 유예 기간(IN_GRACE_PERIOD)은 결제 재시도 중이므로 tier를 유지하고,
 * 계정 보류(ON_HOLD)·일시중지(PAUSED)는 혜택을 회수한다.
 */
const GOOGLE_STATE_TO_STATUS: Record<string, SubscriptionStatus> = {
  SUBSCRIPTION_STATE_ACTIVE: SubscriptionStatus.active,
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: SubscriptionStatus.grace_period,
  SUBSCRIPTION_STATE_CANCELED: SubscriptionStatus.canceled,
  SUBSCRIPTION_STATE_ON_HOLD: SubscriptionStatus.on_hold,
  SUBSCRIPTION_STATE_PAUSED: SubscriptionStatus.paused,
  SUBSCRIPTION_STATE_EXPIRED: SubscriptionStatus.expired,
};

/** 아직 결제가 확정되지 않아 혜택을 판단할 수 없는 상태 */
const GOOGLE_UNRESOLVED_STATES = new Set([
  'SUBSCRIPTION_STATE_PENDING',
  'SUBSCRIPTION_STATE_UNSPECIFIED',
]);

/** 재시도해도 결과가 달라지지 않는 HTTP 상태 (존재하지 않거나 잘못된 토큰) */
const PERMANENT_HTTP_STATUSES = new Set([400, 404, 410]);

@Injectable()
export class AndroidSubscriptionVerifier implements SubscriptionVerifier {
  private readonly logger = new Logger(AndroidSubscriptionVerifier.name);
  private client: androidpublisher_v3.Androidpublisher;

  constructor(private readonly configService: ConfigService) {}

  /**
   * purchaseToken을 Google Play Developer API(purchases.subscriptionsv2.get)로 검증
   */
  async verify(purchaseToken: string): Promise<VerifiedPurchase> {
    const data = await this.fetchPurchase(purchaseToken);
    return this.toVerifiedPurchase(purchaseToken, data);
  }

  /**
   * Google은 갱신되어도 purchaseToken이 유지되므로 검증 방식이 동일하다
   */
  verifyByOriginalTransactionId(
    originalTransactionId: string,
  ): Promise<VerifiedPurchase> {
    return this.verify(originalTransactionId);
  }

  /**
   * Google Play Developer API 호출 (실패 시 일시적/영구 오류를 구분해 던진다)
   */
  private async fetchPurchase(
    purchaseToken: string,
  ): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2> {
    const packageName = this.configService.get<string>(
      'iap.android.packageName',
    );

    if (!packageName) {
      this.logger.error('ANDROID_PACKAGE_NAME이 설정되지 않았습니다');
      throw new PurchaseVerificationUnavailableException();
    }

    try {
      const response = await this.getClient().purchases.subscriptionsv2.get({
        packageName,
        token: purchaseToken,
      });
      return response.data;
    } catch (error) {
      const httpStatus = error?.response?.status ?? error?.code;

      if (
        typeof httpStatus === 'number' &&
        PERMANENT_HTTP_STATUSES.has(httpStatus)
      ) {
        this.logger.warn(
          `Android 구독 검증 실패 (무효한 토큰, status=${httpStatus}): ${error.message}`,
        );
        throw new PurchaseVerificationFailedException();
      }

      // 인증/권한 오류(401·403)와 5xx·네트워크 오류는 서버 측 문제이므로 재시도 대상이다
      this.logger.error(
        `Google Play API 호출 실패 (status=${httpStatus ?? 'unknown'}): ${error.message}`,
      );
      throw new PurchaseVerificationUnavailableException();
    }
  }

  /**
   * Google Play 서비스 계정 인증 클라이언트 (최초 1회 생성 후 재사용)
   */
  private getClient(): androidpublisher_v3.Androidpublisher {
    if (this.client) return this.client;

    const clientEmail = this.configService.get<string>(
      'iap.android.serviceAccountEmail',
    );
    const privateKey = this.configService.get<string>(
      'iap.android.serviceAccountPrivateKey',
    );

    if (!clientEmail || !privateKey) {
      this.logger.error(
        'Google Play 서비스 계정 환경변수가 설정되지 않았습니다',
      );
      throw new PurchaseVerificationUnavailableException();
    }

    this.client = google.androidpublisher({
      version: 'v3',
      auth: new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      }),
    });

    return this.client;
  }

  /**
   * Google Play 응답을 내부 구독 정보로 변환
   */
  private toVerifiedPurchase(
    purchaseToken: string,
    data: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  ): VerifiedPurchase {
    const lineItem = data.lineItems?.[0];

    if (!lineItem?.productId) {
      this.logger.warn('Android 구독 검증 실패: lineItems 없음');
      throw new PurchaseVerificationFailedException();
    }

    const state = data.subscriptionState ?? '';

    if (GOOGLE_UNRESOLVED_STATES.has(state)) {
      this.logger.warn(`Android 구독 결제 미확정 (state=${state})`);
      throw new PurchaseVerificationFailedException(
        'subscription.errors.purchase_pending',
      );
    }

    const status = GOOGLE_STATE_TO_STATUS[state];
    if (!status) {
      // 알 수 없는 상태를 만료로 간주하면 정상 구독을 회수할 수 있으므로 반영하지 않는다
      this.logger.error(`Android 구독 알 수 없는 상태: ${state}`);
      throw new PurchaseVerificationUnavailableException();
    }

    const tier = resolveTierByProductId(lineItem.productId);
    if (!tier) {
      this.logger.error(`매핑되지 않은 상품 ID: ${lineItem.productId}`);
      throw new PurchaseVerificationFailedException(
        'subscription.errors.unknown_product',
      );
    }

    return {
      platform: SubscriptionPlatform.ANDROID,
      productId: lineItem.productId,
      originalTransactionId: purchaseToken,
      latestTransactionId:
        lineItem.latestSuccessfulOrderId ?? data.latestOrderId ?? undefined,
      linkedOriginalTransactionId: data.linkedPurchaseToken ?? undefined,
      tier,
      expiresAt: lineItem.expiryTime ? new Date(lineItem.expiryTime) : null,
      autoRenewing: !!lineItem.autoRenewingPlan?.autoRenewEnabled,
      status,
      cancellation: this.toCancellation(data),
    };
  }

  /**
   * 해지 맥락 추출
   *
   * `canceledStateContext`는 CANCELED·EXPIRED 상태에서만 채워지고, 네 갈래 중 하나만 설정된다.
   * 서비스 계정의 "구독 취소 설문 응답 보기" 권한이 있어야 설문이 함께 내려온다.
   *
   * 교체(업그레이드)를 먼저 걸러낸다 — 만에 하나 다른 갈래와 함께 오더라도
   * 이탈로 세면 안 되는 건 확실하기 때문이다.
   */
  private toCancellation(
    data: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  ): CancellationContext | undefined {
    const context = data.canceledStateContext;
    if (!context) return undefined;

    if (context.replacementCancellation) return { initiator: 'REPLACEMENT' };
    if (context.developerInitiatedCancellation) {
      return { initiator: 'DEVELOPER' };
    }
    if (context.systemInitiatedCancellation) return { initiator: 'SYSTEM' };

    const userCancellation = context.userInitiatedCancellation;
    if (!userCancellation) return undefined;

    const survey = userCancellation.cancelSurveyResult;

    return {
      initiator: 'USER',
      // 설문은 응답이 선택이라 비어 있는 경우가 많다
      surveyReason: survey?.reason ?? undefined,
      // 자유 입력이라 길이를 제한한다 (감사 로그 JSON이 무한정 커지지 않도록)
      surveyUserInput:
        survey?.reasonUserInput?.slice(0, SURVEY_INPUT_MAX_LENGTH) ?? undefined,
      canceledAt: userCancellation.cancelTime
        ? new Date(userCancellation.cancelTime)
        : undefined,
    };
  }
}
