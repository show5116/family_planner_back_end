import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { NotificationTypeV2 } from '@apple/app-store-server-library';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionService } from '@/subscription/subscription.service';
import { IosSubscriptionVerifier } from '@/subscription/verifiers/ios-subscription.verifier';
import { AndroidSubscriptionVerifier } from '@/subscription/verifiers/android-subscription.verifier';
import { PurchaseVerificationFailedException } from '@/subscription/verifiers/verification-error';

/** Google Play RTDN 알림 유형 (로그·이벤트 기록용) */
const GOOGLE_NOTIFICATION_TYPES: Record<number, string> = {
  1: 'RECOVERED',
  2: 'RENEWED',
  3: 'CANCELED',
  4: 'PURCHASED',
  5: 'ON_HOLD',
  6: 'IN_GRACE_PERIOD',
  7: 'RESTARTED',
  8: 'PRICE_CHANGE_CONFIRMED',
  9: 'DEFERRED',
  10: 'PAUSED',
  11: 'PAUSE_SCHEDULE_CHANGED',
  12: 'REVOKED',
  13: 'EXPIRED',
  20: 'PENDING_PURCHASE_CANCELED',
};

/**
 * Webhook 서비스
 * Sentry 이벤트를 Discord로 전송
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly discordWebhookUrl: string;
  private readonly discordQnaWebhookUrl: string;
  private readonly sentrySecret: string;

  constructor(
    private configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
    private readonly iosVerifier: IosSubscriptionVerifier,
    private readonly androidVerifier: AndroidSubscriptionVerifier,
  ) {
    this.discordWebhookUrl = this.configService.get<string>(
      'DISCORD_WEBHOOK_URL',
    );
    this.discordQnaWebhookUrl = this.configService.get<string>(
      'DISCORD_QNA_WEBHOOK_URL',
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
   * - triggered: Alert Rule 발동 (data.event 구조)
   * - issue.*: 이슈 생성/해결/할당 등 (data.issue 구조)
   */
  private createDiscordEmbed(sentryEvent: any) {
    const { action, data } = sentryEvent;

    if (action === 'triggered') {
      return this.createTriggeredEmbed(data);
    }

    return this.createIssueEmbed(action, data);
  }

  private createTriggeredEmbed(data: any) {
    const event = data?.event ?? {};
    const rule = data?.triggered_rule ?? '';

    const exceptionValues: any[] = event.exception?.values ?? [];
    const topException = exceptionValues[exceptionValues.length - 1];
    const errorType = topException?.type ?? event.type ?? '';
    const errorMessage = topException?.value ?? '';

    const rawTitle = errorType
      ? `🚨 [${errorType}] ${errorMessage}`
      : '🚨 Sentry Alert';
    const title =
      rawTitle.length > 256 ? rawTitle.substring(0, 253) + '...' : rawTitle;

    const embed: any = {
      title,
      url: event.web_url ?? event.url,
      color: 0xff4949,
      timestamp: new Date().toISOString(),
      fields: [],
    };

    if (rule) {
      embed.fields.push({ name: '알림 규칙', value: rule, inline: false });
    }

    if (event.transaction) {
      embed.fields.push({
        name: '트랜잭션',
        value: `\`${event.transaction}\``,
        inline: false,
      });
    }

    if (event.culprit) {
      embed.fields.push({
        name: '발생 위치',
        value: `\`${event.culprit}\``,
        inline: false,
      });
    }

    // 스택트레이스 최상단 프레임
    const frames: any[] = topException?.stacktrace?.frames ?? [];
    const topFrame = frames[frames.length - 1];
    if (topFrame) {
      const location = [
        topFrame.filename,
        topFrame.lineno ? `:${topFrame.lineno}` : '',
        topFrame.function ? ` (${topFrame.function})` : '',
      ].join('');
      embed.fields.push({
        name: '스택트레이스 (최상단)',
        value: `\`${location}\``,
        inline: false,
      });
    }

    if (event.tags?.length) {
      const tagText = event.tags
        .slice(0, 5)
        .map(([k, v]: [string, string]) => `${k}: ${v}`)
        .join('\n');
      embed.fields.push({ name: '태그', value: tagText, inline: false });
    }

    if (event.platform) {
      embed.fields.push({
        name: '플랫폼',
        value: event.platform,
        inline: true,
      });
    }

    if (event.environment) {
      embed.fields.push({
        name: '환경',
        value: event.environment,
        inline: true,
      });
    }

    return embed;
  }

  private createIssueEmbed(action: string, data: any) {
    const colorMap: Record<string, number> = {
      'issue.created': 0xff4949,
      error: 0xff4949,
      'issue.resolved': 0x43a047,
      'issue.assigned': 0x3b82f6,
      'issue.ignored': 0x9ca3af,
    };
    const color = colorMap[action] ?? 0xffa500;

    const issue = data?.issue;
    const metadata = issue?.metadata;

    const errorType = metadata?.type || issue?.type || '';
    const errorMessage = metadata?.value || '';
    const rawTitle =
      errorType && errorMessage
        ? `[${errorType}] ${errorMessage}`
        : issue?.title || 'Sentry 알림';
    const title =
      rawTitle.length > 256 ? rawTitle.substring(0, 253) + '...' : rawTitle;

    const embed: any = {
      title,
      url: issue?.web_url,
      color,
      timestamp: new Date().toISOString(),
      fields: [],
    };

    embed.fields.push({
      name: '이벤트 타입',
      value: action || 'unknown',
      inline: true,
    });

    if (issue?.project) {
      embed.fields.push({
        name: '프로젝트',
        value: issue.project.name || issue.project.slug,
        inline: true,
      });
    }

    if (issue?.culprit) {
      embed.fields.push({
        name: '위치',
        value: `\`${issue.culprit}\``,
        inline: false,
      });
    }

    if (errorMessage && errorMessage.length > 80) {
      embed.fields.push({
        name: '에러 메시지',
        value:
          errorMessage.length > 1024
            ? errorMessage.substring(0, 1021) + '...'
            : errorMessage,
        inline: false,
      });
    }

    if (issue?.count) {
      embed.fields.push({
        name: '발생 횟수',
        value: issue.count.toString(),
        inline: true,
      });
    }

    if (issue?.userCount) {
      embed.fields.push({
        name: '영향받은 사용자',
        value: issue.userCount.toString(),
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

  /**
   * Apple App Store Server Notifications V2 처리
   * 참고: https://developer.apple.com/documentation/appstoreservernotifications
   * 영수증이 무효한 경우에만 200으로 종료하고, 일시적 오류는 5xx로 응답해 Apple의 재시도를 유도한다.
   */
  async handleAppleWebhook(body: { signedPayload?: string }) {
    if (!body?.signedPayload) {
      this.logger.warn('Apple webhook: signedPayload 없음');
      return { message: 'Apple webhook 수신 완료' };
    }

    try {
      const { notification, verified } =
        await this.iosVerifier.decodeNotification(body.signedPayload);

      const eventType = [notification.notificationType, notification.subtype]
        .filter(Boolean)
        .join('_');

      if (
        (notification.notificationType as NotificationTypeV2) ===
        NotificationTypeV2.TEST
      ) {
        this.logger.log('Apple webhook: 테스트 알림 수신 성공');
        return { message: 'Apple webhook 처리 완료' };
      }

      if (!verified) {
        this.logger.warn(`Apple webhook: 거래 정보 없음 (type=${eventType})`);
        return { message: 'Apple webhook 수신 완료' };
      }

      const userId =
        await this.subscriptionService.findUserIdByOriginalTransactionId(
          verified.originalTransactionId,
        );

      if (!userId) {
        // 클라이언트의 /subscription/verify 가 아직 도착하지 않은 경우 (검증 시 반영된다)
        this.logger.warn(
          `Apple webhook: 알 수 없는 originalTransactionId=${verified.originalTransactionId} (type=${eventType})`,
        );
        return { message: 'Apple webhook 수신 완료' };
      }

      await this.subscriptionService.applyVerifiedPurchase(userId, verified, {
        eventType,
        rawPayload: {
          notificationType: notification.notificationType,
          subtype: notification.subtype,
          environment: notification.data?.environment,
          notificationUUID: notification.notificationUUID,
        },
        occurredAt: notification.signedDate
          ? new Date(notification.signedDate)
          : new Date(),
      });

      return { message: 'Apple webhook 처리 완료' };
    } catch (error) {
      if (error instanceof PurchaseVerificationFailedException) {
        this.logger.error(
          `Apple webhook 검증 실패 (재시도 불필요): ${error.message}`,
        );
        return { message: 'Apple webhook 수신 완료' };
      }

      // DB·스토어 일시 장애는 삼키면 이벤트가 유실되므로 재시도하도록 그대로 던진다
      this.logger.error(
        `Apple webhook 처리 실패 (재시도 유도): ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 그룹원 신고 Discord 알림
   */
  async sendMemberReportToDiscord(report: {
    id: string;
    groupId: string;
    groupName: string;
    reporterName: string;
    reportedName: string;
    reason: string;
    detail?: string;
  }): Promise<void> {
    if (!this.discordWebhookUrl) {
      this.logger.warn('DISCORD_WEBHOOK_URL이 설정되지 않았습니다');
      return;
    }

    const reasonMap: Record<string, string> = {
      SPAM: '🗑️ 스팸',
      ABUSE: '🤬 욕설/비방',
      HARASSMENT: '😤 괴롭힘',
      INAPPROPRIATE_CONTENT: '🔞 부적절한 콘텐츠',
      FAKE_IDENTITY: '🎭 사칭',
      ETC: '📌 기타',
    };

    const embed = {
      title: '🚩 그룹원 신고 접수',
      color: 0xff6b35,
      fields: [
        { name: '그룹', value: report.groupName, inline: true },
        { name: '그룹 ID', value: `\`${report.groupId}\``, inline: true },
        { name: '​', value: '​', inline: false },
        { name: '신고자', value: report.reporterName, inline: true },
        { name: '피신고자', value: report.reportedName, inline: true },
        {
          name: '신고 사유',
          value: reasonMap[report.reason] ?? report.reason,
          inline: false,
        },
        ...(report.detail
          ? [{ name: '상세 내용', value: report.detail, inline: false }]
          : []),
        {
          name: '신고 ID',
          value: `\`${report.id}\``,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Family Planner - 신고 시스템' },
    };

    try {
      const response = await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!response.ok) {
        this.logger.error(
          `Discord 신고 알림 전송 실패: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.log('그룹원 신고 Discord 알림 전송 성공');
      }
    } catch (error) {
      this.logger.error('Discord 신고 알림 전송 중 에러 발생', error);
    }
  }

  /**
   * Google Play Real-time Developer Notifications 처리
   * 참고: https://developer.android.com/google/play/billing/rtdn-reference
   * RTDN 페이로드 자체는 서명되어 있지 않으므로 purchaseToken을 Google Play Developer API로 재검증한다.
   */
  async handleGoogleWebhook(body: { message?: { data?: string } }) {
    if (!body?.message?.data) {
      this.logger.warn('Google webhook: message.data 없음');
      return { message: 'Google webhook 수신 완료' };
    }

    let decoded: any;
    try {
      decoded = JSON.parse(
        Buffer.from(body.message.data, 'base64').toString('utf-8'),
      );
    } catch (error) {
      this.logger.error(
        `Google webhook: 페이로드 파싱 실패 - ${error.message}`,
      );
      return { message: 'Google webhook 수신 완료' };
    }

    try {
      if (decoded.testNotification) {
        this.logger.log('Google webhook: 테스트 알림 수신 성공');
        return { message: 'Google webhook 처리 완료' };
      }

      if (decoded.voidedPurchaseNotification?.purchaseToken) {
        return await this.handleGoogleVoidedPurchase(
          decoded.voidedPurchaseNotification.purchaseToken,
        );
      }

      const purchaseToken = decoded.subscriptionNotification?.purchaseToken;
      if (!purchaseToken) {
        this.logger.log('Google webhook: 구독 알림 아님 (단건 결제 등)');
        return { message: 'Google webhook 수신 완료' };
      }

      const verified = await this.androidVerifier.verify(purchaseToken);

      // 업그레이드·재구독 시 purchaseToken이 교체되므로 이전 토큰으로도 조회한다
      const userId =
        (await this.subscriptionService.findUserIdByOriginalTransactionId(
          purchaseToken,
        )) ??
        (verified.linkedOriginalTransactionId
          ? await this.subscriptionService.findUserIdByOriginalTransactionId(
              verified.linkedOriginalTransactionId,
            )
          : null);

      if (!userId) {
        // 클라이언트의 /subscription/verify 가 아직 도착하지 않은 경우 (검증 시 반영된다)
        this.logger.warn(
          'Google webhook: 알 수 없는 purchaseToken (userId 조회 실패)',
        );
        return { message: 'Google webhook 수신 완료' };
      }

      const notificationType =
        decoded.subscriptionNotification?.notificationType;

      await this.subscriptionService.applyVerifiedPurchase(userId, verified, {
        eventType: `GOOGLE_${GOOGLE_NOTIFICATION_TYPES[notificationType] ?? notificationType}`,
        rawPayload: {
          notificationType,
          subscriptionId: decoded.subscriptionNotification?.subscriptionId,
          eventTimeMillis: decoded.eventTimeMillis,
        },
        occurredAt: decoded.eventTimeMillis
          ? new Date(Number(decoded.eventTimeMillis))
          : new Date(),
      });

      return { message: 'Google webhook 처리 완료' };
    } catch (error) {
      if (error instanceof PurchaseVerificationFailedException) {
        this.logger.error(
          `Google webhook 검증 실패 (재시도 불필요): ${error.message}`,
        );
        return { message: 'Google webhook 수신 완료' };
      }

      // 비-2xx로 응답하면 Pub/Sub이 재전송하므로 일시적 오류는 그대로 던진다
      this.logger.error(
        `Google webhook 처리 실패 (재시도 유도): ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 환불·차지백 알림 처리 (즉시 혜택 회수)
   */
  private async handleGoogleVoidedPurchase(purchaseToken: string) {
    const userId =
      await this.subscriptionService.findUserIdByOriginalTransactionId(
        purchaseToken,
      );

    if (!userId) {
      this.logger.warn('Google webhook: 환불 대상 구독을 찾을 수 없습니다');
      return { message: 'Google webhook 수신 완료' };
    }

    await this.subscriptionService.expireSubscription(
      userId,
      SubscriptionStatus.revoked,
    );

    this.logger.log(`Google webhook: 환불 처리 완료 (userId=${userId})`);
    return { message: 'Google webhook 처리 완료' };
  }

  /**
   * 계정 삭제 결과 Discord 알림 (백그라운드 처리 완료/실패 시 호출)
   */
  async sendAccountDeletionResult(
    userId: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    if (!this.discordWebhookUrl) return;

    const embed = {
      title: success ? '🗑️ 계정 삭제 완료' : '🚨 계정 삭제 실패',
      color: success ? 0x43a047 : 0xff4949,
      fields: [
        { name: 'userId', value: `\`${userId}\``, inline: false },
        ...(errorMessage
          ? [{ name: '오류 내용', value: errorMessage, inline: false }]
          : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Family Planner Auth' },
    };

    try {
      const response = await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!response.ok) {
        this.logger.error(
          `Discord 계정 삭제 알림 전송 실패: ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error('Discord 계정 삭제 알림 전송 중 에러', error);
    }
  }

  /**
   * Q&A 새 질문 Discord 알림
   */
  async sendQuestionToDiscord(question: {
    id: string;
    title: string;
    content: string;
    category: string;
    visibility: string;
    user: {
      name: string;
    };
  }) {
    if (!this.discordQnaWebhookUrl) {
      this.logger.warn('DISCORD_QNA_WEBHOOK_URL이 설정되지 않았습니다');
      return;
    }

    // 카테고리 한글 매핑
    const categoryMap = {
      BUG: '🐛 버그',
      FEATURE: '✨ 개선 제안',
      USAGE: '❓ 사용법',
      ACCOUNT: '👤 계정',
      PAYMENT: '💳 결제',
      ETC: '📌 기타',
    };

    // 공개/비공개 한글 매핑
    const visibilityMap = {
      PUBLIC: '🌐 공개',
      PRIVATE: '🔒 비공개',
    };

    const embed = {
      title: '📬 새로운 Q&A 질문이 등록되었습니다',
      color: 0x5865f2, // Discord 블루
      fields: [
        {
          name: '제목',
          value: question.title,
          inline: false,
        },
        {
          name: '내용',
          value:
            question.content.length > 200
              ? question.content.substring(0, 200) + '...'
              : question.content,
          inline: false,
        },
        {
          name: '카테고리',
          value: categoryMap[question.category] || question.category,
          inline: true,
        },
        {
          name: '공개 설정',
          value: visibilityMap[question.visibility] || question.visibility,
          inline: true,
        },
        {
          name: '작성자',
          value: question.user.name,
          inline: true,
        },
        {
          name: '질문 ID',
          value: `\`${question.id}\``,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Family Planner Q&A',
      },
    };

    try {
      const response = await fetch(this.discordQnaWebhookUrl, {
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
        this.logger.log('Q&A 질문 Discord 알림 전송 성공');
      }
    } catch (error) {
      this.logger.error('Q&A Discord 알림 전송 중 에러 발생', error);
    }
  }
}
