import { Injectable, ForbiddenException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import {
  LeaderboardQueryDto,
  LeaderboardMetric,
  LeaderboardPeriod,
} from './dto/routine-leaderboard-query.dto';
import {
  getWeekStart,
  calculateAchievementRate,
} from './utils/routine-stats.util';

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

@Injectable()
export class RoutineLeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
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

    const today = todayDateOnly();
    const { from, to } = this.resolveRange(query.period, today);

    const shares = await this.prisma.routineShare.findMany({
      where: { groupId, routine: { deletedAt: null } },
      include: {
        routine: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    const routineIds = shares.map((s) => s.routineId);
    const logs = await this.prisma.routineLog.findMany({
      where: {
        routineId: { in: routineIds },
        checkedDate: { gte: from, lte: to },
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

    interface UserAgg {
      userId: string;
      userName: string;
      checkCount: number;
      rateSum: number;
      routineCount: number;
    }
    const userMap = new Map<string, UserAgg>();

    for (const share of shares) {
      const routine = share.routine;
      const owner = routine.user;
      const routineLogs = logsByRoutine.get(routine.id) ?? [];
      const targetCount = routine.targetCount ?? 7;
      const rate = calculateAchievementRate(
        from,
        to,
        targetCount,
        routineLogs,
      ).achievementRate;

      let agg = userMap.get(owner.id);
      if (!agg) {
        agg = {
          userId: owner.id,
          userName: owner.name,
          checkCount: 0,
          rateSum: 0,
          routineCount: 0,
        };
        userMap.set(owner.id, agg);
      }
      agg.checkCount += routineLogs.length;
      agg.rateSum += rate;
      agg.routineCount += 1;
    }

    const entries = Array.from(userMap.values()).map((agg) => ({
      userId: agg.userId,
      userName: agg.userName,
      checkCount: agg.checkCount,
      achievementRate:
        agg.routineCount > 0
          ? Math.round((agg.rateSum / agg.routineCount) * 10) / 10
          : 0,
    }));

    entries.sort((a, b) =>
      query.metric === LeaderboardMetric.ACHIEVEMENT_RATE
        ? b.achievementRate - a.achievementRate
        : b.checkCount - a.checkCount,
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
