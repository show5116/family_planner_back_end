import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { I18nService } from 'nestjs-i18n';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  calculateAchievementRate,
  getWeekStart,
} from './utils/routine-stats.util';
import { todayInKst } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineReminderScheduler {
  private readonly logger = new Logger(RoutineReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly i18n: I18nService,
  ) {}

  private async getUserLang(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    return user?.language ?? 'ko';
  }

  /** 매 정시 실행 — routineReminderHour가 현재 시각인 유저 중 오늘 미체크 루틴이 있으면 발송 */
  @Cron('0 * * * *', { timeZone: 'Asia/Seoul' })
  async sendDailyReminders() {
    if (!isSchedulerEnabled('routine')) return;

    const currentHour = dayjs().tz('Asia/Seoul').hour();
    const lockKey = `lock:routine:daily-reminder:${currentHour}`;
    const lockValue = Date.now().toString();
    const acquired = await this.redisService.acquireLock(
      lockKey,
      300,
      lockValue,
    );
    if (!acquired) return;

    try {
      const settings = await this.prisma.notificationSetting.findMany({
        where: {
          category: 'ROUTINE' as any,
          enabled: true,
          routineReminderHour: currentHour,
        },
        select: { userId: true },
      });
      if (settings.length === 0) return;

      const today = todayInKst();

      for (const { userId } of settings) {
        const routines = await this.prisma.routine.findMany({
          where: { userId, isActive: true, deletedAt: null },
          select: { id: true },
        });
        if (routines.length === 0) continue;

        const routineIds = routines.map((r) => r.id);
        const todayLogs = await this.prisma.routineLog.findMany({
          where: { routineId: { in: routineIds }, checkedDate: today },
          select: { routineId: true },
        });
        const checkedIds = new Set(todayLogs.map((l) => l.routineId));
        const uncheckedCount = routineIds.filter(
          (id) => !checkedIds.has(id),
        ).length;
        if (uncheckedCount === 0) continue;

        const lang = await this.getUserLang(userId);
        await this.notificationQueue.enqueueImmediate({
          userId,
          category: NotificationCategory.ROUTINE,
          title: this.i18n.t('routine.notification.daily_reminder_title', {
            lang,
          }),
          body: this.i18n.t('routine.notification.daily_reminder_body', {
            lang,
            args: { count: uncheckedCount },
          }),
          data: { action: 'view_routine' },
        });
      }
    } catch (err) {
      this.logger.error(
        `[RoutineReminder] daily reminder 처리 실패: ${err.message}`,
      );
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }

  /** 매주 일요일 20시 KST — 이번 주 달성률 요약 발송 */
  @Cron('0 20 * * 0', { timeZone: 'Asia/Seoul' })
  async sendWeeklySummary() {
    if (!isSchedulerEnabled('routine')) return;

    const lockKey = 'lock:routine:weekly-summary';
    const lockValue = Date.now().toString();
    const acquired = await this.redisService.acquireLock(
      lockKey,
      600,
      lockValue,
    );
    if (!acquired) return;

    try {
      const settings = await this.prisma.notificationSetting.findMany({
        where: { category: 'ROUTINE' as any, enabled: true },
        select: { userId: true },
      });
      if (settings.length === 0) return;

      const today = todayInKst();
      const weekStart = getWeekStart(today);

      for (const { userId } of settings) {
        const routines = await this.prisma.routine.findMany({
          where: { userId, isActive: true, deletedAt: null },
        });
        if (routines.length === 0) continue;

        const routineIds = routines.map((r) => r.id);
        const logs = await this.prisma.routineLog.findMany({
          where: {
            routineId: { in: routineIds },
            checkedDate: { gte: weekStart, lte: today },
          },
          select: { routineId: true, checkedDate: true },
        });

        const logsByRoutine = new Map<string, Date[]>();
        for (const log of logs) {
          const arr = logsByRoutine.get(log.routineId);
          if (arr) {
            arr.push(log.checkedDate);
          } else {
            logsByRoutine.set(log.routineId, [log.checkedDate]);
          }
        }

        let rateSum = 0;
        for (const routine of routines) {
          const routineLogs = logsByRoutine.get(routine.id) ?? [];
          const targetCount = routine.targetCount ?? 7;
          rateSum += calculateAchievementRate(
            weekStart,
            today,
            targetCount,
            routineLogs,
          ).achievementRate;
        }
        const avgRate = Math.round((rateSum / routines.length) * 10) / 10;

        const lang = await this.getUserLang(userId);
        await this.notificationQueue.enqueueImmediate({
          userId,
          category: NotificationCategory.ROUTINE,
          title: this.i18n.t('routine.notification.weekly_summary_title', {
            lang,
          }),
          body: this.i18n.t('routine.notification.weekly_summary_body', {
            lang,
            args: { rate: avgRate },
          }),
          data: { action: 'view_routine_summary' },
        });
      }
    } catch (err) {
      this.logger.error(
        `[RoutineReminder] weekly summary 처리 실패: ${err.message}`,
      );
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }
}
