import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  Query,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhookService } from './webhook.service';
import { Public } from '@/auth/decorators/public.decorator';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';
import { MessageResponseDto } from '@/task/dto/common-response.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

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
   * App Store Connect → App Information → Server Notifications URL에 등록
   */
  @Public()
  @Post('apple')
  @ApiOperation({
    summary: 'Apple App Store 구독 Webhook',
    description: 'Apple App Store Server Notifications V2 수신.',
  })
  @ApiSuccess(MessageResponseDto, 'Webhook 수신 성공')
  handleAppleWebhook(@Body() body: { signedPayload?: string }) {
    return this.webhookService.handleAppleWebhook(body);
  }

  /**
   * Google Play Console → Monetization → Real-time developer notifications에 등록
   * Google Cloud Pub/Sub 메시지 형식으로 수신
   * RTDN 페이로드 자체는 서명되지 않으므로, Pub/Sub 구독 URL에 붙인 공유 시크릿(?token=)으로
   * 이 서버가 등록한 Pub/Sub 구독에서 온 요청인지만 우선 걸러낸다.
   * (실제 tier 반영 여부는 이후 purchaseToken을 Google Play API로 재검증해 결정한다)
   */
  @Public()
  @Post('google')
  @ApiOperation({
    summary: 'Google Play 구독 Webhook',
    description: 'Google Play Real-time Developer Notifications 수신.',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'Pub/Sub 구독 URL에 등록한 공유 시크릿 (GOOGLE_WEBHOOK_SECRET 미설정 시 검증 생략)',
  })
  @ApiSuccess(MessageResponseDto, 'Webhook 수신 성공')
  handleGoogleWebhook(
    @Body() body: { message?: { data?: string } },
    @Query('token') token?: string,
  ) {
    this.verifyGoogleWebhookToken(token);
    return this.webhookService.handleGoogleWebhook(body);
  }

  /**
   * Pub/Sub 구독 URL의 공유 시크릿 검증 (타이밍 공격 방지를 위해 timingSafeEqual 사용)
   */
  private verifyGoogleWebhookToken(token: string | undefined): void {
    const expected = this.configService.get<string>('GOOGLE_WEBHOOK_SECRET');

    if (!expected) {
      this.logger.warn(
        'GOOGLE_WEBHOOK_SECRET가 설정되지 않았습니다 (토큰 검증 생략)',
      );
      return;
    }

    const provided = Buffer.from(token ?? '');
    const secret = Buffer.from(expected);
    const isValid =
      provided.length === secret.length &&
      crypto.timingSafeEqual(provided, secret);

    if (!isValid) {
      this.logger.warn('Google webhook 토큰 불일치 — 요청 거부');
      throw new UnauthorizedException();
    }
  }
}
