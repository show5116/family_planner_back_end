import { ApiProperty } from '@nestjs/swagger';

export class HeatmapResponseDto {
  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '조회 시작일' })
  from: string;

  @ApiProperty({ description: '조회 종료일' })
  to: string;

  @ApiProperty({
    description: '체크된 날짜 목록 (YYYY-MM-DD)',
    example: ['2026-01-02', '2026-01-03'],
  })
  checkedDates: string[];
}

export class ThisWeekProgressDto {
  @ApiProperty({ description: '이번 주 체크 횟수' })
  checked: number;

  @ApiProperty({ description: '이번 주 목표 횟수' })
  target: number;
}

export class StreakResponseDto {
  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '현재 연속 달성 주 수 (목표 달성 기준)' })
  currentStreakWeeks: number;

  @ApiProperty({ description: '최장 연속 달성 주 수' })
  longestStreakWeeks: number;

  @ApiProperty({ description: '현재 연속 체크 일수' })
  currentStreakDays: number;

  @ApiProperty({ description: '최장 연속 체크 일수' })
  longestStreakDays: number;

  @ApiProperty({ description: '이번 주 진행 상황', type: ThisWeekProgressDto })
  thisWeekProgress: ThisWeekProgressDto;
}

export class RateResponseDto {
  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '기간 단위' })
  period: string;

  @ApiProperty({ description: '조회 시작일' })
  from: string;

  @ApiProperty({ description: '조회 종료일' })
  to: string;

  @ApiProperty({ description: '주 목표 횟수' })
  targetCount: number;

  @ApiProperty({ description: '기간 내 실제 체크 횟수' })
  totalChecked: number;

  @ApiProperty({ description: '기간 내 기대 체크 횟수 (완전한 주 기준)' })
  expectedCount: number;

  @ApiProperty({ description: '달성률 (%)', example: 76.9 })
  achievementRate: number;
}

export class RoutineSummaryItemDto {
  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '루틴 제목' })
  title: string;

  @ApiProperty({ description: '이모지', nullable: true })
  emoji: string | null;

  @ApiProperty({ description: '오늘 체크 여부' })
  checkedToday: boolean;

  @ApiProperty({ description: '현재 연속 체크 일수' })
  currentStreakDays: number;

  @ApiProperty({
    description: '이번 주 진행 상황 (frequencyType=MONTHLY인 루틴은 null)',
    type: ThisWeekProgressDto,
    nullable: true,
  })
  thisWeekProgress: ThisWeekProgressDto | null;

  @ApiProperty({
    description: '이번 달 진행 상황 (frequencyType=MONTHLY인 루틴만 값이 있음)',
    type: ThisWeekProgressDto,
    nullable: true,
  })
  thisMonthProgress: ThisWeekProgressDto | null;
}

export class RoutineSummaryDto {
  @ApiProperty({
    description: '루틴별 오늘/스트릭 요약',
    type: [RoutineSummaryItemDto],
  })
  routines: RoutineSummaryItemDto[];
}
