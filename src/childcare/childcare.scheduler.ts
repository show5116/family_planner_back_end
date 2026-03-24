import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';

const LOCK_TTL = {
  allowance: 5 * 60, // 5분
  negotiation: 5 * 60, // 5분
} as const;

@Injectable()
export class ChildcareScheduler {
  private readonly logger = new Logger(ChildcareScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  /**
   * 용돈 자동 지급 — 매일 오전 9시 KST (00:00 UTC)
   * payDay가 오늘 날짜와 일치하는 자녀에게 포인트 지급 + 알림
   */
  @Cron('0 0 * * *')
  async dispatchAllowance() {
    const lockKey = 'lock:childcare:allowance';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.allowance,
      lockValue,
    );
    if (!acquired) return;

    try {
      const today = new Date();
      const todayDay = today.getDate();
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      const isLastDay = todayDay === lastDayOfMonth;

      const plans = await this.prisma.childAllowancePlan.findMany({
        where: {
          OR: [
            { payDay: todayDay },
            // 말일인 경우: 이번 달에 존재하지 않는 날짜(payDay > 말일)도 함께 지급
            ...(isLastDay ? [{ payDay: { gt: lastDayOfMonth } }] : []),
          ],
        },
        include: {
          child: {
            include: { account: true },
          },
        },
      });

      this.logger.debug(
        `용돈 지급 대상: ${plans.length}명 (${todayDay}일 지급)`,
      );

      for (const plan of plans) {
        const { child } = plan;
        if (!child.account) continue;

        await this.prisma.$transaction([
          this.prisma.childcareTransaction.create({
            data: {
              accountId: child.account.id,
              type: 'ALLOWANCE',
              amount: plan.monthlyPoints,
              description: '월 포인트 자동 지급',
              createdBy: child.parentUserId,
            },
          }),
          this.prisma.childcareAccount.update({
            where: { id: child.account.id },
            data: { balance: { increment: plan.monthlyPoints } },
          }),
        ]);

        // 자녀 앱 계정이 있으면 알림
        if (child.userId) {
          this.notificationQueue
            .enqueueImmediate({
              userId: child.userId,
              category: NotificationCategory.CHILDCARE,
              title: '이번 달 용돈이 지급됐어요!',
              body: `${plan.monthlyPoints} 포인트가 적립되었습니다`,
              data: { type: 'ALLOWANCE', amount: plan.monthlyPoints },
            })
            .catch(() => null);
        }

        // 부모에게도 알림
        this.notificationQueue
          .enqueueImmediate({
            userId: child.parentUserId,
            category: NotificationCategory.CHILDCARE,
            title: `${child.name} 용돈 지급 완료`,
            body: `${plan.monthlyPoints} 포인트가 지급되었습니다`,
            data: { type: 'ALLOWANCE', amount: plan.monthlyPoints },
          })
          .catch(() => null);

        this.logger.debug(`용돈 지급: ${child.name} +${plan.monthlyPoints}p`);
      }
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 연봉 협상일 알림 — 매일 오전 9시 KST (00:00 UTC)
   * 협상일 전날 → 내일 협상일 알림
   * 협상일 당일 → 오늘 협상일 알림
   */
  @Cron('0 0 * * *')
  async notifyNegotiationDate() {
    const lockKey = 'lock:childcare:negotiation';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.negotiation,
      lockValue,
    );
    if (!acquired) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // 오늘이 협상일 당일이거나 내일이 협상일인 플랜 조회
      const plans = await this.prisma.childAllowancePlan.findMany({
        where: {
          nextNegotiationDate: {
            gte: today,
            lt: dayAfterTomorrow,
          },
        },
        include: { child: true },
      });

      this.logger.debug(`연봉 협상 알림 대상: ${plans.length}건`);

      for (const plan of plans) {
        const { child } = plan;
        if (!plan.nextNegotiationDate) continue;
        const negDate = new Date(plan.nextNegotiationDate);
        negDate.setHours(0, 0, 0, 0);

        const isToday = negDate.getTime() === today.getTime();
        const isTomorrow = negDate.getTime() === tomorrow.getTime();

        if (!isToday && !isTomorrow) continue;

        const title = isToday
          ? `${child.name} 연봉 협상일이에요!`
          : `${child.name} 연봉 협상일이 내일이에요`;
        const body = isToday
          ? '오늘 포인트 조건을 다시 협상해보세요'
          : '내일 포인트 조건 협상을 준비해보세요';

        // 부모에게 알림
        this.notificationQueue
          .enqueueImmediate({
            userId: child.parentUserId,
            category: NotificationCategory.CHILDCARE,
            title,
            body,
            data: { type: 'NEGOTIATION', childId: child.id },
          })
          .catch(() => null);

        // 자녀 앱 계정이 있으면 알림
        if (child.userId) {
          this.notificationQueue
            .enqueueImmediate({
              userId: child.userId,
              category: NotificationCategory.CHILDCARE,
              title: isToday
                ? '오늘 용돈 협상일이에요!'
                : '내일 용돈 협상일이에요',
              body,
              data: { type: 'NEGOTIATION', childId: child.id },
            })
            .catch(() => null);
        }

        this.logger.debug(
          `협상 알림: ${child.name} (${isToday ? '당일' : '전날'})`,
        );
      }
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }
}
