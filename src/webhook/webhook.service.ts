import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Webhook 서비스
 * Sentry 이벤트를 Discord로 전송
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly discordWebhookUrl: string;
  private readonly sentrySecret: string;

  constructor(private configService: ConfigService) {
    this.discordWebhookUrl = this.configService.get<string>(
      'DISCORD_WEBHOOK_URL',
    );
    this.sentrySecret = this.configService.get<string>('SENTRY_WEBHOOK_SECRET');
  }

  /**
   * Sentry webhook 서명 검증
   */
  private verifySentrySignature(
    rawBody: Buffer | undefined,
    signature: string,
  ): boolean {
    if (!this.sentrySecret) {
      this.logger.warn('SENTRY_WEBHOOK_SECRET가 설정되지 않았습니다');
      return true; // 시크릿이 없으면 검증 스킵
    }

    if (!signature) {
      this.logger.warn('Sentry webhook 서명이 없습니다');
      return false;
    }

    if (!rawBody) {
      this.logger.warn('Raw body가 없습니다');
      return false;
    }

    // Raw body를 사용하여 HMAC 검증
    const hmac = crypto.createHmac('sha256', this.sentrySecret);
    const digest = hmac.update(rawBody).digest('hex');
    const isValid = signature === digest;

    if (!isValid) {
      this.logger.warn(
        `서명 불일치 - Expected: ${digest}, Received: ${signature}`,
      );
    }

    return isValid;
  }

  /**
   * Discord Embed 생성
   */
  private createDiscordEmbed(sentryEvent: any) {
    const { action, data } = sentryEvent;

    // 이벤트 타입별 색상
    const colorMap = {
      'issue.created': 0xff4949, // 빨강
      error: 0xff4949,
      'issue.resolved': 0x43a047, // 초록
      'issue.assigned': 0x3b82f6, // 파랑
      'issue.ignored': 0x9ca3af, // 회색
    };

    const color = colorMap[action] || 0xffa500; // 기본 주황

    const embed: any = {
      title: data?.issue?.title || 'Sentry 알림',
      url: data?.issue?.web_url,
      color,
      timestamp: new Date().toISOString(),
      fields: [],
    };

    // 이벤트 타입
    embed.fields.push({
      name: '이벤트 타입',
      value: action || 'unknown',
      inline: true,
    });

    // 프로젝트 정보
    if (data?.issue?.project) {
      embed.fields.push({
        name: '프로젝트',
        value: data.issue.project.name || data.issue.project.slug,
        inline: true,
      });
    }

    // 환경
    if (data?.issue?.metadata?.value) {
      embed.fields.push({
        name: '환경',
        value: data.issue.metadata.value,
        inline: true,
      });
    }

    // 에러 메시지
    if (data?.issue?.culprit) {
      embed.fields.push({
        name: '위치',
        value: `\`\`\`${data.issue.culprit}\`\`\``,
        inline: false,
      });
    }

    // 발생 횟수
    if (data?.issue?.count) {
      embed.fields.push({
        name: '발생 횟수',
        value: data.issue.count.toString(),
        inline: true,
      });
    }

    // 영향받은 사용자 수
    if (data?.issue?.userCount) {
      embed.fields.push({
        name: '영향받은 사용자',
        value: data.issue.userCount.toString(),
        inline: true,
      });
    }

    return embed;
  }

  /**
   * Discord로 메시지 전송
   */
  private async sendToDiscord(embed: any) {
    if (!this.discordWebhookUrl) {
      this.logger.warn('DISCORD_WEBHOOK_URL이 설정되지 않았습니다');
      return;
    }

    try {
      const response = await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Discord 전송 실패: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.log('Discord 메시지 전송 성공');
      }
    } catch (error) {
      this.logger.error('Discord 전송 중 에러 발생', error);
    }
  }

  /**
   * Sentry webhook 처리
   */
  async handleSentryWebhook(
    body: any,
    rawBody: Buffer | undefined,
    signature: string,
  ) {
    this.logger.debug('Sentry webhook body:', JSON.stringify(body, null, 2));

    // 서명 검증
    if (!this.verifySentrySignature(rawBody, signature)) {
      this.logger.warn('잘못된 Sentry webhook 서명');
      return { message: '서명 검증 실패' };
    }

    // Discord Embed 생성
    const embed = this.createDiscordEmbed(body);

    // Discord로 전송
    await this.sendToDiscord(embed);

    return { message: 'Webhook 처리 완료' };
  }
}
