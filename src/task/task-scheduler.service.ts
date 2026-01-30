import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { RecurringService } from './recurring.service';

/**
 * Task 스케줄러 서비스
 * 반복 일정 자동 생성
 *
 * 개선 사항:
 * 1. 분산 락으로 Scale-out 환경에서 중복 실행 방지
 * 2. 커서 기반 페이지네이션으로 메모리 폭발 방지
 * 3. DB 레벨 필터링으로 불필요한 데이터 로드 제거
 * 4. 병렬 처리로 성능 최적화
 */
@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  // 설정값
  private readonly LOCK_KEY = 'scheduler:recurring-tasks:lock';
  private readonly LOCK_TTL = 60 * 10; // 10분 (작업 최대 시간)
  private readonly BATCH_SIZE = 100; // 한 번에 처리할 규칙 수
  private readonly CONCURRENCY = 10; // 동시 처리 개수
  private readonly INACTIVE_DAYS = 30; // 휴면 기준 일수

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private recurringService: RecurringService,
  ) {}

  /**
   * 매일 0시에 반복 일정 자동 생성
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateRecurringTasks() {
    // 1. 분산 락 획득 시도 (중복 실행 방지)
    const lockValue = `${process.pid}-${Date.now()}`;
    const acquired = await this.redisService.acquireLock(
      this.LOCK_KEY,
      this.LOCK_TTL,
      lockValue,
    );

    if (!acquired) {
      this.logger.log('다른 인스턴스에서 실행 중 - 스킵');
      return;
    }

    this.logger.log('반복 일정 자동 생성 시작');
    const startTime = Date.now();

    try {
      // 2. 활성 유저 기준일 계산 (30일 이내 로그인)
      const activeDate = new Date();
      activeDate.setDate(activeDate.getDate() - this.INACTIVE_DAYS);

      // 3. 커서 기반 페이지네이션으로 처리
      let cursor: string | null = null;
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;

      do {
        // DB 레벨에서 필터링 (활성 유저만)
        const recurrings = await this.prisma.recurring.findMany({
          where: {
            generationType: 'AUTO_SCHEDULER',
            isActive: true,
            user: {
              lastLoginAt: { gte: activeDate },
            },
          },
          select: { id: true },
          take: this.BATCH_SIZE,
          ...(cursor
            ? {
                skip: 1, // 커서 자체 스킵
                cursor: { id: cursor },
              }
            : {}),
          orderBy: { id: 'asc' },
        });

        if (recurrings.length === 0) break;

        // 다음 커서 설정
        cursor = recurrings[recurrings.length - 1].id;

        // 4. 병렬 처리 (동시성 제한)
        const results = await this.processInBatches(
          recurrings.map((r) => r.id),
          this.CONCURRENCY,
        );

        totalProcessed += recurrings.length;
        totalSuccess += results.success;
        totalFailed += results.failed;

        this.logger.log(
          `배치 처리 완료: ${recurrings.length}개 (성공: ${results.success}, 실패: ${results.failed})`,
        );

        // 배치가 BATCH_SIZE보다 작으면 마지막
        if (recurrings.length < this.BATCH_SIZE) break;
      } while (cursor);

      const duration = Date.now() - startTime;
      this.logger.log(
        `반복 일정 자동 생성 완료 - 총 ${totalProcessed}개 처리 (성공: ${totalSuccess}, 실패: ${totalFailed}) [${duration}ms]`,
      );
    } catch (error) {
      this.logger.error(`반복 일정 자동 생성 실패: ${error.message}`);
    } finally {
      // 5. 락 해제
      await this.redisService.releaseLock(this.LOCK_KEY, lockValue);
    }
  }

  /**
   * 병렬 처리 (동시성 제한)
   */
  private async processInBatches(
    recurringIds: string[],
    concurrency: number,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // 동시성 제한을 위해 청크로 나누어 처리
    for (let i = 0; i < recurringIds.length; i += concurrency) {
      const chunk = recurringIds.slice(i, i + concurrency);

      const results = await Promise.allSettled(
        chunk.map((id) => this.recurringService.generateRecurringTasks(id)),
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          success++;
        } else {
          failed++;
          this.logger.error(
            `반복 규칙 ${chunk[index]} Task 생성 실패: ${result.reason?.message}`,
          );
        }
      });
    }

    return { success, failed };
  }
}
