import { RecurringRuleType } from '@/task/enums';
import {
  RecurringEndType,
  RuleConfig,
  WeeklyRuleConfig,
  MonthlyRuleConfig,
  YearlyRuleConfig,
} from '@/task/interfaces';

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
   * DST(썸머타임) 이슈를 방지하기 위해 날짜의 시간을 정오(12:00)로 설정
   * 이렇게 하면 +/- 1시간 변동이 있어도 날짜가 바뀌지 않음
   */
  private static normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }

  /**
   * 날짜를 안전하게 n일 후로 이동 (DST 고려)
   */
  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    // DST로 인한 시간 변동 보정
    result.setHours(12, 0, 0, 0);
    return result;
  }

  /**
   * 다음 반복 날짜들을 계산
   * @param ruleType 반복 타입
   * @param ruleConfig 반복 설정
   * @param fromDate 시작 날짜
   * @param monthsAhead 미래 몇 개월까지 생성할지
   * @param existingDates 이미 존재하는 날짜들 (중복 방지)
   * @param skipDates 건너뛰기 날짜들
   */
  static calculateNextDates(
    ruleType: RecurringRuleType,
    ruleConfig: RuleConfig,
    fromDate: Date,
    monthsAhead: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
  ): Date[] {
    // interval 검증
    const safeConfig = {
      ...ruleConfig,
      interval: this.sanitizeInterval(ruleConfig.interval),
    };

    const endDate = new Date(fromDate);
    endDate.setMonth(endDate.getMonth() + monthsAhead);

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
        );
      case RecurringRuleType.WEEKLY:
        return this.calculateWeeklyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig as WeeklyRuleConfig,
          remainingCount,
          existingDates,
          skipDates,
        );
      case RecurringRuleType.MONTHLY:
        return this.calculateMonthlyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig as MonthlyRuleConfig,
          remainingCount,
          existingDates,
          skipDates,
        );
      case RecurringRuleType.YEARLY:
        return this.calculateYearlyDates(
          normalizedFromDate,
          normalizedEndDate,
          safeConfig as YearlyRuleConfig,
          remainingCount,
          existingDates,
          skipDates,
        );
      default:
        return [];
    }
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
      const dateStr = this.formatDateString(currentDate);

      if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
        dates.push(new Date(currentDate));
        addedCount++;
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

    // 현재 주의 시작(일요일)으로 이동
    const startOfWeek = new Date(fromDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(12, 0, 0, 0);

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

        const dateStr = this.formatDateString(targetDate);

        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(new Date(targetDate));
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
      const targetMonth = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth() + monthCount * interval,
        1,
        12,
        0,
        0,
        0,
      );

      if (targetMonth > endDate) break;

      let targetDate: Date | null = null;

      if (monthlyType === 'dayOfMonth' && dayOfMonth) {
        // 날짜 기준
        targetDate = this.getDateOfMonth(
          targetMonth.getFullYear(),
          targetMonth.getMonth(),
          dayOfMonth,
        );
      } else if (
        monthlyType === 'weekOfMonth' &&
        weekOfMonth !== undefined &&
        dayOfWeek !== undefined
      ) {
        // 주차/요일 기준
        targetDate = this.getNthDayOfMonth(
          targetMonth.getFullYear(),
          targetMonth.getMonth(),
          weekOfMonth,
          dayOfWeek,
        );
      }

      if (targetDate && targetDate >= fromDate && targetDate <= endDate) {
        const dateStr = this.formatDateString(targetDate);

        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(targetDate);
          addedCount++;
        }
      }

      monthCount++;
      iterationCount++;
    }

    return dates;
  }

  /**
   * YEARLY 날짜 계산
   * 날짜 기준(12월 25일) 또는 주차/요일 기준(5월 2번째 일요일) 지원
   */
  private static calculateYearlyDates(
    fromDate: Date,
    endDate: Date,
    config: YearlyRuleConfig,
    remainingCount: number,
    existingDates: Set<string>,
    skipDates: Set<string>,
  ): Date[] {
    const dates: Date[] = [];
    const interval = this.sanitizeInterval(config.interval);
    const { month, yearlyType, dayOfMonth, weekOfMonth, dayOfWeek } = config;

    const currentYear = fromDate.getFullYear();
    let addedCount = 0;
    let yearCount = 0;
    let iterationCount = 0;

    while (
      addedCount < remainingCount &&
      iterationCount < this.MAX_DATES_PER_CALCULATION
    ) {
      const targetYear = currentYear + yearCount * interval;
      let targetDate: Date | null = null;

      if (
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
        const dateStr = this.formatDateString(targetDate);

        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(targetDate);
          addedCount++;
        }
      }

      yearCount++;
      iterationCount++;
    }

    return dates;
  }

  /**
   * 특정 월의 n일 반환 (해당 월에 없는 날짜면 마지막 날 반환)
   */
  private static getDateOfMonth(
    year: number,
    month: number,
    day: number,
  ): Date {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(day, lastDayOfMonth);
    const date = new Date(year, month, actualDay);
    date.setHours(12, 0, 0, 0); // DST 보정
    return date;
  }

  /**
   * 특정 월의 n번째 요일 반환
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
      const lastDay = new Date(year, month + 1, 0);
      const lastDayOfWeek = lastDay.getDay();
      const diff = lastDayOfWeek - dayOfWeek;
      const targetDate = new Date(lastDay);
      targetDate.setDate(lastDay.getDate() - (diff >= 0 ? diff : 7 + diff));
      targetDate.setHours(12, 0, 0, 0); // DST 보정
      return targetDate;
    }

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    let diff = dayOfWeek - firstDayOfWeek;
    if (diff < 0) diff += 7;

    const targetDay = 1 + diff + (week - 1) * 7;
    const targetDate = new Date(year, month, targetDay);

    // 해당 월을 벗어나면 null
    if (targetDate.getMonth() !== month) return null;

    targetDate.setHours(12, 0, 0, 0); // DST 보정
    return targetDate;
  }

  /**
   * 날짜를 YYYY-MM-DD 형식으로 포맷
   */
  static formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
          if (daysOfWeek.includes(checkDate.getDay())) {
            return checkDate;
          }
        }
        return null;
      }

      case RecurringRuleType.MONTHLY: {
        // 월말 Clamp 처리: 1월 31일 + 1개월 = 2월 28일 (JS 기본: 3월 3일로 overflow)
        const targetMonth = nextDate.getMonth() + interval;
        const targetYear =
          nextDate.getFullYear() + Math.floor(targetMonth / 12);
        const normalizedMonth = targetMonth % 12;
        return this.getDateOfMonth(
          targetYear,
          normalizedMonth,
          nextDate.getDate(),
        );
      }

      case RecurringRuleType.YEARLY: {
        // 윤년 Clamp 처리: 2024년 2월 29일 + 1년 = 2025년 2월 28일
        const targetYear = nextDate.getFullYear() + interval;
        return this.getDateOfMonth(
          targetYear,
          nextDate.getMonth(),
          nextDate.getDate(),
        );
      }

      default:
        return null;
    }
  }
}
