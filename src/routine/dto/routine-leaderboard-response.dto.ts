import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ description: '순위' })
  rank: number;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 이름' })
  userName: string;

  @ApiProperty({ description: '기간 내 체크 횟수' })
  checkCount: number;

  @ApiProperty({ description: '기간 내 평균 달성률 (%)' })
  achievementRate: number;
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
