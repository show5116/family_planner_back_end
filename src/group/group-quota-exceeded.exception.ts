import { HttpException, HttpStatus } from '@nestjs/common';
import { GroupQuotaDto } from '@/group/dto/group-quota-response.dto';

/**
 * 402 — 그룹 수 한도 초과
 *
 * 다이어리 용량 402와 같은 이유로 현재 한도를 함께 싣는다. 프론트가
 * "무료 요금제는 그룹 1개까지예요"를 그 자리에서 안내할 수 있어야 하기 때문이다.
 * payload는 I18nExceptionFilter가 그대로 실어 보낸다.
 */
export class GroupQuotaExceededException extends HttpException {
  constructor(messageKey: string, groupQuota: GroupQuotaDto) {
    super({ message: messageKey, groupQuota }, HttpStatus.PAYMENT_REQUIRED);
  }
}
