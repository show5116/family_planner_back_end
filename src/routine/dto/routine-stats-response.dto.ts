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

  @ApiProperty({
    description:
      '현재 연속 달성 주 수 (목표 달성 기준). frequencyType=MONTHLY 루틴은 주 단위 연속 개념이 없어 0',
  })
  currentStreakWeeks: number;

  @ApiProperty({
    description:
      '최장 연속 달성 주 수. frequencyType=MONTHLY 루틴은 주 단위 연속 개념이 없어 0',
  })
  longestStreakWeeks: number;

  @ApiProperty({ description: '현재 연속 체크 일수' })
  currentStreakDays: number;

  @ApiProperty({ description: '최장 연속 체크 일수' })
  longestStreakDays: number;

  @ApiProperty({
    description:
      '현재 연속 달성 개월 수 (frequencyType=MONTHLY 루틴 전용). MONTHLY가 아니면 0',
  })
  currentStreakMonths: number;

  @ApiProperty({
    description:
      '최장 연속 달성 개월 수 (frequencyType=MONTHLY 루틴 전용). MONTHLY가 아니면 0',
  })
  longestStreakMonths: number;

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

export class OverviewHeatmapDayDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: '해당 날짜에 체크된 루틴 수' })
  checkedCount: number;

  @ApiProperty({
    description: '해당 날짜에 활성 상태였던(일시정지 제외) 루틴 수',
  })
  totalCount: number;

  @ApiProperty({
    description:
      '해당 날짜의 일일 목표 달성 여부. 그날 대상 습관이 0개면 null(집계 대상 아님)',
    nullable: true,
  })
  goalAchieved: boolean | null;
}

export class OverviewRoutineBreakdownDto {
  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '루틴 제목' })
  title: string;

  @ApiProperty({ description: '이모지', nullable: true })
  emoji: string | null;

  @ApiProperty({
    description:
      '주간 목표 횟수 (WEEKLY/FIXED_DAYS는 targetDays.length, 그 외는 targetCount). MONTHLY 루틴은 주간 목표 개념이 없어 null',
    nullable: true,
  })
  targetCount: number | null;

  @ApiProperty({
    description: '조회 기간(from~to) 내 체크된 날짜 목록 (YYYY-MM-DD)',
    example: ['2026-08-10', '2026-08-11'],
  })
  checkedDates: string[];
}

export class RoutineOverviewDto {
  @ApiProperty({ description: '기간 단위' })
  period: string;

  @ApiProperty({ description: '조회 시작일' })
  from: string;

  @ApiProperty({ description: '조회 종료일' })
  to: string;

  @ApiProperty({ description: '집계 대상 루틴 수 (ACTIVE + PAUSED)' })
  totalRoutines: number;

  @ApiProperty({ description: '기간 내 실제 체크 횟수 합계 (전체 루틴)' })
  totalChecked: number;

  @ApiProperty({ description: '기간 내 기대 체크 횟수 합계 (전체 루틴)' })
  totalExpected: number;

  @ApiProperty({
    description: '달성률 (%), totalChecked / totalExpected',
    example: 81.4,
  })
  achievementRate: number;

  @ApiProperty({
    description: '날짜별 체크 현황 히트맵 (period와 동일한 기간)',
    type: [OverviewHeatmapDayDto],
  })
  heatmap: OverviewHeatmapDayDto[];

  @ApiProperty({
    description:
      '루틴별 체크 현황 (period=week일 때만 존재, month일 때는 필드 생략)',
    type: [OverviewRoutineBreakdownDto],
    required: false,
  })
  routineBreakdown?: OverviewRoutineBreakdownDto[];

  @ApiProperty({
    description: '조회 기간 마지막 날(to) 기준 유효했던 일일 목표 모드',
  })
  dailyGoalMode: string;

  @ApiProperty({
    description:
      '조회 기간 마지막 날(to) 기준 유효했던 일일 목표 개수 (ALL 모드면 null)',
    nullable: true,
  })
  dailyGoalCount: number | null;

  @ApiProperty({ description: '기간 내 일일 목표를 달성한 날 수' })
  goalAchievedDays: number;

  @ApiProperty({
    description:
      '기간 내 집계 대상 일수 (대상 습관이 0개였던 날 제외, 진행 중인 기간은 오늘까지의 경과 일수)',
  })
  goalTotalDays: number;

  @ApiProperty({
    description: '일일 목표 달성률 (%), goalAchievedDays / goalTotalDays',
    example: 71.4,
  })
  goalAchievementRate: number;
}

export class DailyStreakRecent14DaysDto {
  @ApiProperty({ description: '최근 14일 중 목표를 달성한 날 수' })
  achievedDays: number;

  @ApiProperty({ description: '최근 14일 중 목표를 초과 달성한 날 수' })
  exceededDays: number;

  @ApiProperty({
    description: '최근 14일 중 집계 대상 일수 (대상 습관 0개였던 날 제외)',
  })
  totalDays: number;

  @ApiProperty({ description: '집계 대상일들의 하루 평균 체크 개수' })
  averageCheckedCount: number;
}

export class DailyStreakResponseDto {
  @ApiProperty({ description: '오늘(또는 어제)까지 이어지는 연속 달성 일수' })
  currentStreakDays: number;

  @ApiProperty({ description: '역대 최장 연속 달성 일수' })
  longestStreakDays: number;

  @ApiProperty({ description: '오늘 목표 달성 여부' })
  todayAchieved: boolean;

  @ApiProperty({ description: '오늘 체크한 습관 수' })
  todayCheckedCount: number;

  @ApiProperty({
    description: '오늘 기준 목표 개수 (ALL 모드면 오늘 대상 습관 수)',
  })
  todayTargetCount: number;

  @ApiProperty({
    description: '최근 14일 집계 (목표 조정 제안용)',
    type: DailyStreakRecent14DaysDto,
  })
  recent14Days: DailyStreakRecent14DaysDto;
}
