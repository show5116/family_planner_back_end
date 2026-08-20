import { Injectable, BadRequestException } from '@nestjs/common';
import { Routine } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RoutineService } from './routine.service';
import {
  RoutineSettingsService,
  EffectiveDailyGoal,
} from './routine-settings.service';
import { RoutineDailyGoalMode } from './dto/routine-settings.dto';
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

export interface DailyGoalDayStatus {
  date: string;
  checkedCount: number;
  totalCount: number;
  targetCount: number | null;
  goalAchieved: boolean | null;
}

@Injectable()
export class RoutineStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routineService: RoutineService,
    private readonly routineSettingsService: RoutineSettingsService,
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
    const { from, to } = this.resolveOverviewRange(query, today);

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

    const settingsMap =
      await this.routineSettingsService.getEffectiveSettingsMap(
        userId,
        from,
        to,
      );
    const dailyGoalStatuses = this.computeDailyGoalStatus(
      routines,
      logs,
      pausesByRoutine,
      settingsMap,
      from,
      to,
    );

    const heatmap = dailyGoalStatuses.map((s) => ({
      date: s.date,
      checkedCount: s.checkedCount,
      totalCount: s.totalCount,
      goalAchieved: s.goalAchieved,
    }));

    const goalDays = dailyGoalStatuses.filter((s) => s.goalAchieved !== null);
    const goalAchievedDays = goalDays.filter((s) => s.goalAchieved).length;
    const goalTotalDays = goalDays.length;
    const goalAchievementRate =
      goalTotalDays > 0
        ? Math.round((goalAchievedDays / goalTotalDays) * 1000) / 10
        : 0;
    const effectiveAtTo = settingsMap.get(formatDate(to)) ?? {
      dailyGoalMode: RoutineDailyGoalMode.ALL,
      dailyGoalCount: null,
    };

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
      dailyGoalMode: effectiveAtTo.dailyGoalMode,
      dailyGoalCount: effectiveAtTo.dailyGoalCount,
      goalAchievedDays,
      goalTotalDays,
      goalAchievementRate,
    };
  }

  /** 루틴별 로그/일시정지 이력과 일별 유효 목표를 바탕으로 [from,to] 각 날짜의 체크/목표 달성 현황을 계산 */
  private computeDailyGoalStatus(
    routines: Routine[],
    logs: { routineId: string; checkedDate: Date }[],
    pausesByRoutine: Map<string, DateRange[]>,
    settingsMap: Map<string, EffectiveDailyGoal>,
    from: Date,
    to: Date,
  ): DailyGoalDayStatus[] {
    const checkedDateSet = new Set(
      logs.map((l) => `${l.routineId}|${formatDate(l.checkedDate)}`),
    );

    return listDays(from, to).map((day) => {
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

      if (dayTotalCount === 0) {
        return {
          date: dayStr,
          checkedCount: dayCheckedCount,
          totalCount: dayTotalCount,
          targetCount: null,
          goalAchieved: null,
        };
      }

      const effective = settingsMap.get(dayStr) ?? {
        dailyGoalMode: RoutineDailyGoalMode.ALL,
        dailyGoalCount: null,
      };
      const targetCount =
        effective.dailyGoalMode === RoutineDailyGoalMode.COUNT
          ? (effective.dailyGoalCount ?? dayTotalCount)
          : dayTotalCount;
      const goalAchieved = dayCheckedCount >= targetCount;

      return {
        date: dayStr,
        checkedCount: dayCheckedCount,
        totalCount: dayTotalCount,
        targetCount,
        goalAchieved,
      };
    });
  }

  private resolveOverviewRange(
    query: OverviewQueryDto,
    today: Date,
  ): { from: Date; to: Date } {
    if (query.from && query.to) {
      return { from: parseDateOnly(query.from), to: parseDateOnly(query.to) };
    }

    const anchor = query.from ? parseDateOnly(query.from) : today;
    const clampToToday = (to: Date) =>
      to.getTime() > today.getTime() ? today : to;

    if (query.period === OverviewPeriod.MONTH) {
      const from = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
      );
      const to = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
      );
      const isCurrentMonth =
        anchor.getUTCFullYear() === today.getUTCFullYear() &&
        anchor.getUTCMonth() === today.getUTCMonth();
      return { from, to: isCurrentMonth ? clampToToday(to) : to };
    }

    const from = getWeekStart(anchor);
    const to = new Date(from.getTime() + 6 * MS_PER_DAY);
    const isCurrentWeek = getWeekStart(today).getTime() === from.getTime();
    return { from, to: isCurrentWeek ? clampToToday(to) : to };
  }

  /** 일일 목표 기준 전체 연속 달성 스트릭 + 최근 14일 집계(목표 조정 제안용) */
  async getDailyStreak(userId: string) {
    const today = todayInKst();
    const firstEffectiveFrom =
      await this.routineSettingsService.getFirstEffectiveFrom(userId);

    if (!firstEffectiveFrom) {
      return {
        currentStreakDays: 0,
        longestStreakDays: 0,
        todayAchieved: false,
        todayCheckedCount: 0,
        todayTargetCount: 0,
        recent14Days: {
          achievedDays: 0,
          exceededDays: 0,
          totalDays: 0,
          averageCheckedCount: 0,
        },
      };
    }

    const from = firstEffectiveFrom;
    const to = today;

    const routines = await this.prisma.routine.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: [RoutineStatus.ACTIVE, RoutineStatus.PAUSED] },
      },
    });
    const routineIds = routines.map((r) => r.id);

    const [logs, allPauses, settingsMap] = await Promise.all([
      this.prisma.routineLog.findMany({
        where: { userId, checkedDate: { gte: from, lte: to } },
        select: { routineId: true, checkedDate: true },
      }),
      this.prisma.routinePause.findMany({
        where: { routineId: { in: routineIds } },
      }),
      this.routineSettingsService.getEffectiveSettingsMap(userId, from, to),
    ]);

    const pausesByRoutine = new Map<string, DateRange[]>();
    for (const pause of allPauses) {
      const ranges = pausesByRoutine.get(pause.routineId) ?? [];
      ranges.push(pauseToDateRange(pause, today));
      pausesByRoutine.set(pause.routineId, ranges);
    }

    const dailyStatuses = this.computeDailyGoalStatus(
      routines,
      logs,
      pausesByRoutine,
      settingsMap,
      from,
      to,
    );

    let currentStreakDays = 0;
    for (let i = dailyStatuses.length - 1; i >= 0; i -= 1) {
      const status = dailyStatuses[i];
      if (status.goalAchieved === null) continue;
      if (status.date === formatDate(today) && !status.goalAchieved) {
        continue;
      }
      if (status.goalAchieved) {
        currentStreakDays += 1;
      } else {
        break;
      }
    }

    let longestStreakDays = 0;
    let runningStreak = 0;
    for (const status of dailyStatuses) {
      if (status.goalAchieved === null) continue;
      if (status.goalAchieved) {
        runningStreak += 1;
        longestStreakDays = Math.max(longestStreakDays, runningStreak);
      } else {
        runningStreak = 0;
      }
    }

    const todayStatus = dailyStatuses[dailyStatuses.length - 1];
    const todayAchieved = todayStatus?.goalAchieved === true;
    const todayCheckedCount = todayStatus?.checkedCount ?? 0;
    const todayTargetCount = todayStatus?.targetCount ?? 0;

    const recent14 = dailyStatuses
      .slice(-14)
      .filter((s) => s.goalAchieved !== null);
    const achievedDays = recent14.filter((s) => s.goalAchieved).length;
    const exceededDays = recent14.filter(
      (s) => s.targetCount !== null && s.checkedCount > s.targetCount,
    ).length;
    const totalDays = recent14.length;
    const averageCheckedCount =
      totalDays > 0
        ? Math.round(
            (recent14.reduce((sum, s) => sum + s.checkedCount, 0) / totalDays) *
              10,
          ) / 10
        : 0;

    return {
      currentStreakDays,
      longestStreakDays,
      todayAchieved,
      todayCheckedCount,
      todayTargetCount,
      recent14Days: {
        achievedDays,
        exceededDays,
        totalDays,
        averageCheckedCount,
      },
    };
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
