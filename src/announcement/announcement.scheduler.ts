import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationService } from '@/notification/notification.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 공지사항 스케줄러
 * - Redis의 조회수를 DB에 동기화 (Write-Back 전략)
 * - Redis의 읽음 처리를 DB에 동기화 (Write-Back 전략)
 * - 예약된 공지사항 알림 발송 (1분마다)
 * - 서버 재시작 시 미발송 알림 복구
 */
@Injectable()
export class AnnouncementScheduler implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementScheduler.name);
  private readonly BATCH_SIZE = 1000; // 한 번에 처리할 최대 건수
  private readonly MAX_RETRY_COUNT = 3; // 최대 재시도 횟수
  private readonly RETRY_DELAY_MINUTES = 5; // 재시도 지연 시간 (분)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 서버 시작 시 미발송 예약 알림을 Redis로 로드
   */
  async onModuleInit() {
    this.logger.log('서버 시작: 미발송 예약 알림 복구 중...');

    try {
      // DB에서 예약되었으나 아직 발송되지 않은 공지사항 조회
      const pendingAnnouncements = await this.prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          scheduledNotificationAt: Date;
        }>
      >`
        SELECT id, title, scheduledNotificationAt
        FROM announcements
        WHERE scheduledNotificationAt IS NOT NULL
          AND notificationSentAt IS NULL
          AND deletedAt IS NULL
      `;

      if (pendingAnnouncements.length === 0) {
        this.logger.log('복구할 예약 알림 없음');
        return;
      }

      // Redis에 재등록
      for (const announcement of pendingAnnouncements) {
        await this.redisService.scheduleAnnouncementNotification(
          announcement.id,
          announcement.title,
          announcement.scheduledNotificationAt,
        );
      }

      this.logger.log(`${pendingAnnouncements.length}개의 예약 알림 복구 완료`);
    } catch (error) {
      this.logger.error('예약 알림 복구 실패', error);
    }
  }

  /**
   * 공지사항 조회수 동기화 (매 10분마다)
   * Redis에 쌓인 조회수를 DB에 반영하고 Redis 카운트 차감
   * DECRBY 사용으로 Race Condition 방지
   * Connection Pool 보호를 위한 배치 처리 (50개씩)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAnnouncementViewCounts() {
    this.logger.log('공지사항 조회수 동기화 시작');

    try {
      // Redis에서 모든 조회수 조회
      const viewCounts = await this.redisService.getAllAnnouncementViewCounts();
      const entries = Object.entries(viewCounts).filter(
        ([, count]) => count > 0,
      );

      if (entries.length === 0) {
        this.logger.log('동기화할 조회수 없음');
        return;
      }

      this.logger.log(`${entries.length}개의 공지사항 조회수 동기화 중`);

      // Connection Pool 보호: 50개씩 배치 처리
      const CONCURRENCY_LIMIT = 50;
      let processedCount = 0;

      for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
        const batch = entries.slice(i, i + CONCURRENCY_LIMIT);

        const batchPromises = batch.map(async ([announcementId, count]) => {
          try {
            await this.prisma.announcement.update({
              where: { id: announcementId },
              data: {
                viewCount: {
                  increment: count,
                },
              },
            });

            // Redis 카운트 차감 (Race Condition 방지)
            await this.redisService.decrementAnnouncementViewCount(
              announcementId,
              count,
            );

            processedCount++;
          } catch (error) {
            this.logger.error(
              `공지 ${announcementId} 조회수 동기화 실패:`,
              error,
            );
          }
        });

        await Promise.allSettled(batchPromises);

        if (i + CONCURRENCY_LIMIT < entries.length) {
          this.logger.log(
            `진행 중: ${processedCount}/${entries.length} (${Math.round((processedCount / entries.length) * 100)}%)`,
          );
        }
      }

      this.logger.log(
        `공지사항 조회수 동기화 완료 (${processedCount}/${entries.length}건 성공)`,
      );
    } catch (error) {
      this.logger.error('공지사항 조회수 동기화 실패', error);
    }
  }

  /**
   * 공지사항 읽음 처리 동기화 (매 10분마다)
   * Redis에 쌓인 읽음 처리를 DB에 반영하고 Redis 기록 삭제
   * 배치 처리로 메모리 보호 + skipDuplicates로 중복 방지
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAnnouncementReads() {
    this.logger.log('공지사항 읽음 처리 동기화 시작');

    try {
      let totalProcessed = 0;
      let hasMore = true;

      while (hasMore) {
        // 1. Redis에서 배치 크기만큼 Pop (원자적)
        const reads = await this.redisService.popAnnouncementReads(
          this.BATCH_SIZE,
        );

        if (reads.length === 0) {
          hasMore = false;
          break;
        }

        this.logger.log(`${reads.length}건의 읽음 처리 배치 동기화 중`);

        // 2. createMany로 한 번에 삽입 (skipDuplicates로 중복 자동 처리)
        await this.prisma.announcementRead.createMany({
          data: reads.map((read) => ({
            announcementId: read.announcementId,
            userId: read.userId,
          })),
          skipDuplicates: true, // DB가 중복 자동 처리
        });

        this.logger.log(`${reads.length}건의 읽음 처리 저장 완료`);

        totalProcessed += reads.length;

        // 배치 크기보다 적게 조회되면 더 이상 데이터가 없음
        if (reads.length < this.BATCH_SIZE) {
          hasMore = false;
        }
      }

      if (totalProcessed > 0) {
        this.logger.log(
          `공지사항 읽음 처리 동기화 완료 (총 ${totalProcessed}건)`,
        );
      } else {
        this.logger.log('동기화할 읽음 처리 없음');
      }
    } catch (error) {
      this.logger.error('공지사항 읽음 처리 동기화 실패', error);
    }
  }

  /**
   * 예약된 공지사항 알림 발송 (매 1분마다)
   * Redis Sorted Set에서 발송 시간이 된 알림들을 조회하여 FCM 발송
   * 실패 시 재시도 로직 적용 (최대 3회)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendScheduledNotifications() {
    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Redis에서 발송 시간이 된 알림들 조회 및 제거
      const notifications =
        await this.redisService.popReadyScheduledNotifications(
          currentTimestamp,
          100, // 한 번에 최대 100개
        );

      if (notifications.length === 0) {
        return;
      }

      this.logger.log(`${notifications.length}개의 예약 알림 발송 중...`);

      // 각 알림 발송 및 DB 업데이트
      const sendPromises = notifications.map(async (notification) => {
        try {
          // FCM Topic으로 알림 발송
          await this.notificationService.sendAnnouncementNotification({
            id: notification.announcementId,
            title: notification.title,
          });

          // DB에 발송 완료 기록 (타입 안전한 Prisma update 사용)
          await this.prisma.announcement.update({
            where: { id: notification.announcementId },
            data: { notificationSentAt: new Date() },
          });

          this.logger.log(
            `공지사항 ${notification.announcementId} 예약 알림 발송 완료`,
          );
        } catch (error) {
          this.logger.error(
            `공지사항 ${notification.announcementId} 알림 발송 실패 (시도 ${notification.retryCount + 1}/${this.MAX_RETRY_COUNT}):`,
            error,
          );

          // 재시도 로직: 일시적 오류(네트워크, FCM 서버 다운 등)에 대응
          const retryCount = notification.retryCount || 0;

          if (retryCount < this.MAX_RETRY_COUNT) {
            // 현재 시간 + 5분 후에 재시도
            const retryTime = dayjs()
              .tz('Asia/Seoul')
              .add(this.RETRY_DELAY_MINUTES, 'minute')
              .toDate();

            await this.redisService.scheduleAnnouncementNotification(
              notification.announcementId,
              notification.title,
              retryTime,
              retryCount + 1,
            );

            this.logger.log(
              `재시도 예약 완료: ${notification.announcementId} (${retryCount + 1}/${this.MAX_RETRY_COUNT}) - ${dayjs(retryTime).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss')}`,
            );
          } else {
            // 최대 재시도 횟수 초과: 더 이상 재시도하지 않음
            this.logger.error(
              `최대 재시도 횟수 초과, 알림 발송 포기: ${notification.announcementId}`,
            );
            // 정책: "알림이 안 가면 안 갔지, 중복으로 가는 게 더 나쁘다"
          }
        }
      });

      await Promise.allSettled(sendPromises);

      this.logger.log(`${notifications.length}개의 예약 알림 처리 완료`);
    } catch (error) {
      this.logger.error('예약 알림 발송 처리 실패', error);
    }
  }
}
