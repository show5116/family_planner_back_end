import { Injectable, ForbiddenException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import {
  LeaderboardQueryDto,
  LeaderboardMetric,
  LeaderboardPeriod,
} from './dto/routine-leaderboard-query.dto';
import {
  computeDailyGoalStatus,
  computeDailyGoalAchievementSummary,
  pauseToDateRange,
  getWeekStart,
  formatDate,
  DateRange,
} from './utils/routine-stats.util';
import { RoutineSettingsService } from './routine-settings.service';
import { RoutineStatus } from '@/routine/enums';
import { todayInKst } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineLeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly routineSettingsService: RoutineSettingsService,
  ) {}

  private t(key: string) {
    return this.i18n.t(`routine.${key}`, {
      lang: I18nContext.current()?.lang ?? 'ko',
    });
  }

  async getLeaderboard(
    userId: string,
    groupId: string,
    query: LeaderboardQueryDto,
  ) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new ForbiddenException(this.t('errors.no_group_access'));
    }

    const today = todayInKst();
    const { from, to } = this.resolveRange(query.period, today);

    const shares = await this.prisma.routineGroupShare.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const sharedUserIds = shares.map((s) => s.userId);
    if (sharedUserIds.length === 0) {
      return {
        groupId,
        period: query.period,
        metric: query.metric,
        rankings: [],
      };
    }

    const owners = await this.prisma.user.findMany({
      where: { id: { in: sharedUserIds } },
      select: { id: true, name: true },
    });
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    interface Entry {
      userId: string;
      userName: string;
      goalAchievedDays: number;
      goalTotalDays: number;
      goalAchievementRate: number;
      currentStreakDays: number;
    }
    const entries: Entry[] = [];

    for (const targetUserId of sharedUserIds) {
      const owner = ownerMap.get(targetUserId);
      if (!owner) continue;

      const firstEffectiveFrom =
        await this.routineSettingsService.getFirstEffectiveFrom(targetUserId);
      if (!firstEffectiveFrom) continue;

      const rangeFrom =
        firstEffectiveFrom.getTime() < from.getTime()
          ? firstEffectiveFrom
          : from;
      const rangeTo = today;

      const routines = await this.prisma.routine.findMany({
        where: {
          userId: targetUserId,
          deletedAt: null,
          isPrivate: false,
          status: { in: [RoutineStatus.ACTIVE, RoutineStatus.PAUSED] },
        },
      });
      const routineIds = routines.map((r) => r.id);

      const [logs, pauses, settingsMap] = await Promise.all([
        this.prisma.routineLog.findMany({
          where: {
            routineId: { in: routineIds },
            checkedDate: { gte: rangeFrom, lte: rangeTo },
          },
          select: { routineId: true, checkedDate: true },
        }),
        this.prisma.routinePause.findMany({
          where: { routineId: { in: routineIds } },
        }),
        this.routineSettingsService.getEffectiveSettingsMap(
          targetUserId,
          rangeFrom,
          rangeTo,
        ),
      ]);

      const pausesByRoutine = new Map<string, DateRange[]>();
      for (const pause of pauses) {
        const ranges = pausesByRoutine.get(pause.routineId) ?? [];
        ranges.push(pauseToDateRange(pause, today));
        pausesByRoutine.set(pause.routineId, ranges);
      }

      const dailyStatuses = computeDailyGoalStatus(
        routines,
        logs,
        pausesByRoutine,
        settingsMap,
        rangeFrom,
        rangeTo,
      );

      const { currentStreakDays } =
        computeDailyGoalAchievementSummary(dailyStatuses);

      const periodStatuses = dailyStatuses.filter(
        (s) => s.date >= formatDate(from) && s.date <= formatDate(to),
      );
      const goalDays = periodStatuses.filter((s) => s.goalAchieved !== null);
      const goalAchievedDays = goalDays.filter((s) => s.goalAchieved).length;
      const goalTotalDays = goalDays.length;
      const goalAchievementRate =
        goalTotalDays > 0
          ? Math.round((goalAchievedDays / goalTotalDays) * 1000) / 10
          : 0;

      entries.push({
        userId: owner.id,
        userName: owner.name,
        goalAchievedDays,
        goalTotalDays,
        goalAchievementRate,
        currentStreakDays,
      });
    }

    entries.sort((a, b) =>
      query.metric === LeaderboardMetric.GOAL_STREAK_DAYS
        ? b.currentStreakDays - a.currentStreakDays
        : b.goalAchievementRate - a.goalAchievementRate,
    );

    return {
      groupId,
      period: query.period,
      metric: query.metric,
      rankings: entries.map((entry, index) => ({ rank: index + 1, ...entry })),
    };
  }

  private resolveRange(
    period: LeaderboardPeriod,
    today: Date,
  ): { from: Date; to: Date } {
    if (period === LeaderboardPeriod.MONTH) {
      const from = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
      );
      return { from, to: today };
    }
    return { from: getWeekStart(today), to: today };
  }
}
