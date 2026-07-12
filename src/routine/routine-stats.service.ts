import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoutineService } from './routine.service';
import {
  HeatmapQueryDto,
  RateQueryDto,
  RoutineRatePeriod,
} from './dto/routine-stats-query.dto';
import {
  formatDate,
  getWeekStart,
  calculateWeekStreak,
  calculateDayStreak,
  calculateAchievementRate,
  getThisWeekProgress,
} from './utils/routine-stats.util';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

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
    const today = todayDateOnly();

    const logs = await this.prisma.routineLog.findMany({
      where: { routineId },
      select: { checkedDate: true },
    });
    const logDates = logs.map((l) => l.checkedDate);

    const targetCount = routine.targetCount ?? 7;
    const weekStreak = calculateWeekStreak(
      routine.startDate,
      today,
      targetCount,
      logDates,
    );
    const dayStreak = calculateDayStreak(logDates, today);
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
    const today = todayDateOnly();

    const { from, to } = this.resolveRateRange(query, today);

    const logs = await this.prisma.routineLog.findMany({
      where: { routineId, checkedDate: { gte: from, lte: to } },
      select: { checkedDate: true },
    });

    const targetCount = routine.targetCount ?? 7;
    const result = calculateAchievementRate(
      from,
      to,
      targetCount,
      logs.map((l) => l.checkedDate),
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
      where: { userId, deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const today = todayDateOnly();
    const routineIds = routines.map((r) => r.id);
    const logs = await this.prisma.routineLog.findMany({
      where: { routineId: { in: routineIds } },
      select: { routineId: true, checkedDate: true },
    });

    const logsByRoutine = new Map<string, Date[]>();
    for (const log of logs) {
      const routineLogs = logsByRoutine.get(log.routineId);
      if (routineLogs) {
        routineLogs.push(log.checkedDate);
      } else {
        logsByRoutine.set(log.routineId, [log.checkedDate]);
      }
    }

    const todayStr = formatDate(today);

    return {
      routines: routines.map((routine) => {
        const routineLogs = logsByRoutine.get(routine.id) ?? [];
        const targetCount = routine.targetCount ?? 7;
        const dayStreak = calculateDayStreak(routineLogs, today);
        const thisWeekProgress = getThisWeekProgress(
          today,
          targetCount,
          routineLogs,
        );
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
        };
      }),
    };
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
