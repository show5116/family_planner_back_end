import dayjs from 'dayjs';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { RecurringRuleType } from '@/task/enums';
import {
  RecurringEndType,
  SkipBehavior,
  RuleConfig,
  WeeklyRuleConfig,
  MonthlyRuleConfig,
  YearlyRuleConfig,
} from '@/task/interfaces';
import {
  toKstDateOnly,
  getKstDay,
  addKstDays,
} from '@/common/utils/date-kst.util';

/**
 * 반복 일정 날짜 계산 유틸리티
 *
 * 개선 사항:
 * 1. interval 검증으로 무한 루프 방지
 * 2. DST(썸머타임) 이슈 해결을 위한 시간 정규화
 * 3. Yearly의 weekOfMonth 지원 추가
 * 4. 최대 반복 횟수 제한으로 안전성 확보
 */
export class RecurringDateUtil {
  /** 한 번 계산에서 생성할 수 있는 최대 날짜 수 (안전장치) */
  private static readonly MAX_DATES_PER_CALCULATION = 1000;

  /**
   * interval 값을 검증하고 안전한 값으로 반환
   * 무한 루프 방지를 위해 최소 1 이상 보장
   */
  private static sanitizeInterval(interval: number | undefined): number {
    if (!interval || interval < 1 || !Number.isFinite(interval)) {
      return 1;
    }
    return Math.floor(interval);
  }

  /**
   * 날짜를 KST 기준 자정(UTC 자정으로 정규화된 순수 날짜)으로 변환
   * 서버가 UTC로 실행되어도 KST 캘린더 날짜/요일이 어긋나지 않도록 보장
   */
  private static normalizeDate(date: Date): Date {
    return toKstDateOnly(date);
  }

  /**
   * 날짜를 안전하게 n일 후로 이동 (KST 캘린더 기준)
   */
  private static addDays(date: Date, days: number): Date {
    return addKstDays(date, days);
  }

  /**
   * 다음 반복 날짜들을 계산
   * @param ruleType 반복 타입
   * @param ruleConfig 반복 설정
   * @param fromDate 시작 날짜
   * @param monthsAhead 미래 몇 개월까지 생성할지
   * @param existingDates 이미 존재하는 날짜들 (중복 방지)
   * @param skipDates 건너뛰기 날짜들
   * @param holidayDates 공휴일 날짜들 (YYYY-MM-DD Set, skipHolidays 옵션용)
   */
  static calculateNextDates(
    ruleType: RecurringRuleType,
    ruleConfig: RuleConfig,
    fromDate: Date,
    monthsAhead: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
    holidayDates: Set<string> = new Set(),
  ): Date[] {
    // interval 검증
    const safeConfig = {
      ...ruleConfig,
      interval: this.sanitizeInterval(ruleConfig.interval),
    };

    const endDate = dayjs(fromDate)
      .tz('Asia/Seoul')
      .add(monthsAhead, 'month')
      .toDate();

    // 종료 조건 확인
    const {
      endType,
      endDate: configEndDate,
      count,
      generatedCount = 0,
    } = safeConfig;

    // endType이 DATE인 경우, endDate로 제한
    if (endType === RecurringEndType.DATE && configEndDate) {
      const configEnd = new Date(configEndDate);
      if (configEnd < endDate) {
        endDate.setTime(configEnd.getTime());
      }
    }

    // endType이 COUNT인 경우, 남은 횟수 계산
    let remainingCount = this.MAX_DATES_PER_CALCULATION;
    if (endType === RecurringEndType.COUNT && count) {
      remainingCount = Math.min(
        count - generatedCount,
        this.MAX_DATES_PER_CALCULATION,
      );
      if (remainingCount <= 0) return [];
    }

    const normalizedFromDate = this.normalizeDate(fromDate);
    const normalizedEndDate = this.normalizeDate(endDate);

    switch (ruleType) {
      case RecurringRuleType.DAILY:
        return this.calculateDailyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig,
          remainingCount,
          existingDates,
          skipDates,
          holidayDates,
        );
      case RecurringRuleType.WEEKLY:
        return this.calculateWeeklyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig as WeeklyRuleConfig,
          remainingCount,
          existingDates,
          skipDates,
          holidayDates,
        );
      case RecurringRuleType.MONTHLY:
        return this.calculateMonthlyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig as MonthlyRuleConfig,
          remainingCount,
          existingDates,
          skipDates,
          holidayDates,
        );
      case RecurringRuleType.YEARLY:
        return this.calculateYearlyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig as YearlyRuleConfig,
          remainingCount,
          existingDates,
          skipDates,
          holidayDates,
        );
      default:
        return [];
    }
  }

  /**
   * 주말/공휴일 여부 확인
   */
  private static isWeekend(date: Date): boolean {
    const day = getKstDay(date);
    return day === 0 || day === 6;
  }

  private static isHoliday(date: Date, holidayDates: Set<string>): boolean {
    return holidayDates.has(this.formatDateString(date));
  }

  /**
   * skipWeekends/skipHolidays 옵션에 따라 날짜를 처리
   * - SKIP: null 반환 (해당 날짜 버림)
   * - MOVE_TO_NEXT_WEEKDAY: 다음 평일로 이동 후 반환
   *   이동 후 existingDates에 이미 있으면 null 반환 (중복 방지)
   */
  private static resolveDate(
    date: Date,
    config: RuleConfig,
    existingDates: Set<string>,
    holidayDates: Set<string>,
  ): Date | null {
    const {
      skipWeekends,
      skipHolidays,
      skipBehavior = SkipBehavior.SKIP,
    } = config;

    const needsSkip = (d: Date) =>
      (skipWeekends && this.isWeekend(d)) ||
      (skipHolidays && this.isHoliday(d, holidayDates));

    if (!needsSkip(date)) return date;

    if (skipBehavior === SkipBehavior.SKIP) return null;

    // MOVE_TO_NEXT_WEEKDAY: 최대 7일 앞으로 탐색 (무한 루프 방지)
    let candidate = this.addDays(date, 1);
    for (let i = 0; i < 7; i++) {
      if (!needsSkip(candidate)) {
        // 이동 후 이미 존재하는 날짜면 버림 (중복 방지)
        if (existingDates.has(this.formatDateString(candidate))) return null;
        return candidate;
      }
      candidate = this.addDays(candidate, 1);
    }

    return null;
  }

  /**
   * DAILY 날짜 계산
   */
  private static calculateDailyDates(
    fromDate: Date,
    endDate: Date,
    config: RuleConfig,
    remainingCount: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
    holidayDates: Set<string>,
  ): Date[] {
    const dates: Date[] = [];
    const interval = this.sanitizeInterval(config.interval);
    let currentDate = new Date(fromDate);
    let addedCount = 0;
    let iterationCount = 0;

    while (
      currentDate <= endDate &&
      addedCount < remainingCount &&
      iterationCount < this.MAX_DATES_PER_CALCULATION
    ) {
      const resolved = this.resolveDate(
        currentDate,
        config,
        existingDates,
        holidayDates,
      );

      if (resolved) {
        const dateStr = this.formatDateString(resolved);
        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(new Date(resolved));
          // MOVE_TO_NEXT_WEEKDAY로 이동된 날짜도 즉시 existingDates에 등록해
          // 같은 날로 중복 이동되는 것을 방지
          existingDates.add(dateStr);
          addedCount++;
        }
      }

      currentDate = this.addDays(currentDate, interval);
      iterationCount++;
    }

    return dates;
  }

  /**
   * WEEKLY 날짜 계산
   *
   * 주의: 현재 구현은 "상대적 주기" 방식입니다.
   * 예: 2주 간격 = fromDate 기준으로 2주 뒤
   * 절대적 주기(올해의 짝수 주차 등)가 필요하면 별도 구현 필요
   */
  private static calculateWeeklyDates(
    fromDate: Date,
    endDate: Date,
    config: WeeklyRuleConfig,
    remainingCount: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
    holidayDates: Set<string>,
  ): Date[] {
    const dates: Date[] = [];
    const interval = this.sanitizeInterval(config.interval);
    const { daysOfWeek } = config;

    if (!daysOfWeek || daysOfWeek.length === 0) return dates;

    // 요일 정렬 (일요일 0 ~ 토요일 6)
    const sortedDaysOfWeek = [...daysOfWeek].sort((a, b) => a - b);

    let addedCount = 0;
    let weekCount = 0;
    let iterationCount = 0;

    // 현재 주의 시작(일요일, KST 기준)으로 이동
    const startOfWeek = this.addDays(fromDate, -getKstDay(fromDate));

    while (
      addedCount < remainingCount &&
      iterationCount < this.MAX_DATES_PER_CALCULATION
    ) {
      // interval 간격의 주에만 생성
      const weekDate = this.addDays(startOfWeek, weekCount * 7 * interval);

      if (weekDate > endDate) break;

      // 해당 주의 지정된 요일들에 대해 생성
      for (const dayOfWeek of sortedDaysOfWeek) {
        if (addedCount >= remainingCount) break;

        const targetDate = this.addDays(weekDate, dayOfWeek);

        // fromDate 이전이거나 endDate 이후면 스킵
        if (targetDate < fromDate || targetDate > endDate) continue;

        const resolved = this.resolveDate(
          targetDate,
          config,
          existingDates,
          holidayDates,
        );

        if (!resolved) continue;

        const dateStr = this.formatDateString(resolved);

        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(new Date(resolved));
          existingDates.add(dateStr);
          addedCount++;
        }
      }

      weekCount++;
      iterationCount++;
    }

    return dates;
  }

  /**
   * MONTHLY 날짜 계산
   */
  private static calculateMonthlyDates(
    fromDate: Date,
    endDate: Date,
    config: MonthlyRuleConfig,
    remainingCount: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
    holidayDates: Set<string>,
  ): Date[] {
    const dates: Date[] = [];
    const interval = this.sanitizeInterval(config.interval);
    const { monthlyType, dayOfMonth, weekOfMonth, dayOfWeek } = config;

    let addedCount = 0;
    let monthCount = 0;
    let iterationCount = 0;

    while (
      addedCount < remainingCount &&
      iterationCount < this.MAX_DATES_PER_CALCULATION
    ) {
      const targetMonthIndex = fromDate.getUTCMonth() + monthCount * interval;
      const targetYear =
        fromDate.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
      const targetMonthOfYear = ((targetMonthIndex % 12) + 12) % 12;
      const targetMonth = this.getDateOfMonth(targetYear, targetMonthOfYear, 1);

      if (targetMonth > endDate) break;

      let targetDate: Date | null = null;

      if (monthlyType === 'dayOfMonth' && dayOfMonth) {
        // 날짜 기준
        targetDate = this.getDateOfMonth(
          targetYear,
          targetMonthOfYear,
          dayOfMonth,
        );
      } else if (
        monthlyType === 'weekOfMonth' &&
        weekOfMonth !== undefined &&
        dayOfWeek !== undefined
      ) {
        // 주차/요일 기준
        targetDate = this.getNthDayOfMonth(
          targetYear,
          targetMonthOfYear,
          weekOfMonth,
          dayOfWeek,
        );
      }

      if (targetDate && targetDate >= fromDate && targetDate <= endDate) {
        const resolved = this.resolveDate(
          targetDate,
          config,
          existingDates,
          holidayDates,
        );

        if (resolved) {
          const dateStr = this.formatDateString(resolved);
          if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
            dates.push(resolved);
            existingDates.add(dateStr);
            addedCount++;
          }
        }
      }

      monthCount++;
      iterationCount++;
    }

    return dates;
  }

  /**
   * 음력 날짜를 해당 연도의 양력 날짜로 변환
   * 윤달(isLeapMonth=true)이 해당 연도에 없으면 평달로 fallback
   */
  private static lunarToSolar(
    year: number,
    lunarMonth: number,
    lunarDay: number,
    isLeapMonth: boolean,
  ): Date | null {
    try {
      const cal = new KoreanLunarCalendar();
      // 패키지 타입 선언이 private으로 잘못 선언되어 있어 any로 우회
      (cal as any).setSolarDateByLunarDate(
        year,
        lunarMonth,
        lunarDay,
        isLeapMonth,
      );
      const solar = cal.getSolarCalendar();
      if (!solar || !solar.year) return null;
      return new Date(Date.UTC(solar.year, solar.month - 1, solar.day));
    } catch {
      return null;
    }
  }

  /**
   * YEARLY 날짜 계산
   * 날짜 기준(12월 25일), 주차/요일 기준(5월 2번째 일요일), 음력 기준(음력 9월 9일) 지원
   */
  private static calculateYearlyDates(
    fromDate: Date,
    endDate: Date,
    config: YearlyRuleConfig,
    remainingCount: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
    holidayDates: Set<string>,
  ): Date[] {
    const dates: Date[] = [];
    const interval = this.sanitizeInterval(config.interval);
    const {
      month,
      yearlyType,
      dayOfMonth,
      weekOfMonth,
      dayOfWeek,
      lunarMonth,
      lunarDay,
      isLeapMonth = false,
    } = config;

    const currentYear = fromDate.getUTCFullYear();
    let addedCount = 0;
    let yearCount = 0;
    let iterationCount = 0;

    while (
      addedCount < remainingCount &&
      iterationCount < this.MAX_DATES_PER_CALCULATION
    ) {
      const targetYear = currentYear + yearCount * interval;
      let targetDate: Date | null = null;

      if (lunarMonth && lunarDay) {
        // 음력 기준 (예: 음력 9월 9일 -> 해당 연도 양력 날짜)
        targetDate = this.lunarToSolar(
          targetYear,
          lunarMonth,
          lunarDay,
          isLeapMonth,
        );
      } else if (
        yearlyType === 'weekOfMonth' &&
        weekOfMonth !== undefined &&
        dayOfWeek !== undefined
      ) {
        // 주차/요일 기준 (예: 5월 2번째 일요일)
        targetDate = this.getNthDayOfMonth(
          targetYear,
          month - 1,
          weekOfMonth,
          dayOfWeek,
        );
      } else if (dayOfMonth) {
        // 날짜 기준 (예: 12월 25일) - 기본값
        targetDate = this.getDateOfMonth(targetYear, month - 1, dayOfMonth);
      }

      if (targetDate && targetDate > endDate) break;

      if (targetDate && targetDate >= fromDate) {
        const resolved = this.resolveDate(
          targetDate,
          config,
          existingDates,
          holidayDates,
        );

        if (resolved) {
          const dateStr = this.formatDateString(resolved);
          if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
            dates.push(resolved);
            existingDates.add(dateStr);
            addedCount++;
          }
        }
      }

      yearCount++;
      iterationCount++;
    }

    return dates;
  }

  /**
   * 특정 월의 n일 반환 (해당 월에 없는 날짜면 마지막 날 반환)
   * KST 캘린더 필드(year/month/day) -> UTC 자정 순수 날짜로 변환 (서버 타임존 무관)
   */
  private static getDateOfMonth(
    year: number,
    month: number,
    day: number,
  ): Date {
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const actualDay = Math.min(day, lastDayOfMonth);
    return new Date(Date.UTC(year, month, actualDay));
  }

  /**
   * 특정 월의 n번째 요일 반환
   * KST 캘린더 필드(year/month/day) -> UTC 자정 순수 날짜로 변환 (서버 타임존 무관)
   * @param year 연도
   * @param month 월 (0-11)
   * @param week 주차 (1-5, 5는 마지막 주)
   * @param dayOfWeek 요일 (0-6)
   */
  private static getNthDayOfMonth(
    year: number,
    month: number,
    week: number,
    dayOfWeek: number,
  ): Date | null {
    if (week === 5) {
      // 마지막 주
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      const lastDayOfWeek = lastDay.getUTCDay();
      const diff = lastDayOfWeek - dayOfWeek;
      const targetDay = lastDay.getUTCDate() - (diff >= 0 ? diff : 7 + diff);
      return new Date(Date.UTC(year, month, targetDay));
    }

    const firstDayOfWeek = new Date(Date.UTC(year, month, 1)).getUTCDay();
    let diff = dayOfWeek - firstDayOfWeek;
    if (diff < 0) diff += 7;

    const targetDay = 1 + diff + (week - 1) * 7;
    const targetDate = new Date(Date.UTC(year, month, targetDay));

    // 해당 월을 벗어나면 null
    if (targetDate.getUTCMonth() !== month) return null;

    return targetDate;
  }

  /**
   * 날짜를 YYYY-MM-DD 형식으로 포맷 (KST 기준)
   */
  static formatDateString(date: Date): string {
    return dayjs(date).tz('Asia/Seoul').format('YYYY-MM-DD');
  }

  /**
   * 다음 단일 날짜 계산 (AFTER_COMPLETION용)
   */
  static calculateNextSingleDate(
    ruleType: RecurringRuleType,
    ruleConfig: RuleConfig,
    fromDate: Date,
  ): Date | null {
    const interval = this.sanitizeInterval(ruleConfig.interval);
    const nextDate = this.normalizeDate(fromDate);

    switch (ruleType) {
      case RecurringRuleType.DAILY:
        return this.addDays(nextDate, interval);

      case RecurringRuleType.WEEKLY: {
        const weeklyConfig = ruleConfig as WeeklyRuleConfig;
        const { daysOfWeek } = weeklyConfig;
        if (!daysOfWeek || daysOfWeek.length === 0) return null;

        // 다음 요일 찾기 (최대 7주까지 탐색)
        const maxDays = 7 * interval;
        for (let i = 1; i <= maxDays; i++) {
          const checkDate = this.addDays(fromDate, i);
          if (daysOfWeek.includes(getKstDay(checkDate))) {
            return checkDate;
          }
        }
        return null;
      }

      case RecurringRuleType.MONTHLY: {
        // 월말 Clamp 처리: 1월 31일 + 1개월 = 2월 28일 (JS 기본: 3월 3일로 overflow)
        const targetMonth = nextDate.getUTCMonth() + interval;
        const targetYear =
          nextDate.getUTCFullYear() + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;
        return this.getDateOfMonth(
          targetYear,
          normalizedMonth,
          nextDate.getUTCDate(),
        );
      }

      case RecurringRuleType.YEARLY: {
        // 윤년 Clamp 처리: 2024년 2월 29일 + 1년 = 2025년 2월 28일
        const targetYear = nextDate.getUTCFullYear() + interval;
        return this.getDateOfMonth(
          targetYear,
          nextDate.getUTCMonth(),
          nextDate.getUTCDate(),
        );
      }

      default:
        return null;
    }
  }
}
