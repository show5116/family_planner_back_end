import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskService } from './task.service';

/**
 * Task 스케줄러 서비스
 * 반복 일정 자동 생성
 */
@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private taskService: TaskService,
  ) {}

  /**
   * 매일 0시에 반복 일정 자동 생성
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateRecurringTasks() {
    this.logger.log('반복 일정 자동 생성 시작');

    try {
      // AUTO_SCHEDULER 타입이면서 활성화된 반복 규칙 조회
      const recurrings = await this.prisma.recurring.findMany({
        where: {
          generationType: 'AUTO_SCHEDULER',
          isActive: true,
        },
        include: {
          user: {
            select: { lastLoginAt: true },
          },
        },
      });

      // 휴면 사용자 필터링 (30일 이내 로그인)
      const activeRecurrings = recurrings.filter((r) => {
        if (!r.user.lastLoginAt) return false;
        const daysSinceLogin = Math.floor(
          (Date.now() - r.user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSinceLogin <= 30;
      });

      this.logger.log(`활성 반복 규칙 ${activeRecurrings.length}개 발견`);

      // 각 반복 규칙에 대해 Task 생성
      for (const recurring of activeRecurrings) {
        try {
          await this.taskService.generateRecurringTasks(recurring.id);
        } catch (error) {
          this.logger.error(
            `반복 규칙 ${recurring.id} Task 생성 실패: ${error.message}`,
          );
        }
      }

      this.logger.log('반복 일정 자동 생성 완료');
    } catch (error) {
      this.logger.error(`반복 일정 자동 생성 실패: ${error.message}`);
    }
  }
}
