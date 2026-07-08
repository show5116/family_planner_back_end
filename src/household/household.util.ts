/** 해당 연/월에 dayOfMonth가 존재하지 않으면(예: 2월 31일) 말일로 clamp한 day를 반환 (UTC 기준) */
export function clampDayOfMonth(
  year: number,
  month: number,
  dayOfMonth: number,
): number {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(dayOfMonth, lastDayOfMonth);
}

/** year/month/day를 UTC 자정 기준 Date로 생성 (@db.Date 컬럼 저장 시 로컬 타임존에 의한 날짜 밀림 방지) */
export function toUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** "YYYY-MM-DD" 문자열을 해당 월 1일의 UTC 자정 Date로 정규화 */
export function parseToUtcMonthStart(dateString: string): Date {
  const parsed = new Date(dateString);
  return toUtcDate(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1);
}

/** startDate + totalMonths 기준으로 referenceDate 시점에 반복이 종료되었는지 여부 (UTC 기준) */
export function isRecurringExpenseEnded(
  rec: { startDate: Date | null; totalMonths: number | null },
  referenceDate: Date,
): boolean {
  if (!rec.startDate || !rec.totalMonths) return false;

  const startMonthIndex =
    rec.startDate.getUTCFullYear() * 12 + rec.startDate.getUTCMonth();
  const endMonthIndex = startMonthIndex + rec.totalMonths - 1;
  const referenceMonthIndex =
    referenceDate.getUTCFullYear() * 12 + referenceDate.getUTCMonth();

  return referenceMonthIndex > endMonthIndex;
}

/** startDate + totalMonths로 계산한 마지막 반복 월의 1일 (무기한이면 null, UTC 기준) */
export function calculateRecurringExpenseEndDate(rec: {
  startDate: Date | null;
  totalMonths: number | null;
}): Date | null {
  if (!rec.startDate || !rec.totalMonths) return null;

  const startMonthIndex =
    rec.startDate.getUTCFullYear() * 12 + rec.startDate.getUTCMonth();
  const endMonthIndex = startMonthIndex + rec.totalMonths - 1;

  return toUtcDate(Math.floor(endMonthIndex / 12), endMonthIndex % 12, 1);
}

/** 등록월(startDate)부터 이번 달까지의 (year, month) 목록. startDate가 미래이거나 없으면 빈 배열 (UTC 기준) */
export function listMonthsFromStartToNow(
  startDate: Date,
  now: Date,
): { year: number; month: number }[] {
  const startIndex = startDate.getUTCFullYear() * 12 + startDate.getUTCMonth();
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();

  const months: { year: number; month: number }[] = [];
  for (let idx = startIndex; idx <= nowIndex; idx++) {
    months.push({ year: Math.floor(idx / 12), month: idx % 12 });
  }
  return months;
}
