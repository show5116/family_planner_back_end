import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { RoutineStatsService } from './routine-stats.service';
import { RoutineSettingsService } from './routine-settings.service';
import { RoutineBadgeService } from './routine-badge.service';
import { RoutineLeaderboardService } from './routine-leaderboard.service';
import { RoutineGroupService } from './routine-group.service';
import { RoutineCategoryService } from './routine-category.service';
import { RoutineChallengeService } from './routine-challenge.service';
import { RoutineReminderScheduler } from './routine-reminder.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [RoutineController],
  providers: [
    RoutineService,
    RoutineStatsService,
    RoutineSettingsService,
    RoutineBadgeService,
    RoutineLeaderboardService,
    RoutineGroupService,
    RoutineCategoryService,
    RoutineChallengeService,
    RoutineReminderScheduler,
  ],
  exports: [RoutineService],
})
export class RoutineModule {}
