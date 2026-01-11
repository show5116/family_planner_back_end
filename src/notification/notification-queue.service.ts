import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { NotificationTokenService } from './notification-token.service';
import { PrismaService } from '@/prisma/prisma.service';
import { FirebaseService } from '@/firebase/firebase.service';
import { messaging } from 'firebase-admin';

/**
 * Queue 알림 데이터 인터페이스
 */
export interface QueuedNotification {
  userId: string;
  category: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledTime?: string; // ISO 8601 형식
}

/**
 * Two-Track 알림 큐 관리 서비스
 * - Ready Queue: 즉시 발송 대기 알림
 * - Waiting Room: 예약 알림
 */
@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly tokenService: NotificationTokenService,
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * 즉시 발송: Ready Queue에 추가
   */
  async enqueueImmediate(notification: QueuedNotification): Promise<void> {
    await this.redisService.addToReadyQueue(notification);
    this.logger.log(
      `Enqueued immediate notification for user ${notification.userId}`,
    );
  }

  /**
   * 예약 발송: Waiting Room에 추가
   */
  async enqueueScheduled(notification: QueuedNotification): Promise<void> {
    if (!notification.scheduledTime) {
      throw new Error('scheduledTime is required for scheduled notifications');
    }

    const scheduledDate = new Date(notification.scheduledTime);
    await this.redisService.addToWaitingRoom(notification, scheduledDate);
    this.logger.log(
      `Enqueued scheduled notification for user ${notification.userId} at ${scheduledDate.toISOString()}`,
    );
  }

  /**
   * Ready Queue에서 알림 하나를 꺼내서 FCM 발송 (Non-blocking)
   * @deprecated 무한 루프 워커에서는 processOneWithBlocking() 사용 권장
   */
  async processOneFromReadyQueue(): Promise<boolean> {
    const notification = await this.redisService.popFromReadyQueue();
    if (!notification) {
      return false; // 큐가 비어있음
    }

    const queuedNotif = notification as QueuedNotification;

    try {
      await this.sendNotification(queuedNotif);
      this.logger.log(
        `Successfully sent notification to user ${queuedNotif.userId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${queuedNotif.userId}: ${error.message}`,
      );
      // 실패한 알림은 재시도 로직 필요 시 별도 Dead Letter Queue로 이동 가능
      return true; // 큐에서는 제거됨
    }
  }

  /**
   * Ready Queue에서 알림 하나를 꺼내서 FCM 발송 (Blocking)
   * 큐에 데이터가 들어올 때까지 대기 (실시간 처리)
   * @param timeoutSeconds 타임아웃 시간 (초)
   * @returns true (알림 처리 완료), false (타임아웃)
   */
  async processOneWithBlocking(timeoutSeconds: number = 5): Promise<boolean> {
    const notification =
      await this.redisService.blockingPopFromReadyQueue(timeoutSeconds);

    if (!notification) {
      return false; // 타임아웃 (큐가 비어있음)
    }

    const queuedNotif = notification as QueuedNotification;

    try {
      await this.sendNotification(queuedNotif);
      this.logger.log(
        `Successfully sent notification to user ${queuedNotif.userId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${queuedNotif.userId}: ${error.message}`,
      );
      return true; // 실패해도 큐에서는 제거됨
    }
  }

  /**
   * FCM 발송 및 DB 저장 로직
   */
  private async sendNotification(
    notification: QueuedNotification,
  ): Promise<void> {
    const { userId, category, title, body, data } = notification;

    // 1. 사용자 설정 확인
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId_category: { userId, category: category as any } },
    });

    if (setting && !setting.enabled) {
      this.logger.log(
        `User ${userId} has disabled ${category} notifications. Skipping.`,
      );
      return;
    }

    // 2. FCM 토큰 조회 (Look-Aside 캐싱)
    const tokens = await this.tokenService.getUserTokens(userId);
    if (tokens.length === 0) {
      this.logger.warn(`No FCM tokens found for user ${userId}. Skipping.`);
      return;
    }

    // 3. DB에 히스토리 저장 (sent = false)
    const savedNotification = await this.prisma.notification.create({
      data: {
        userId,
        category: category as any,
        title,
        body,
        data: data || null,
        sent: false,
      },
    });

    // 4. FCM 메시지 발송
    const message: messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: data ? this.convertDataToStringMap(data) : undefined,
      android: {
        priority: 'high',
        notification: { channelId: category },
      },
      apns: {
        payload: {
          aps: { sound: 'default', contentAvailable: true },
        },
      },
    };

    const messagingClient = this.firebaseService.getMessaging();
    const response = await messagingClient.sendEachForMulticast(message);

    // 5. 성공 시 DB 업데이트 (sent = true, sentAt 기록)
    if (response.successCount > 0) {
      await this.prisma.notification.update({
        where: { id: savedNotification.id },
        data: { sent: true, sentAt: new Date() },
      });
    }

    // 6. 실패한 토큰 처리
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      if (failedTokens.length > 0) {
        // 유효하지 않은 토큰 삭제
        await this.prisma.deviceToken.deleteMany({
          where: { token: { in: failedTokens } },
        });

        // Redis 캐시 무효화
        await this.redisService.invalidateUserTokensCache(userId);

        this.logger.warn(
          `Removed ${failedTokens.length} invalid tokens for user ${userId}`,
        );
      }
    }
  }

  /**
   * FCM data는 string만 허용하므로 변환
   */
  private convertDataToStringMap(
    data: Record<string, any>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }
}
