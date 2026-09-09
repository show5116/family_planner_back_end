import { HttpException, HttpStatus } from '@nestjs/common';
import { MediaQuotaDto } from './dto/diary-media-response.dto';

/**
 * 402 — 용량 한도 초과
 *
 * 프론트가 "이번 달 남은 용량 N MB"를 그 자리에서 안내할 수 있도록
 * 남은 용량(quota)을 응답에 함께 싣는다.
 */
export class QuotaExceededException extends HttpException {
  constructor(messageKey: string, quota: MediaQuotaDto) {
    super({ message: messageKey, quota }, HttpStatus.PAYMENT_REQUIRED);
  }
}
