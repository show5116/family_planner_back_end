import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoutineService } from './routine.service';
import {
  HeatmapQueryDto,
  RateQueryDto,
  RoutineRatePeriod,
  OverviewQueryDto,
  OverviewPeriod,
} from './dto/routine-stats-query.dto';
import {
  formatDate,
  getWeekStart,
  calculateWeekStreak,
  calculateScheduledDayStreak,
  calculateAchievementRate,
  calculateMonthStreak,
  calculateMonthlyAchievementRate,
  getThisWeekProgress,
  getThisMonthProgress,
  isScheduledDayForRoutine,
  pauseToDateRange,
  listDays,
  isRoutineActiveOnDate,
  DateRange,
} from './utils/routine-stats.util';
import {
  RoutineFrequencyType,
  RoutineWeeklyMode,
  RoutineStatus,
} from '@/routine/enums';
import { todayInKst, parseDateOnly } from '@/common/utils/date-kst.util';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

@Injectable()
export class RoutineStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routineService: RoutineService,
  ) {}

  async getHeatmap(userId: string, routineId: string, query: HeatmapQueryDto) {
    await this.routineService.findRoutineWithAccess(userId, routineId);

    const from = parseDateOnly(query.from);
    const to = parseDateOnly(query.to);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from은 to보다 이전이어야 합니다');
    }
    if ((to.getTime() - from.getTime()) / MS_PER_DAY > MAX_RANGE_DAYS) {
      throw new BadRequestException('조회 기간은 최대 1년까지 가능합니다');
    }

    const logs = await this.prisma.routineLog.findMany({
      where: { routineId, checkedDate: { gte: from, lte: to } },
      select: { checkedDate: true },
      orderBy: { checkedDate: 'asc' },
    });

    return {
      routineId,
      from: query.from,
      to: query.to,
      checkedDates: logs.map((l) => formatDate(l.checkedDate)),
    };
  }

  async getStreak(userId: string, routineId: string) {
    const routine = await this.routineService.findRoutineWithAccess(
      userId,
      routineId,
    );
    const today = todayInKst();

    const [logs, excludedRanges] = await Promise.all([
      this.prisma.routineLog.findMany({
        where: { routineId },
        select: { checkedDate: true },
      }),
      this.getExcludedRanges(routineId, today),
    ]);
    const logDates = logs.map((l) => l.checkedDate);

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
      const thisMonthProgress = getThisMonthProgress(
        today,
        targetCount,
        logDates,
      );

      return {
        routineId,
        currentStreakWeeks: monthStreak.currentStreakMonths,
        longestStreakWeeks: monthStreak.longestStreakMonths,
        currentStreakDays: dayStreak.currentStreakDays,
        longestStreakDays: dayStreak.longestStreakDays,
        thisWeekProgress: thisMonthProgress,
      };
    }

    const isFixedDays =
      routine.frequencyType === RoutineFrequencyType.WEEKLY &&
      routine.weeklyMode === RoutineWeeklyMode.FIXED_DAYS;
    const targetDays = Array.isArray(routine.targetDays)
      ? (routine.targetDays as number[])
      : [];
    const targetCount = isFixedDays
      ? targetDays.length
      : (routine.targetCount ?? 7);

    const isScheduledDay = (date: Date) =>
      isScheduledDayForRoutine(
        {
          frequencyType: routine.frequencyType,
          weeklyMode: routine.weeklyMode,
          targetDays: routine.targetDays,
        },
        date,
      );

    const weekStreak = calculateWeekStreak(
      routine.startDate,
      today,
      targetCount,
      logDates,
      excludedRanges,
    );
    const dayStreak = calculateScheduledDayStreak(
      routine.startDate,
      today,
      logDates,
      isScheduledDay,
      excludedRanges,
    );
    const thisWeekProgress = getThisWeekProgress(today, targetCount, logDates);

    return {
      routineId,
      currentStreakWeeks: weekStreak.currentStreakWeeks,
      longestStreakWeeks: weekStreak.longestStreakWeeks,
      currentStreakDays: dayStreak.currentStreakDays,
      longestStreakDays: dayStreak.longestStreakDays,
      thisWeekProgress,
    };
  }

  async getRate(userId: string, routineId: string, query: RateQueryDto) {
    const routine = await this.routineService.findRoutineWithAccess(
      userId,
      routineId,
    );
    const today = todayInKst();

    const { from, to } = this.resolveRateRange(query, today);

    const [logs, excludedRanges] = await Promise.all([
      this.prisma.routineLog.findMany({
        where: { routineId, checkedDate: { gte: from, lte: to } },
        select: { checkedDate: true },
      }),
      this.getExcludedRanges(routineId, today),
    ]);

    const isFixedDays =
      routine.frequencyType === RoutineFrequencyType.WEEKLY &&
      routine.weeklyMode === RoutineWeeklyMode.FIXED_DAYS;
    const targetDays = Array.isArray(routine.targetDays)
      ? (routine.targetDays as number[])
      : [];
    const targetCount = isFixedDays
      ? targetDays.length
      : (routine.targetCount ?? 7);

    const result =
      routine.frequencyType === RoutineFrequencyType.MONTHLY
        ? calculateMonthlyAchievementRate(
            from,
            to,
            routine.targetCount ?? 1,
            logs.map((l) => l.checkedDate),
            excludedRanges,
          )
        : calculateAchievementRate(
            from,
            to,
            targetCount,
            logs.map((l) => l.checkedDate),
            excludedRanges,
          );

    return {
      routineId,
      period: query.period,
      from: formatDate(from),
      to: formatDate(to),
      targetCount,
      ...result,
    };
  }

  async getSummary(userId: string) {
    const routines = await this.prisma.routine.findMany({
      where: { userId, deletedAt: null, status: RoutineStatus.ACTIVE },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const today = todayInKst();
    const routineIds = routines.map((r) => r.id);
    const [logs, allPauses] = await Promise.all([
      this.prisma.routineLog.findMany({
        where: { routineId: { in: routineIds } },
        select: { routineId: true, checkedDate: true },
      }),
      this.prisma.routinePause.findMany({
        where: { routineId: { in: routineIds } },
      }),
    ]);

    const logsByRoutine = new Map<string, Date[]>();
    for (const log of logs) {
      const routineLogs = logsByRoutine.get(log.routineId);
      if (routineLogs) {
        routineLogs.push(log.checkedDate);
      } else {
        logsByRoutine.set(log.routineId, [log.checkedDate]);
      }
    }

    const pausesByRoutine = new Map<string, DateRange[]>();
    for (const pause of allPauses) {
      const ranges = pausesByRoutine.get(pause.routineId) ?? [];
      ranges.push(pauseToDateRange(pause, today));
      pausesByRoutine.set(pause.routineId, ranges);
    }

    const todayStr = formatDate(today);

    return {
      routines: routines.map((routine) => {
        const routineLogs = logsByRoutine.get(routine.id) ?? [];
        const excludedRanges = pausesByRoutine.get(routine.id) ?? [];
        const isMonthly =
          routine.frequencyType === RoutineFrequencyType.MONTHLY;
        const isFixedDays =
          routine.frequencyType === RoutineFrequencyType.WEEKLY &&
          routine.weeklyMode === RoutineWeeklyMode.FIXED_DAYS;
        const targetDays = Array.isArray(routine.targetDays)
          ? (routine.targetDays as number[])
          : [];
        const targetCount = isMonthly
          ? (routine.targetCount ?? 1)
          : isFixedDays
            ? targetDays.length
            : (routine.targetCount ?? 7);

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
          routineLogs,
          isScheduledDay,
          excludedRanges,
        );
        const thisWeekProgress = isMonthly
          ? null
          : getThisWeekProgress(today, targetCount, routineLogs);
        const thisMonthProgress = isMonthly
          ? getThisMonthProgress(today, targetCount, routineLogs)
          : null;
        const checkedToday = routineLogs.some(
          (d) => formatDate(d) === todayStr,
        );

        return {
          routineId: routine.id,
          title: routine.title,
          emoji: routine.emoji,
          checkedToday,
          currentStreakDays: dayStreak.currentStreakDays,
          thisWeekProgress,
          thisMonthProgress,
        };
      }),
    };
  }

  /** 전체 루틴 대시보드 요약: 기간 내 총 체크/기대 횟수, 달성률, 날짜별 히트맵 */
  async getOverview(userId: string, query: OverviewQueryDto) {
    const today = todayInKst();
    const { from, to } = this.resolveOverviewRange(query.period, today);

    const routines = await this.prisma.routine.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: [RoutineStatus.ACTIVE, RoutineStatus.PAUSED] },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const routineIds = routines.map((r) => r.id);
    const [logs, allPauses] = await Promise.all([
      this.prisma.routineLog.findMany({
        where: {
          routineId: { in: routineIds },
          checkedDate: { gte: from, lte: to },
        },
        select: { routineId: true, checkedDate: true },
      }),
      this.prisma.routinePause.findMany({
        where: { routineId: { in: routineIds } },
      }),
    ]);

    const logsByRoutine = new Map<string, Date[]>();
    for (const log of logs) {
      const routineLogs = logsByRoutine.get(log.routineId);
      if (routineLogs) {
        routineLogs.push(log.checkedDate);
      } else {
        logsByRoutine.set(log.routineId, [log.checkedDate]);
      }
    }

    const pausesByRoutine = new Map<string, DateRange[]>();
    for (const pause of allPauses) {
      const ranges = pausesByRoutine.get(pause.routineId) ?? [];
      ranges.push(pauseToDateRange(pause, today));
      pausesByRoutine.set(pause.routineId, ranges);
    }

    let totalChecked = 0;
    let totalExpected = 0;

    for (const routine of routines) {
      const routineLogs = logsByRoutine.get(routine.id) ?? [];
      const excludedRanges = pausesByRoutine.get(routine.id) ?? [];
      const isMonthly = routine.frequencyType === RoutineFrequencyType.MONTHLY;
      const isFixedDays =
        routine.frequencyType === RoutineFrequencyType.WEEKLY &&
        routine.weeklyMode === RoutineWeeklyMode.FIXED_DAYS;
      const targetDays = Array.isArray(routine.targetDays)
        ? (routine.targetDays as number[])
        : [];
      const targetCount = isMonthly
        ? (routine.targetCount ?? 1)
        : isFixedDays
          ? targetDays.length
          : (routine.targetCount ?? 7);

      const clippedFrom =
        routine.startDate.getTime() > from.getTime() ? routine.startDate : from;
      const routineEnd = routine.endDate ?? to;
      const clippedTo = routineEnd.getTime() < to.getTime() ? routineEnd : to;

      if (clippedFrom.getTime() <= clippedTo.getTime()) {
        const result = isMonthly
          ? calculateMonthlyAchievementRate(
              clippedFrom,
              clippedTo,
              routine.targetCount ?? 1,
              routineLogs,
              excludedRanges,
            )
          : calculateAchievementRate(
              clippedFrom,
              clippedTo,
              targetCount,
              routineLogs,
              excludedRanges,
            );
        totalExpected += result.expectedCount;
        totalChecked += result.totalChecked;
      }
    }

    const checkedDateSet = new Set(
      logs.map((l) => `${l.routineId}|${formatDate(l.checkedDate)}`),
    );

    const heatmap = listDays(from, to).map((day) => {
      let dayTotalCount = 0;
      let dayCheckedCount = 0;
      const dayStr = formatDate(day);
      for (const routine of routines) {
        const excludedRanges = pausesByRoutine.get(routine.id) ?? [];
        if (isRoutineActiveOnDate(routine, day, excludedRanges)) {
          dayTotalCount += 1;
        }
        if (checkedDateSet.has(`${routine.id}|${dayStr}`)) {
          dayCheckedCount += 1;
        }
      }
      return {
        date: dayStr,
        checkedCount: dayCheckedCount,
        totalCount: dayTotalCount,
      };
    });

    const achievementRate =
      totalExpected > 0
        ? Math.round((totalChecked / totalExpected) * 1000) / 10
        : 0;

    const routineBreakdown =
      query.period === OverviewPeriod.WEEK
        ? routines.map((routine) => {
            const isMonthly =
              routine.frequencyType === RoutineFrequencyType.MONTHLY;
            const isFixedDays =
              routine.frequencyType === RoutineFrequencyType.WEEKLY &&
              routine.weeklyMode === RoutineWeeklyMode.FIXED_DAYS;
            const targetDays = Array.isArray(routine.targetDays)
              ? (routine.targetDays as number[])
              : [];
            const targetCount = isMonthly
              ? null
              : isFixedDays
                ? targetDays.length
                : (routine.targetCount ?? 7);

            const checkedDates = (logsByRoutine.get(routine.id) ?? [])
              .map((d) => formatDate(d))
              .sort();

            return {
              routineId: routine.id,
              title: routine.title,
              emoji: routine.emoji,
              targetCount,
              checkedDates,
            };
          })
        : undefined;

    return {
      period: query.period,
      from: formatDate(from),
      to: formatDate(to),
      totalRoutines: routines.length,
      totalChecked,
      totalExpected,
      achievementRate,
      heatmap,
      ...(routineBreakdown ? { routineBreakdown } : {}),
    };
  }

  private resolveOverviewRange(
    period: OverviewPeriod,
    today: Date,
  ): { from: Date; to: Date } {
    if (period === OverviewPeriod.MONTH) {
      const from = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
      );
      const to = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
      );
      return { from, to: to.getTime() > today.getTime() ? today : to };
    }

    const from = getWeekStart(today);
    const to = new Date(from.getTime() + 6 * MS_PER_DAY);
    return { from, to: to.getTime() > today.getTime() ? today : to };
  }

  private async getExcludedRanges(
    routineId: string,
    today: Date,
  ): Promise<DateRange[]> {
    const pauses = await this.prisma.routinePause.findMany({
      where: { routineId },
    });
    return pauses.map((p) => pauseToDateRange(p, today));
  }

  private resolveRateRange(
    query: RateQueryDto,
    today: Date,
  ): { from: Date; to: Date } {
    if (query.period === RoutineRatePeriod.WEEK) {
      const from = getWeekStart(today);
      const to = new Date(from.getTime() + 6 * MS_PER_DAY);
      return { from, to: to.getTime() > today.getTime() ? today : to };
    }

    if (query.period === RoutineRatePeriod.MONTH) {
      const from = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
      );
      const to = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
      );
      return { from, to: to.getTime() > today.getTime() ? today : to };
    }

    if (!query.from || !query.to) {
      throw new BadRequestException('period=custom일 때 from, to가 필요합니다');
    }
    return { from: parseDateOnly(query.from), to: parseDateOnly(query.to) };
  }
}
