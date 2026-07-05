/** 해당 연/월에 dayOfMonth가 존재하지 않으면(예: 2월 31일) 말일로 clamp한 day를 반환 */
export function clampDayOfMonth(
  year: number,
  month: number,
  dayOfMonth: number,
): number {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(dayOfMonth, lastDayOfMonth);
}

/** startDate + totalMonths 기준으로 referenceDate 시점에 반복이 종료되었는지 여부 */
export function isRecurringExpenseEnded(
  rec: { startDate: Date | null; totalMonths: number | null },
  referenceDate: Date,
): boolean {
  if (!rec.startDate || !rec.totalMonths) return false;

  const startMonthIndex =
    rec.startDate.getFullYear() * 12 + rec.startDate.getMonth();
  const endMonthIndex = startMonthIndex + rec.totalMonths - 1;
  const referenceMonthIndex =
    referenceDate.getFullYear() * 12 + referenceDate.getMonth();

  return referenceMonthIndex > endMonthIndex;
}

/** startDate + totalMonths로 계산한 마지막 반복 월의 1일 (무기한이면 null) */
export function calculateRecurringExpenseEndDate(rec: {
  startDate: Date | null;
  totalMonths: number | null;
}): Date | null {
  if (!rec.startDate || !rec.totalMonths) return null;

  const startMonthIndex =
    rec.startDate.getFullYear() * 12 + rec.startDate.getMonth();
  const endMonthIndex = startMonthIndex + rec.totalMonths - 1;

  return new Date(Math.floor(endMonthIndex / 12), endMonthIndex % 12, 1);
}

/** 등록월(startDate)부터 이번 달까지의 (year, month) 목록. startDate가 미래이거나 없으면 빈 배열 */
export function listMonthsFromStartToNow(
  startDate: Date,
  now: Date,
): { year: number; month: number }[] {
  const startIndex = startDate.getFullYear() * 12 + startDate.getMonth();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();

  const months: { year: number; month: number }[] = [];
  for (let idx = startIndex; idx <= nowIndex; idx++) {
    months.push({ year: Math.floor(idx / 12), month: idx % 12 });
  }
  return months;
}
