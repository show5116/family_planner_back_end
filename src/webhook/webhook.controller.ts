import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  Get,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { Public } from '@/auth/decorators/public.decorator';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import * as Sentry from '@sentry/node';

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

  @Public()
  @Get('test-error')
  @ApiOperation({ summary: '테스트 에러 발생 (Sentry 테스트용)' })
  @ApiSuccess(MessageResponseDto, '에러 발생')
  triggerTestError() {
    this.logger.warn('테스트 에러를 발생시킵니다...');

    // 다양한 타입의 에러 시뮬레이션
    const errorTypes = [
      () => {
        throw new Error('테스트: 일반 에러 발생');
      },
      () => {
        throw new TypeError('테스트: 타입 에러 발생');
      },
      () => {
        // undefined 접근 에러
        const obj: any = null;
        return obj.someProperty.nestedProperty;
      },
      () => {
        // 배열 인덱스 에러
        const arr = [1, 2, 3];
        return arr[999].toString();
      },
    ];

    // 랜덤하게 에러 발생
    const randomError =
      errorTypes[Math.floor(Math.random() * errorTypes.length)];

    try {
      randomError();
    } catch (error) {
      // Sentry에 에러 전송
      Sentry.captureException(error, {
        tags: {
          test: 'true',
          source: 'webhook-test',
        },
        extra: {
          timestamp: new Date().toISOString(),
          message: '테스트 에러입니다',
        },
      });
      throw error;
    }
  }
}
