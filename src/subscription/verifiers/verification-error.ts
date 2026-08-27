import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * 영수증이 무효하거나 이미 사용된 경우 (재시도해도 결과가 같음) → 422
 * 프론트는 422를 받으면 completePurchase를 호출하지 않고 재시도 가능한 상태로 남긴다.
 */
export class PurchaseVerificationFailedException extends UnprocessableEntityException {
  constructor(messageKey = 'subscription.errors.verification_failed') {
    super(messageKey);
  }
}

/**
 * 스토어 API 장애·네트워크 오류·서버 설정 누락 등 일시적 실패 → 503
 * 422로 내려보내면 정상 구매가 재시도 없이 실패하므로 반드시 5xx로 구분한다.
 */
export class PurchaseVerificationUnavailableException extends ServiceUnavailableException {
  constructor(messageKey = 'subscription.errors.verification_unavailable') {
    super(messageKey);
  }
}
