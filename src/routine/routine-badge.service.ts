import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  BadgeCriteriaType,
  RoutineFrequencyType,
  RoutineWeeklyMode,
} from '@/routine/enums';
import {
  calculateScheduledDayStreak,
  calculateWeekStreak,
  calculateMonthStreak,
  isScheduledDayForRoutine,
  pauseToDateRange,
  DateRange,
} from './utils/routine-stats.util';
import { RoutineService } from './routine.service';
import { todayInKst } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineBadgeService {
  private readonly logger = new Logger(RoutineBadgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly i18n: I18nService,
    @Inject(forwardRef(() => RoutineService))
    private readonly routineService: RoutineService,
  ) {}

  async findCatalog() {
    return this.prisma.routineBadge.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** 특정 루틴에서 획득한 배지 조회. 본인 또는 공유 그룹원만 접근 가능 */
  async findByRoutine(userId: string, routineId: string) {
    const routine = await this.routineService.findRoutineWithAccess(
      userId,
      routineId,
    );

    const badges = await this.prisma.userRoutineBadge.findMany({
      where: { userId: routine.userId, routineId },
      include: { badge: true, routine: { select: { title: true } } },
      orderBy: { earnedAt: 'desc' },
    });
    return badges.map((b) => this.toResponse(b));
  }

  async findMine(userId: string) {
    const badges = await this.prisma.userRoutineBadge.findMany({
      where: { userId },
      include: { badge: true, routine: { select: { title: true } } },
      orderBy: { earnedAt: 'desc' },
    });
    return badges.map((b) => this.toResponse(b));
  }

  /** 체크 직후 배지 판정. 실패해도 체크 자체는 성공 처리되도록 호출부에서 에러를 삼킴 */
  async evaluateAndAward(userId: string, routineId: string) {
    const routine = await this.prisma.routine.findUnique({
      where: { id: routineId },
    });
    if (!routine) return [];

    const [catalog, earned] = await Promise.all([
      this.prisma.routineBadge.findMany({ where: { isActive: true } }),
      this.prisma.userRoutineBadge.findMany({
        where: { userId, routineId },
        select: { badgeId: true },
      }),
    ]);

    const earnedBadgeIds = new Set(earned.map((e) => e.badgeId));
    const candidates = catalog.filter((b) => !earnedBadgeIds.has(b.id));
    if (candidates.length === 0) return [];

    const [logs, pauses] = await Promise.all([
      this.prisma.routineLog.findMany({
        where: { routineId },
        select: { checkedDate: true },
      }),
      this.prisma.routinePause.findMany({ where: { routineId } }),
    ]);
    const logDates = logs.map((l) => l.checkedDate);
    const today = todayInKst();
    const excludedRanges: DateRange[] = pauses.map((p) =>
      pauseToDateRange(p, today),
    );

    let currentStreakDays: number;
    let currentStreakWeeks: number; // MONTHLY 루틴은 월-스트릭을 이 슬롯에 매핑

    if (routine.frequencyType === RoutineFrequencyType.MONTHLY) {
      const targetCount = routine.targetCount ?? 1;
      const dayStreak = calculateScheduledDayStreak(
        routine.startDate,
        today,
        logDates,
        () => true,
        excludedRanges,
      );
      const monthStreak = calculateMonthStreak(
        routine.startDate,
        today,
        targetCount,
        logDates,
        excludedRanges,
      );
      currentStreakDays = dayStreak.currentStreakDays;
      currentStreakWeeks = monthStreak.currentStreakMonths;
    } else if (
      routine.frequencyType === RoutineFrequencyType.WEEKLY &&
      routine.weeklyMode === RoutineWeeklyMode.FIXED_DAYS
    ) {
      const targetDays = Array.isArray(routine.targetDays)
        ? (routine.targetDays as number[])
        : [];
      const isScheduledDay = (date: Date) =>
        isScheduledDayForRoutine(
          {
            frequencyType: routine.frequencyType,
            weeklyMode: routine.weeklyMode,
            targetDays: routine.targetDays,
          },
          date,
        );
      const dayStreak = calculateScheduledDayStreak(
        routine.startDate,
        today,
        logDates,
        isScheduledDay,
        excludedRanges,
      );
      const weekStreak = calculateWeekStreak(
        routine.startDate,
        today,
        targetDays.length,
        logDates,
        excludedRanges,
      );
      currentStreakDays = dayStreak.currentStreakDays;
      currentStreakWeeks = weekStreak.currentStreakWeeks;
    } else {
      // DAILY, WEEKLY/COUNT_ONLY
      const targetCount = routine.targetCount ?? 7;
      const dayStreak = calculateScheduledDayStreak(
        routine.startDate,
        today,
        logDates,
        () => true,
        excludedRanges,
      );
      const weekStreak = calculateWeekStreak(
        routine.startDate,
        today,
        targetCount,
        logDates,
        excludedRanges,
      );
      currentStreakDays = dayStreak.currentStreakDays;
      currentStreakWeeks = weekStreak.currentStreakWeeks;
    }

    const totalChecks = logDates.length;

    const currentValue = (type: BadgeCriteriaType): number => {
      if (type === 'STREAK_DAYS') return currentStreakDays;
      if (type === 'STREAK_WEEKS') return currentStreakWeeks;
      return totalChecks;
    };

    const toAward = candidates.filter(
      (b) => currentValue(b.criteriaType) >= b.criteriaValue,
    );
    if (toAward.length === 0) return [];

    const created = await this.prisma.$transaction(
      toAward.map((badge) =>
        this.prisma.userRoutineBadge.create({
          data: { userId, badgeId: badge.id, routineId },
          include: { badge: true, routine: { select: { title: true } } },
        }),
      ),
    );

    for (const userBadge of created) {
      this.notifyBadgeEarned(userId, userBadge.badge).catch((err) =>
        this.logger.error(`배지 알림 발송 실패: ${err.message}`),
      );
    }

    return created.map((b) => this.toResponse(b));
  }

  private async notifyBadgeEarned(
    userId: string,
    badge: { title: string; iconEmoji: string | null },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const lang = user?.language ?? 'ko';

    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ROUTINE,
      title: this.i18n.t('routine.notification.badge_earned_title', { lang }),
      body: this.i18n.t('routine.notification.badge_earned_body', {
        lang,
        args: { badgeTitle: badge.title, iconEmoji: badge.iconEmoji ?? '' },
      }),
      data: { action: 'view_routine_badge' },
    });
  }

  private toResponse(userBadge: {
    id: string;
    badgeId: string;
    badge: {
      id: string;
      code: string;
      title: string;
      description: string | null;
      iconEmoji: string | null;
      criteriaType: BadgeCriteriaType;
      criteriaValue: number;
    };
    routineId: string | null;
    routine: { title: string } | null;
    earnedAt: Date;
  }) {
    return {
      id: userBadge.id,
      badgeId: userBadge.badgeId,
      badge: userBadge.badge,
      routineId: userBadge.routineId,
      routineTitle: userBadge.routine?.title ?? null,
      earnedAt: userBadge.earnedAt,
    };
  }
}
