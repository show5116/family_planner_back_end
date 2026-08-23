import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { BadgeCriteriaType, RoutineStatus } from '@/routine/enums';
import {
  computeDailyGoalStatus,
  computeDailyGoalAchievementSummary,
  pauseToDateRange,
  DateRange,
} from './utils/routine-stats.util';
import { RoutineSettingsService } from './routine-settings.service';
import { todayInKst } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineBadgeService {
  private readonly logger = new Logger(RoutineBadgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly i18n: I18nService,
    private readonly routineSettingsService: RoutineSettingsService,
  ) {}

  async findCatalog() {
    return this.prisma.routineBadge.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findMine(userId: string) {
    const badges = await this.prisma.userRoutineBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
    return badges.map((b) => this.toResponse(b));
  }

  /**
   * 일일 목표 달성 기준 배지 판정. 체크된 날짜와 무관하게 항상 [최초 설정일, 오늘] 전체를
   * 재계산해서 판정한다(과거 날짜 백필로 지난 스트릭/완벽한 주가 뒤늦게 바뀌는 경우까지 반영).
   * 실패해도 체크 자체는 성공 처리되도록 호출부에서 에러를 삼킨다.
   */
  async evaluateAndAward(userId: string) {
    const firstEffectiveFrom =
      await this.routineSettingsService.getFirstEffectiveFrom(userId);
    if (!firstEffectiveFrom) return [];

    const [catalog, earned] = await Promise.all([
      this.prisma.routineBadge.findMany({ where: { isActive: true } }),
      this.prisma.userRoutineBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
    ]);

    const earnedBadgeIds = new Set(earned.map((e) => e.badgeId));
    const candidates = catalog.filter((b) => !earnedBadgeIds.has(b.id));
    if (candidates.length === 0) return [];

    const today = todayInKst();
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

    const dailyStatuses = computeDailyGoalStatus(
      routines,
      logs,
      pausesByRoutine,
      settingsMap,
      from,
      to,
    );
    const summary = computeDailyGoalAchievementSummary(dailyStatuses);

    const currentValue = (type: BadgeCriteriaType): number => {
      if (type === 'GOAL_STREAK_DAYS') return summary.currentStreakDays;
      if (type === 'GOAL_TOTAL_DAYS') return summary.totalAchievedDays;
      return summary.perfectWeeksCount; // GOAL_PERFECT_WEEK
    };

    const toAward = candidates.filter(
      (b) => currentValue(b.criteriaType) >= b.criteriaValue,
    );
    if (toAward.length === 0) return [];

    const created = await this.prisma.$transaction(
      toAward.map((badge) =>
        this.prisma.userRoutineBadge.create({
          data: { userId, badgeId: badge.id },
          include: { badge: true },
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
    earnedAt: Date;
  }) {
    return {
      id: userBadge.id,
      badgeId: userBadge.badgeId,
      badge: userBadge.badge,
      earnedAt: userBadge.earnedAt,
    };
  }
}
