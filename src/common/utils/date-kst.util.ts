import dayjs from 'dayjs';

/** KST 기준 오늘 날짜를 UTC 자정으로 정규화해서 반환 (DB @db.Date 컬럼과 동일한 "순수 날짜" 표현) */
export function todayInKst(): Date {
  const kstDateStr = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD');
  return new Date(`${kstDateStr}T00:00:00.000Z`);
}

/** KST 기준 이번 달 1일을 UTC 자정으로 정규화해서 반환 */
export function thisMonthStartInKst(): Date {
  const kstMonthStr = dayjs().tz('Asia/Seoul').format('YYYY-MM-01');
  return new Date(`${kstMonthStr}T00:00:00.000Z`);
}

/** 'YYYY-MM-DD' 문자열을 순수 날짜(Date)로 파싱 */
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** 임의의 Date를 KST 기준 자정(00:00) 순수 날짜로 정규화 */
export function toKstDateOnly(date: Date): Date {
  const kstDateStr = dayjs(date).tz('Asia/Seoul').format('YYYY-MM-DD');
  return new Date(`${kstDateStr}T00:00:00.000Z`);
}

/** KST 기준 요일 반환 (0=일요일 ~ 6=토요일) */
export function getKstDay(date: Date): number {
  return dayjs(date).tz('Asia/Seoul').day();
}

/** KST 기준 연/월/일로 구성된 순수 날짜(Date, UTC 자정으로 정규화) 생성 */
export function makeKstDate(year: number, month: number, day: number): Date {
  // month: 0-11 (Date 생성자와 동일한 컨벤션)
  const dateStr = dayjs
    .tz(`${year}-${month + 1}-1`, 'Asia/Seoul')
    .date(day)
    .format('YYYY-MM-DD');
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** KST 기준으로 n일 더한 순수 날짜 반환 */
export function addKstDays(date: Date, days: number): Date {
  const kstDateStr = dayjs(date)
    .tz('Asia/Seoul')
    .add(days, 'day')
    .format('YYYY-MM-DD');
  return new Date(`${kstDateStr}T00:00:00.000Z`);
}

/** 순수 날짜(자정 Date)에 KST 기준 시:분:초를 결합해 UTC Date로 변환 */
export function combineKstDateAndTime(
  dateOnly: Date,
  hour: number,
  minute: number,
  second: number = 0,
): Date {
  const dateStr = dayjs(dateOnly).tz('Asia/Seoul').format('YYYY-MM-DD');
  return dayjs
    .tz(dateStr, 'Asia/Seoul')
    .hour(hour)
    .minute(minute)
    .second(second)
    .millisecond(0)
    .toDate();
}

/** Date에서 KST 기준 시/분/초 추출 */
export function getKstTime(date: Date): {
  hour: number;
  minute: number;
  second: number;
} {
  const d = dayjs(date).tz('Asia/Seoul');
  return { hour: d.hour(), minute: d.minute(), second: d.second() };
}
