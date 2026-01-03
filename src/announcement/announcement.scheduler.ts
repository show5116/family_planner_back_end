import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

/**
 * 공지사항 스케줄러
 * - Redis의 조회수를 DB에 동기화 (Write-Back 전략)
 * - Redis의 읽음 처리를 DB에 동기화 (Write-Back 전략)
 */
@Injectable()
export class AnnouncementScheduler {
  private readonly logger = new Logger(AnnouncementScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 공지사항 조회수 동기화 (매 10분마다)
   * Redis에 쌓인 조회수를 DB에 반영하고 Redis 카운트 초기화
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAnnouncementViewCounts() {
    this.logger.log('공지사항 조회수 동기화 시작');

    try {
      // Redis에서 모든 조회수 조회
      const viewCounts = await this.redisService.getAllAnnouncementViewCounts();

      if (Object.keys(viewCounts).length === 0) {
        this.logger.log('동기화할 조회수 없음');
        return;
      }

      // DB 업데이트 (배치)
      const updatePromises = Object.entries(viewCounts).map(
        async ([announcementId, count]) => {
          if (count > 0) {
            await this.prisma.announcement.update({
              where: { id: announcementId },
              data: {
                viewCount: {
                  increment: count,
                },
              },
            });

            // Redis 카운트 초기화
            await this.redisService.resetAnnouncementViewCount(announcementId);
            this.logger.log(`공지 ${announcementId} 조회수 ${count} 증가`);
          }
        },
      );

      await Promise.allSettled(updatePromises);
      this.logger.log('공지사항 조회수 동기화 완료');
    } catch (error) {
      this.logger.error('공지사항 조회수 동기화 실패', error);
    }
  }

  /**
   * 공지사항 읽음 처리 동기화 (매 10분마다)
   * Redis에 쌓인 읽음 처리를 DB에 반영하고 Redis 기록 삭제
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAnnouncementReads() {
    this.logger.log('공지사항 읽음 처리 동기화 시작');

    try {
      // Redis에서 모든 읽음 처리 조회
      const reads = await this.redisService.getAllAnnouncementReads();

      if (reads.length === 0) {
        this.logger.log('동기화할 읽음 처리 없음');
        return;
      }

      // DB 업데이트 (배치)
      const updatePromises = reads.map(async (read) => {
        try {
          await this.prisma.announcementRead.upsert({
            where: {
              announcementId_userId: {
                announcementId: read.announcementId,
                userId: read.userId,
              },
            },
            create: {
              announcementId: read.announcementId,
              userId: read.userId,
            },
            update: {},
          });

          // Redis 기록 삭제
          await this.redisService.deleteAnnouncementRead(
            read.announcementId,
            read.userId,
          );

          this.logger.log(
            `공지 ${read.announcementId} 사용자 ${read.userId} 읽음 처리`,
          );
        } catch (error) {
          this.logger.error(
            `읽음 처리 실패: ${read.announcementId}, ${read.userId}`,
            error,
          );
        }
      });

      await Promise.allSettled(updatePromises);
      this.logger.log('공지사항 읽음 처리 동기화 완료');
    } catch (error) {
      this.logger.error('공지사항 읽음 처리 동기화 실패', error);
    }
  }
}
