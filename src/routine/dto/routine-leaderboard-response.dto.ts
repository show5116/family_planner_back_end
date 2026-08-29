import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ description: '순위' })
  rank: number;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 이름' })
  userName: string;

  @ApiProperty({ description: '기간 내 일일 목표 달성일 수' })
  goalAchievedDays: number;

  @ApiProperty({ description: '기간 내 일일 목표 집계 대상일 수' })
  goalTotalDays: number;

  @ApiProperty({ description: '기간 내 일일 목표 달성률 (%)' })
  goalAchievementRate: number;

  @ApiProperty({ description: '현재 연속 달성일 수' })
  currentStreakDays: number;
}

export class LeaderboardResponseDto {
  @ApiProperty({ description: '그룹 ID' })
  groupId: string;

  @ApiProperty({ description: '집계 기간' })
  period: string;

  @ApiProperty({ description: '정렬 기준' })
  metric: string;

  @ApiProperty({ description: '순위 목록', type: [LeaderboardEntryDto] })
  rankings: LeaderboardEntryDto[];
}
