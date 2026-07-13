import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum LeaderboardPeriod {
  WEEK = 'week',
  MONTH = 'month',
}

export enum LeaderboardMetric {
  CHECK_COUNT = 'checkCount',
  ACHIEVEMENT_RATE = 'achievementRate',
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
    default: LeaderboardMetric.CHECK_COUNT,
  })
  @IsEnum(LeaderboardMetric)
  metric: LeaderboardMetric = LeaderboardMetric.CHECK_COUNT;
}
