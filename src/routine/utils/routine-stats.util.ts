import { Routine } from '@prisma/client';
import {
  RoutineDailyGoalMode,
  EffectiveDailyGoal,
} from '../dto/routine-settings.dto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function formatDate(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10);
}

/**
 * 일시정지 등으로 스트릭 계산에서 제외할 날짜 구간.
 * from(일시정지 시작일)은 포함, to(재개일 = 다시 활성화된 날)는 미포함 — 재개 당일부터는 정상적으로 카운트된다.
 */
export interface DateRange {
  from: Date;
  to: Date;
}

export function isExcluded(date: Date, excludedRanges: DateRange[]): boolean {
  const t = toDateOnly(date).getTime();
  return excludedRanges.some(
    (r) => t >= toDateOnly(r.from).getTime() && t < toDateOnly(r.to).getTime(),
  );
}

/**
 * RoutinePause 레코드를 DateRange로 변환. 아직 재개하지 않은(pausedTo=null) 진행 중인
 * 일시정지는 "오늘도 아직 제외 구간"이므로 today의 다음 날을 배타적 상한으로 사용한다.
 */
export function pauseToDateRange(
  pause: { pausedFrom: Date; pausedTo: Date | null },
  today: Date,
): DateRange {
  if (pause.pausedTo) {
    return { from: pause.pausedFrom, to: pause.pausedTo };
  }
  const tomorrow = new Date(toDateOnly(today).getTime() + MS_PER_DAY);
  return { from: pause.pausedFrom, to: tomorrow };
}

/** 월요일 시작 ISO 주의 월요일 날짜를 반환 */
export function getWeekStart(date: Date): Date {
  const d = toDateOnly(date);
  const day = d.getUTCDay(); // 0(일)~6(토)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(d.getTime() + diffToMonday * MS_PER_DAY);
}

/** 주 시작일 문자열(YYYY-MM-DD)을 키로 사용해 로그를 주 단위로 그룹핑 */
export function groupDatesByWeek(dates: Date[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const date of dates) {
    const weekKey = formatDate(getWeekStart(date));
    map.set(weekKey, (map.get(weekKey) ?? 0) + 1);
  }
  return map;
}

/** [from, to] 사이에 포함된 모든 "주 시작일(월요일)" 목록을 오름차순으로 반환 */
export function listWeekStarts(from: Date, to: Date): Date[] {
  const weeks: Date[] = [];
  let cursor = getWeekStart(from);
  const lastWeekStart = getWeekStart(to);
  while (cursor.getTime() <= lastWeekStart.getTime()) {
    weeks.push(cursor);
    cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY);
  }
  return weeks;
}

/** [from, to] 사이 모든 날짜(하루 단위)를 오름차순으로 반환. from > to면 빈 배열. */
export function listDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const fromOnly = toDateOnly(from);
  const toOnly = toDateOnly(to);
  for (
    let cursor = fromOnly;
    cursor.getTime() <= toOnly.getTime();
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  ) {
    days.push(cursor);
  }
  return days;
}

export interface RoutineActiveWindow {
  startDate: Date;
  endDate: Date | null;
}

/**
 * 해당 캘린더 날짜에 루틴이 "활성 상태"인지 판단.
 * - date가 startDate 이전이거나 endDate(있다면) 이후면 false (아직 시작 전 / 이미 종료 후)
 * - excludedRanges(RoutinePause 이력)에 포함된 날짜(일시정지 중)면 false
 */
export function isRoutineActiveOnDate(
  routine: RoutineActiveWindow,
  date: Date,
  excludedRanges: DateRange[],
): boolean {
  const d = toDateOnly(date).getTime();
  const start = toDateOnly(routine.startDate).getTime();
  if (d < start) return false;
  if (routine.endDate !== null) {
    const end = toDateOnly(routine.endDate).getTime();
    if (d > end) return false;
  }
  return !isExcluded(date, excludedRanges);
}

/** 해당 주(월~일)가 통째로 제외 구간에 포함되는지 확인 */
function isWeekExcluded(weekStart: Date, excludedRanges: DateRange[]): boolean {
  if (excludedRanges.length === 0) return false;
  const weekEnd = new Date(weekStart.getTime() + 6 * MS_PER_DAY);
  for (
    let cursor = weekStart;
    cursor.getTime() <= weekEnd.getTime();
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  ) {
    if (!isExcluded(cursor, excludedRanges)) return false;
  }
  return true;
}

export interface WeekStreakResult {
  currentStreakWeeks: number;
  longestStreakWeeks: number;
}

/**
 * 시작일부터 현재까지 "주 목표 달성"이 연속된 주 수를 계산.
 * 이번 주는 아직 진행 중이므로 currentStreakWeeks 계산에서 제외한다.
 * excludedRanges(일시정지 구간)에 완전히 포함된 주는 "미스"로 세지 않고 건너뛴다(스트릭 유지).
 */
export function calculateWeekStreak(
  startDate: Date,
  today: Date,
  targetCount: number,
  logDates: Date[],
  excludedRanges: DateRange[] = [],
): WeekStreakResult {
  const weekCounts = groupDatesByWeek(logDates);
  const currentWeekStart = getWeekStart(today);
  const startWeekStart = getWeekStart(startDate);

  if (startWeekStart.getTime() >= currentWeekStart.getTime()) {
    return { currentStreakWeeks: 0, longestStreakWeeks: 0 };
  }

  const pastWeekStart = new Date(currentWeekStart.getTime() - 7 * MS_PER_DAY);
  const weeks = listWeekStarts(startWeekStart, pastWeekStart);

  let longest = 0;
  let running = 0;
  for (const week of weeks) {
    if (isWeekExcluded(week, excludedRanges)) continue;
    const count = weekCounts.get(formatDate(week)) ?? 0;
    if (count >= targetCount) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    if (isWeekExcluded(weeks[i], excludedRanges)) continue;
    const count = weekCounts.get(formatDate(weeks[i])) ?? 0;
    if (count >= targetCount) {
      current += 1;
    } else {
      break;
    }
  }

  return { currentStreakWeeks: current, longestStreakWeeks: longest };
}

export interface DayStreakResult {
  currentStreakDays: number;
  longestStreakDays: number;
}

/** 체크된 날짜 목록으로부터 연속 체크일(스트릭)을 계산. 오늘 미체크 시 currentStreakDays는 어제까지 기준으로 계산 */
export function calculateDayStreak(
  logDates: Date[],
  today: Date,
  excludedRanges: DateRange[] = [],
): DayStreakResult {
  return calculateScheduledDayStreak(
    // startDate는 day-streak 계산에서 직접 쓰이지 않으므로(logDates 기반) 임의의 과거일로 대체
    new Date(0),
    today,
    logDates,
    () => true,
    excludedRanges,
  );
}

/**
 * 요일 스케줄(FIXED_DAYS)과 일시정지 구간을 인지하는 day streak 계산.
 * isScheduledDay: 해당 캘린더 날짜가 "체크가 요구되는 날"인지 판단하는 predicate.
 *   - DAILY 등 매일 스케줄: () => true
 *   - WEEKLY/FIXED_DAYS: targetDays(0=일~6=토)에 포함된 요일만 true
 * 스케줄되지 않은 날과 일시정지 구간에 속한 날은 "미스"로 계산하지 않고 건너뛴다.
 */
export function calculateScheduledDayStreak(
  startDate: Date,
  today: Date,
  logDates: Date[],
  isScheduledDay: (date: Date) => boolean,
  excludedRanges: DateRange[] = [],
): DayStreakResult {
  if (logDates.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  const checkedSet = new Set(logDates.map((d) => formatDate(d)));
  const todayOnly = toDateOnly(today);

  // 가장 이른 체크일부터 오늘까지 하루씩 순회하며 "스케줄된 날"만 평가 대상으로 삼는다.
  const firstCheckedStr = Array.from(checkedSet).sort()[0];
  const cursorStart = new Date(`${firstCheckedStr}T00:00:00.000Z`);

  let longest = 0;
  let running = 0;
  const scheduledDayResults: boolean[] = [];

  for (
    let cursor = cursorStart;
    cursor.getTime() <= todayOnly.getTime();
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  ) {
    if (isExcluded(cursor, excludedRanges)) continue;
    if (!isScheduledDay(cursor)) continue;

    const checked = checkedSet.has(formatDate(cursor));
    scheduledDayResults.push(checked);
    if (checked) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  // currentStreakDays: 마지막 스케줄일부터 역순으로 연속 체크된 날 수.
  // 단, 오늘이 스케줄일인데 아직 미체크라면 "어제까지" 기준으로 봐야 하므로
  // scheduledDayResults의 끝에서부터 훑되 오늘 미체크는 0 취급하지 않고 그 앞(어제)부터 판단한다.
  let current = 0;
  const todayScheduled =
    isScheduledDay(todayOnly) && !isExcluded(todayOnly, excludedRanges);
  const todayChecked = checkedSet.has(formatDate(todayOnly));

  let idx = scheduledDayResults.length - 1;
  if (todayScheduled && !todayChecked) {
    // 오늘 스케줄일인데 미체크면 오늘을 제외하고 어제부터 카운트
    idx -= 1;
  }
  for (; idx >= 0; idx -= 1) {
    if (scheduledDayResults[idx]) {
      current += 1;
    } else {
      break;
    }
  }

  return { currentStreakDays: current, longestStreakDays: longest };
}

export interface RateResult {
  totalChecked: number;
  expectedCount: number;
  achievementRate: number;
}

/**
 * [from, to] 범위와 겹치는 모든 주(월~일 기준)를 대상으로 달성률을 계산.
 * 진행 중인 주(이번 주 등 to가 주 중간인 경우)도 포함하되, 기대치는 항상 주당 targetCount로 고정한다.
 * (예: "이번 주 진행률"처럼 부분 주 조회도 의미 있는 값을 반환해야 하므로 완전한 주만 인정하지 않는다.)
 * excludedRanges에 완전히 포함된 주는 기대치/실적 계산에서 모두 제외한다.
 */
export function calculateAchievementRate(
  from: Date,
  to: Date,
  targetCount: number,
  logDates: Date[],
  excludedRanges: DateRange[] = [],
): RateResult {
  const weekCounts = groupDatesByWeek(logDates);
  const fromWeekStart = getWeekStart(from);
  const toWeekStart = getWeekStart(to);

  const overlappingWeeks = listWeekStarts(fromWeekStart, toWeekStart).filter(
    (week) => !isWeekExcluded(week, excludedRanges),
  );

  const expectedCount = overlappingWeeks.length * targetCount;
  const totalChecked = overlappingWeeks.reduce(
    (sum, week) => sum + (weekCounts.get(formatDate(week)) ?? 0),
    0,
  );

  const achievementRate =
    expectedCount > 0
      ? Math.round((totalChecked / expectedCount) * 1000) / 10
      : 0;

  return { totalChecked, expectedCount, achievementRate };
}

export function getThisWeekProgress(
  today: Date,
  targetCount: number,
  logDates: Date[],
): { checked: number; target: number } {
  const weekCounts = groupDatesByWeek(logDates);
  const checked = weekCounts.get(formatDate(getWeekStart(today))) ?? 0;
  return { checked, target: targetCount };
}

// ============================================================
// 월 단위 통계 (MONTHLY frequencyType 전용)
// ============================================================

/** 월 시작일(1일)을 반환 */
export function getMonthStart(date: Date): Date {
  const d = toDateOnly(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

/** [from, to] 사이 모든 "월 시작일(1일)" 목록을 오름차순으로 반환 */
export function listMonthStarts(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  let cursor = getMonthStart(from);
  const lastMonthStart = getMonthStart(to);
  while (cursor.getTime() <= lastMonthStart.getTime()) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function formatMonth(date: Date): string {
  return formatDate(date).slice(0, 7); // 'YYYY-MM'
}

/** 해당 월이 통째로 제외 구간에 포함되는지 확인 */
function isMonthExcluded(
  monthStart: Date,
  excludedRanges: DateRange[],
): boolean {
  if (excludedRanges.length === 0) return false;
  const monthEnd = new Date(addMonths(monthStart, 1).getTime() - MS_PER_DAY);
  for (
    let cursor = monthStart;
    cursor.getTime() <= monthEnd.getTime();
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  ) {
    if (!isExcluded(cursor, excludedRanges)) return false;
  }
  return true;
}

/** 월 시작일 문자열(YYYY-MM)을 키로 사용해 로그를 월 단위로 그룹핑 */
export function groupDatesByMonth(dates: Date[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const date of dates) {
    const monthKey = formatMonth(date);
    map.set(monthKey, (map.get(monthKey) ?? 0) + 1);
  }
  return map;
}

export interface MonthStreakResult {
  currentStreakMonths: number;
  longestStreakMonths: number;
}

/**
 * 월별 목표 달성 연속 개월 수 계산. calculateWeekStreak과 동일한 구조이나 월 단위.
 * 일시정지된 달은 통째로 스킵(성공/실패 어느 쪽으로도 세지 않음)한다.
 */
export function calculateMonthStreak(
  startDate: Date,
  today: Date,
  targetCount: number,
  logDates: Date[],
  excludedRanges: DateRange[] = [],
): MonthStreakResult {
  const monthCounts = groupDatesByMonth(logDates);
  const currentMonthStart = getMonthStart(today);
  const startMonthStart = getMonthStart(startDate);

  if (startMonthStart.getTime() >= currentMonthStart.getTime()) {
    return { currentStreakMonths: 0, longestStreakMonths: 0 };
  }

  const pastMonthStart = addMonths(currentMonthStart, -1);
  const months = listMonthStarts(startMonthStart, pastMonthStart);

  let longest = 0;
  let running = 0;
  for (const month of months) {
    if (isMonthExcluded(month, excludedRanges)) continue;
    const count = monthCounts.get(formatMonth(month)) ?? 0;
    if (count >= targetCount) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = months.length - 1; i >= 0; i -= 1) {
    if (isMonthExcluded(months[i], excludedRanges)) continue;
    const count = monthCounts.get(formatMonth(months[i])) ?? 0;
    if (count >= targetCount) {
      current += 1;
    } else {
      break;
    }
  }

  return { currentStreakMonths: current, longestStreakMonths: longest };
}

/** [from, to] 범위와 겹치는 모든 월을 대상으로 달성률을 계산 (calculateAchievementRate의 월 버전) */
export function calculateMonthlyAchievementRate(
  from: Date,
  to: Date,
  targetCount: number,
  logDates: Date[],
  excludedRanges: DateRange[] = [],
): RateResult {
  const monthCounts = groupDatesByMonth(logDates);
  const fromMonthStart = getMonthStart(from);
  const toMonthStart = getMonthStart(to);

  const overlappingMonths = listMonthStarts(
    fromMonthStart,
    toMonthStart,
  ).filter((month) => !isMonthExcluded(month, excludedRanges));

  const expectedCount = overlappingMonths.length * targetCount;
  const totalChecked = overlappingMonths.reduce(
    (sum, month) => sum + (monthCounts.get(formatMonth(month)) ?? 0),
    0,
  );

  const achievementRate =
    expectedCount > 0
      ? Math.round((totalChecked / expectedCount) * 1000) / 10
      : 0;

  return { totalChecked, expectedCount, achievementRate };
}

export function getThisMonthProgress(
  today: Date,
  targetCount: number,
  logDates: Date[],
): { checked: number; target: number } {
  const monthCounts = groupDatesByMonth(logDates);
  const checked = monthCounts.get(formatMonth(getMonthStart(today))) ?? 0;
  return { checked, target: targetCount };
}

// ============================================================
// 반복 주기별 "오늘이 스케줄된 날인가" 판정
// ============================================================

export interface RoutineFrequencyInfo {
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  weeklyMode: 'COUNT_ONLY' | 'FIXED_DAYS' | null;
  targetDays: unknown;
}

/**
 * DAILY/WEEKLY-COUNT_ONLY는 항상 true(매일이 스케줄일), WEEKLY-FIXED_DAYS는
 * targetDays(0=일~6=토 배열) 포함 여부로 판단. MONTHLY는 요일 스케줄 개념이 없으므로 항상 true.
 */
export function isScheduledDayForRoutine(
  routine: RoutineFrequencyInfo,
  date: Date,
): boolean {
  if (
    routine.frequencyType === 'WEEKLY' &&
    routine.weeklyMode === 'FIXED_DAYS'
  ) {
    const targetDays = Array.isArray(routine.targetDays)
      ? (routine.targetDays as number[])
      : [];
    return targetDays.includes(toDateOnly(date).getUTCDay());
  }
  return true;
}

// ============================================================
// 일일 목표(daily goal) 달성 현황 계산
// ============================================================

export interface DailyGoalDayStatus {
  date: string;
  checkedCount: number;
  totalCount: number;
  targetCount: number | null;
  goalAchieved: boolean | null;
}

/** 루틴별 로그/일시정지 이력과 일별 유효 목표를 바탕으로 [from,to] 각 날짜의 체크/목표 달성 현황을 계산 */
export function computeDailyGoalStatus(
  routines: Routine[],
  logs: { routineId: string; checkedDate: Date }[],
  pausesByRoutine: Map<string, DateRange[]>,
  settingsMap: Map<string, EffectiveDailyGoal>,
  from: Date,
  to: Date,
): DailyGoalDayStatus[] {
  const checkedDateSet = new Set(
    logs.map((l) => `${l.routineId}|${formatDate(l.checkedDate)}`),
  );

  return listDays(from, to).map((day) => {
    let dayTotalCount = 0;
    let dayCheckedCount = 0;
    const dayStr = formatDate(day);
    for (const routine of routines) {
      if (!routine.includeInDailyGoal) continue;
      const excludedRanges = pausesByRoutine.get(routine.id) ?? [];
      if (isRoutineActiveOnDate(routine, day, excludedRanges)) {
        dayTotalCount += 1;
      }
      if (checkedDateSet.has(`${routine.id}|${dayStr}`)) {
        dayCheckedCount += 1;
      }
    }

    if (dayTotalCount === 0) {
      return {
        date: dayStr,
        checkedCount: dayCheckedCount,
        totalCount: dayTotalCount,
        targetCount: null,
        goalAchieved: null,
      };
    }

    const effective = settingsMap.get(dayStr) ?? {
      dailyGoalMode: RoutineDailyGoalMode.ALL,
      dailyGoalCount: null,
    };
    const targetCount =
      effective.dailyGoalMode === RoutineDailyGoalMode.COUNT
        ? (effective.dailyGoalCount ?? dayTotalCount)
        : dayTotalCount;
    const goalAchieved = dayCheckedCount >= targetCount;

    return {
      date: dayStr,
      checkedCount: dayCheckedCount,
      totalCount: dayTotalCount,
      targetCount,
      goalAchieved,
    };
  });
}

export interface DailyGoalAchievementSummary {
  currentStreakDays: number;
  longestStreakDays: number;
  totalAchievedDays: number;
  perfectWeeksCount: number;
}

/**
 * 일별 목표 달성 현황(computeDailyGoalStatus 결과)으로부터 배지/스트릭 판정에 필요한 요약 지표를 계산.
 * - currentStreakDays: 오늘 미달성은 건너뛰고 어제까지 기준(자정이 지나야 끊김), goalAchieved=null(대상 0개)인 날은 스킵.
 * - totalAchievedDays: 전체 구간 중 목표를 달성한 날의 누적 수.
 * - perfectWeeksCount: 월~일 7일 전부가 goalAchieved=true인 주의 수. 구간 경계에 걸려 7일 미만만
 *   포함된 주(도입 시점이 주 중간이거나 이번 주가 아직 안 끝난 경우)는 그룹 크기가 7 미만이라 자동 제외.
 */
export function computeDailyGoalAchievementSummary(
  dailyStatuses: DailyGoalDayStatus[],
): DailyGoalAchievementSummary {
  let currentStreakDays = 0;
  for (let i = dailyStatuses.length - 1; i >= 0; i -= 1) {
    const status = dailyStatuses[i];
    if (status.goalAchieved === null) continue;
    if (i === dailyStatuses.length - 1 && !status.goalAchieved) {
      continue;
    }
    if (status.goalAchieved) {
      currentStreakDays += 1;
    } else {
      break;
    }
  }

  let longestStreakDays = 0;
  let runningStreak = 0;
  for (const status of dailyStatuses) {
    if (status.goalAchieved === null) continue;
    if (status.goalAchieved) {
      runningStreak += 1;
      longestStreakDays = Math.max(longestStreakDays, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  const totalAchievedDays = dailyStatuses.filter(
    (s) => s.goalAchieved === true,
  ).length;

  const weekGroups = new Map<string, DailyGoalDayStatus[]>();
  for (const status of dailyStatuses) {
    const weekKey = formatDate(
      getWeekStart(new Date(`${status.date}T00:00:00.000Z`)),
    );
    const group = weekGroups.get(weekKey) ?? [];
    group.push(status);
    weekGroups.set(weekKey, group);
  }
  let perfectWeeksCount = 0;
  for (const group of weekGroups.values()) {
    if (group.length === 7 && group.every((s) => s.goalAchieved === true)) {
      perfectWeeksCount += 1;
    }
  }

  return {
    currentStreakDays,
    longestStreakDays,
    totalAchievedDays,
    perfectWeeksCount,
  };
}
