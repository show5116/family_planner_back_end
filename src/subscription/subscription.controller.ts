import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { VerifyPurchaseDto } from './dto/verify-purchase.dto';
import { SubscriptionStatusDto } from './dto/subscription-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiServiceUnavailable,
  ApiSuccess,
  ApiUnprocessable,
} from '@/common/decorators/api-responses.decorator';

@ApiTags('Subscription')
@ApiCommonAuthResponses()
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: '구독 상태 조회' })
  @ApiSuccess(SubscriptionStatusDto)
  getStatus(@Request() req): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.getStatus(req.user.userId);
  }

  @Post('verify')
  @ApiOperation({
    summary: '인앱 구매 검증 (Google Play / App Store 서버 검증 후 tier 반영)',
  })
  @ApiSuccess(SubscriptionStatusDto)
  @ApiUnprocessable(
    '영수증이 무효하거나 이미 사용됨 (재시도해도 동일하므로 completePurchase 호출 금지)',
  )
  @ApiServiceUnavailable(
    '스토어 검증 서버 일시 장애 (네트워크 오류로 처리 후 재시도 가능)',
  )
  verifyPurchase(
    @Request() req,
    @Body() dto: VerifyPurchaseDto,
  ): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.verifyPurchase(req.user.userId, dto);
  }

  @Post('restore')
  @ApiOperation({ summary: '구독 복원 (만료 시 free로 다운그레이드)' })
  @ApiSuccess(SubscriptionStatusDto)
  restoreSubscription(@Request() req): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.restoreSubscription(req.user.userId);
  }
}
