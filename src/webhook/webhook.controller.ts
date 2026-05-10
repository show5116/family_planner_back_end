import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { Public } from '@/auth/decorators/public.decorator';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';
import { MessageResponseDto } from '@/task/dto/common-response.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Post('sentry')
  @ApiOperation({ summary: 'Sentry Webhook 수신' })
  @ApiSuccess(MessageResponseDto, 'Webhook 처리 성공')
  handleSentryWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Headers('sentry-hook-signature') signature: string,
  ) {
    this.logger.log('Sentry webhook received');
    const rawBody = req.rawBody;
    return this.webhookService.handleSentryWebhook(body, rawBody, signature);
  }

  /**
   * TODO: 스토어 등록 후 구현 필요
   * App Store Connect → App Information → Server Notifications URL에 등록
   * 환경변수 필요: APPLE_WEBHOOK_SECRET (App Store Connect에서 발급)
   */
  @Public()
  @Post('apple')
  @ApiOperation({
    summary: 'Apple App Store 구독 Webhook (미구현)',
    description:
      '스토어 등록 후 구현 예정. Apple App Store Server Notifications V2 수신.',
  })
  @ApiSuccess(MessageResponseDto, 'Webhook 수신 성공')
  handleAppleWebhook(
    @Body() body: any,
    @Headers('x-apple-signature') signature: string,
  ) {
    return this.webhookService.handleAppleWebhook(body, signature);
  }

  /**
   * TODO: 스토어 등록 후 구현 필요
   * Google Play Console → Monetization → Real-time developer notifications에 등록
   * Google Cloud Pub/Sub 메시지 형식으로 수신
   */
  @Public()
  @Post('google')
  @ApiOperation({
    summary: 'Google Play 구독 Webhook (미구현)',
    description:
      '스토어 등록 후 구현 예정. Google Play Real-time Developer Notifications 수신.',
  })
  @ApiSuccess(MessageResponseDto, 'Webhook 수신 성공')
  handleGoogleWebhook(@Body() body: any) {
    return this.webhookService.handleGoogleWebhook(body);
  }
}
