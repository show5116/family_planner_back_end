import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum LeaderboardPeriod {
  WEEK = 'week',
  MONTH = 'month',
}

export enum LeaderboardMetric {
  GOAL_ACHIEVEMENT_RATE = 'goalAchievementRate',
  GOAL_STREAK_DAYS = 'goalStreakDays',
}

export class LeaderboardQueryDto {
  @ApiProperty({
    description: '집계 기간',
    enum: LeaderboardPeriod,
    default: LeaderboardPeriod.WEEK,
  })
  @IsEnum(LeaderboardPeriod)
  period: LeaderboardPeriod = LeaderboardPeriod.WEEK;

  @ApiProperty({
    description: '정렬 기준',
    enum: LeaderboardMetric,
    default: LeaderboardMetric.GOAL_ACHIEVEMENT_RATE,
  })
  @IsEnum(LeaderboardMetric)
  metric: LeaderboardMetric = LeaderboardMetric.GOAL_ACHIEVEMENT_RATE;
}
