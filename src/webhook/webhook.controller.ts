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

/**
 * Webhook 컨트롤러
 * Sentry 알림을 Discord로 전송하는 Webhook API
 */
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
}
