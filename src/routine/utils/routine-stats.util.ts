const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function formatDate(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10);
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

export interface WeekStreakResult {
  currentStreakWeeks: number;
  longestStreakWeeks: number;
}

/**
 * 시작일부터 현재까지 "주 목표 달성"이 연속된 주 수를 계산.
 * 이번 주는 아직 진행 중이므로 currentStreakWeeks 계산에서 제외한다.
 */
export function calculateWeekStreak(
  startDate: Date,
  today: Date,
  targetCount: number,
  logDates: Date[],
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
): DayStreakResult {
  if (logDates.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  const sortedDays = Array.from(new Set(logDates.map((d) => formatDate(d))))
    .sort()
    .map((s) => new Date(`${s}T00:00:00.000Z`));

  let longest = 1;
  let running = 1;
  for (let i = 1; i < sortedDays.length; i += 1) {
    const diffDays = Math.round(
      (sortedDays[i].getTime() - sortedDays[i - 1].getTime()) / MS_PER_DAY,
    );
    if (diffDays === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  const todayOnly = toDateOnly(today);
  const lastChecked = sortedDays[sortedDays.length - 1];
  const diffFromToday = Math.round(
    (todayOnly.getTime() - lastChecked.getTime()) / MS_PER_DAY,
  );

  let current = 0;
  if (diffFromToday <= 1) {
    current = 1;
    for (let i = sortedDays.length - 1; i > 0; i -= 1) {
      const diffDays = Math.round(
        (sortedDays[i].getTime() - sortedDays[i - 1].getTime()) / MS_PER_DAY,
      );
      if (diffDays === 1) {
        current += 1;
      } else {
        break;
      }
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
 */
export function calculateAchievementRate(
  from: Date,
  to: Date,
  targetCount: number,
  logDates: Date[],
): RateResult {
  const weekCounts = groupDatesByWeek(logDates);
  const fromWeekStart = getWeekStart(from);
  const toWeekStart = getWeekStart(to);

  const overlappingWeeks = listWeekStarts(fromWeekStart, toWeekStart);

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
