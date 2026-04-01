import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SavingsType, SavingsGoalStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';

const LOCK_TTL = 5 * 60; // 5분

@Injectable()
export class SavingsScheduler {
  private readonly logger = new Logger(SavingsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  /**
   * 매일 00:10 실행 — 자동 적립
   * depositDay가 오늘 날짜와 일치하는 목표에 monthlyAmount 적립
   * - 말일 처리: 오늘이 말일이면 depositDay > 말일인 목표도 함께 실행
   * - 중복 방지: 이번 달 AUTO_DEPOSIT 트랜잭션이 이미 있으면 skip
   * - Redis 분산 락으로 중복 실행 방지
   */
  @Cron('10 0 * * *')
  async runAutoDeposit() {
    const lockKey = 'lock:savings:auto-deposit';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(lockKey, LOCK_TTL, lockValue);
    if (!acquired) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDay = today.getDate();
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      const isLastDay = todayDay === lastDayOfMonth;

      this.logger.log(
        `자동 적립 스케줄러 실행 — 기준일: ${today.toISOString().slice(0, 10)} (${todayDay}일)`,
      );

      const goals = await this.prisma.savingsGoal.findMany({
        where: {
          autoDeposit: true,
          status: SavingsGoalStatus.ACTIVE,
          OR: [
            { depositDay: todayDay },
            // 오늘이 말일이면 이번 달에 존재하지 않는 날짜(depositDay > 말일)도 실행
            ...(isLastDay ? [{ depositDay: { gt: lastDayOfMonth } }] : []),
          ],
        },
      });

      this.logger.log(`자동 적립 대상: ${goals.length}건`);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      let count = 0;
      for (const goal of goals) {
        const monthlyAmount = Number(goal.monthlyAmount);
        if (!monthlyAmount) continue;

        // 이번 달 중복 적립 방지
        const alreadyDeposited = await this.prisma.savingsTransaction.findFirst(
          {
            where: {
              goalId: goal.id,
              type: SavingsType.AUTO_DEPOSIT,
              createdAt: { gte: monthStart, lte: monthEnd },
            },
          },
        );
        if (alreadyDeposited) {
          this.logger.debug(`이번 달 이미 적립됨: goalId=${goal.id}, skip`);
          continue;
        }

        const updatedGoal = await this.prisma.$transaction(async (tx) => {
          await tx.savingsTransaction.create({
            data: {
              goalId: goal.id,
              type: SavingsType.AUTO_DEPOSIT,
              amount: monthlyAmount,
              description: '자동 적립',
            },
          });
          return tx.savingsGoal.update({
            where: { id: goal.id },
            data: { currentAmount: { increment: monthlyAmount } },
          });
        });

        count++;
        this.logger.debug(`자동 적립: goalId=${goal.id} +${monthlyAmount}`);

        // 목표 달성 여부 확인
        if (
          updatedGoal.targetAmount &&
          Number(updatedGoal.currentAmount) >= Number(updatedGoal.targetAmount)
        ) {
          await this.prisma.savingsGoal.update({
            where: { id: goal.id },
            data: { status: SavingsGoalStatus.COMPLETED },
          });
          this.notifyGoalCompleted(goal.groupId, goal.name).catch(() => null);
        }
      }

      this.logger.log(`자동 적립 완료 — ${count}건 처리`);
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }

  private async notifyGoalCompleted(groupId: string, goalName: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    for (const member of members) {
      await this.notificationQueue.enqueueImmediate({
        userId: member.userId,
        category: NotificationCategory.HOUSEHOLD,
        title: '적립 목표 달성!',
        body: `"${goalName}" 목표 금액을 달성했습니다.`,
        data: { groupId },
      });
    }
  }
}
