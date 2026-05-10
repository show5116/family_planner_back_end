import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatusDto } from './dto/subscription-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';

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
  @ApiOperation({ summary: '구독 업데이트 (인앱 결제 후 tier/토큰 저장)' })
  @ApiSuccess(SubscriptionStatusDto)
  updateSubscription(
    @Request() req,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.updateSubscription(req.user.userId, dto);
  }

  @Post('restore')
  @ApiOperation({ summary: '구독 복원 (만료 시 free로 다운그레이드)' })
  @ApiSuccess(SubscriptionStatusDto)
  restoreSubscription(@Request() req): Promise<SubscriptionStatusDto> {
    return this.subscriptionService.restoreSubscription(req.user.userId);
  }
}
