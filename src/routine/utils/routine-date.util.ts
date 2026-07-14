import dayjs from 'dayjs';

/** KST 기준 오늘 날짜를 UTC 자정으로 정규화해서 반환 (DB의 @db.Date와 동일한 "순수 날짜" 표현) */
export function todayInKst(): Date {
  const kstDateStr = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD');
  return new Date(`${kstDateStr}T00:00:00.000Z`);
}

/** 'YYYY-MM-DD' 문자열을 순수 날짜(Date)로 파싱 */
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
