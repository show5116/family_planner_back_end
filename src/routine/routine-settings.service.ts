import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UpdateRoutineSettingsDto,
  RoutineDailyGoalMode,
  EffectiveDailyGoal,
} from './dto/routine-settings.dto';
import { formatDate, listDays } from './utils/routine-stats.util';
import { todayInKst } from '@/common/utils/date-kst.util';

export type { EffectiveDailyGoal };

@Injectable()
export class RoutineSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const setting = await this.prisma.routineSetting.findUnique({
      where: { userId },
    });

    return {
      dailyGoalMode: setting?.dailyGoalMode ?? RoutineDailyGoalMode.ALL,
      dailyGoalCount: setting?.dailyGoalCount ?? null,
    };
  }

  async updateSettings(userId: string, dto: UpdateRoutineSettingsDto) {
    const existing = await this.prisma.routineSetting.findUnique({
      where: { userId },
    });

    const nextMode =
      dto.dailyGoalMode ?? existing?.dailyGoalMode ?? RoutineDailyGoalMode.ALL;

    if (nextMode === RoutineDailyGoalMode.COUNT) {
      const countCandidate = dto.dailyGoalCount ?? existing?.dailyGoalCount;
      if (!countCandidate || countCandidate <= 0) {
        throw new BadRequestException(
          'dailyGoalMode=COUNT일 때 dailyGoalCount(1 이상)가 필요합니다',
        );
      }
    }

    const nextCount = dto.dailyGoalCount ?? existing?.dailyGoalCount ?? null;

    const today = todayInKst();

    const [setting] = await this.prisma.$transaction([
      this.prisma.routineSetting.upsert({
        where: { userId },
        update: { dailyGoalMode: nextMode, dailyGoalCount: nextCount },
        create: {
          userId,
          dailyGoalMode: nextMode,
          dailyGoalCount: nextCount,
        },
      }),
      this.prisma.routineSettingHistory.upsert({
        where: { userId_effectiveFrom: { userId, effectiveFrom: today } },
        update: { dailyGoalMode: nextMode, dailyGoalCount: nextCount },
        create: {
          userId,
          dailyGoalMode: nextMode,
          dailyGoalCount: nextCount,
          effectiveFrom: today,
        },
      }),
    ]);

    return {
      dailyGoalMode: setting.dailyGoalMode,
      dailyGoalCount: setting.dailyGoalCount,
    };
  }

  /** [from, to] 범위의 각 날짜(YYYY-MM-DD)에 그날 유효했던 일일 목표 설정을 매핑 */
  async getEffectiveSettingsMap(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Map<string, EffectiveDailyGoal>> {
    const history = await this.prisma.routineSettingHistory.findMany({
      where: { userId, effectiveFrom: { lte: to } },
      orderBy: { effectiveFrom: 'asc' },
    });

    const map = new Map<string, EffectiveDailyGoal>();
    const days = listDays(from, to);

    let historyIndex = 0;
    let current: EffectiveDailyGoal = {
      dailyGoalMode: RoutineDailyGoalMode.ALL,
      dailyGoalCount: null,
    };

    for (const day of days) {
      while (
        historyIndex < history.length &&
        history[historyIndex].effectiveFrom.getTime() <= day.getTime()
      ) {
        current = {
          dailyGoalMode: history[historyIndex]
            .dailyGoalMode as RoutineDailyGoalMode,
          dailyGoalCount: history[historyIndex].dailyGoalCount,
        };
        historyIndex += 1;
      }
      map.set(formatDate(day), current);
    }

    return map;
  }

  /** 사용자가 일일 목표 개념을 처음 도입한 날짜(RoutineSettingHistory 최초 effectiveFrom). 없으면 null */
  async getFirstEffectiveFrom(userId: string): Promise<Date | null> {
    const first = await this.prisma.routineSettingHistory.findFirst({
      where: { userId },
      orderBy: { effectiveFrom: 'asc' },
    });
    return first?.effectiveFrom ?? null;
  }
}
