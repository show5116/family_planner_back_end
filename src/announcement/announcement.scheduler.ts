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
  private readonly BATCH_SIZE = 1000; // 한 번에 처리할 최대 건수

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
   * 배치 처리로 메모리 보호
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAnnouncementReads() {
    this.logger.log('공지사항 읽음 처리 동기화 시작');

    try {
      let totalProcessed = 0;
      let hasMore = true;

      while (hasMore) {
        // 1. Redis에서 배치 크기만큼만 조회
        const reads = await this.redisService.popAnnouncementReads(
          this.BATCH_SIZE,
        );

        if (reads.length === 0) {
          hasMore = false;
          break;
        }

        this.logger.log(`${reads.length}건의 읽음 처리 배치 동기화 중`);

        // 2. 기존 읽음 처리 조회 (중복 방지)
        const existingReads = await this.prisma.announcementRead.findMany({
          where: {
            OR: reads.map((read) => ({
              announcementId: read.announcementId,
              userId: read.userId,
            })),
          },
          select: {
            announcementId: true,
            userId: true,
          },
        });

        // 3. 기존 읽음 처리 Set 생성
        const existingSet = new Set(
          existingReads.map((r) => `${r.announcementId}:${r.userId}`),
        );

        // 4. 신규 읽음 처리만 필터링
        const newReads = reads.filter((read) => {
          return !existingSet.has(`${read.announcementId}:${read.userId}`);
        });

        // 5. createMany로 한 번에 삽입 (중복 제외)
        if (newReads.length > 0) {
          await this.prisma.announcementRead.createMany({
            data: newReads.map((read) => ({
              announcementId: read.announcementId,
              userId: read.userId,
            })),
            skipDuplicates: true, // 혹시 모를 중복 방지
          });
          this.logger.log(`${newReads.length}건의 신규 읽음 처리 저장 완료`);
        }

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
}
