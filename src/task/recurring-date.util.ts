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
 */
export class RecurringDateUtil {
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
    const endDate = new Date(fromDate);
    endDate.setMonth(endDate.getMonth() + monthsAhead);

    // 종료 조건 확인
    const {
      endType,
      endDate: configEndDate,
      count,
      generatedCount = 0,
    } = ruleConfig;

    // endType이 DATE인 경우, endDate로 제한
    if (endType === RecurringEndType.DATE && configEndDate) {
      const configEnd = new Date(configEndDate);
      if (configEnd < endDate) {
        endDate.setTime(configEnd.getTime());
      }
    }

    // endType이 COUNT인 경우, 남은 횟수 계산
    let remainingCount = Infinity;
    if (endType === RecurringEndType.COUNT && count) {
      remainingCount = count - generatedCount;
      if (remainingCount <= 0) return [];
    }

    const dates: Date[] = [];
    const currentDate = new Date(fromDate);

    switch (ruleType) {
      case RecurringRuleType.DAILY:
        dates.push(
          ...this.calculateDailyDates(
            currentDate,
            endDate,
            ruleConfig,
            remainingCount,
            existingDates,
            skipDates,
          ),
        );
        break;
      case RecurringRuleType.WEEKLY:
        dates.push(
          ...this.calculateWeeklyDates(
            currentDate,
            endDate,
            ruleConfig as WeeklyRuleConfig,
            remainingCount,
            existingDates,
            skipDates,
          ),
        );
        break;
      case RecurringRuleType.MONTHLY:
        dates.push(
          ...this.calculateMonthlyDates(
            currentDate,
            endDate,
            ruleConfig as MonthlyRuleConfig,
            remainingCount,
            existingDates,
            skipDates,
          ),
        );
        break;
      case RecurringRuleType.YEARLY:
        dates.push(
          ...this.calculateYearlyDates(
            currentDate,
            endDate,
            ruleConfig as YearlyRuleConfig,
            remainingCount,
            existingDates,
            skipDates,
          ),
        );
        break;
    }

    return dates;
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
    const { interval } = config;
    const currentDate = new Date(fromDate);
    let addedCount = 0;

    while (currentDate <= endDate && addedCount < remainingCount) {
      const dateStr = this.formatDateString(currentDate);

      if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
        dates.push(new Date(currentDate));
        addedCount++;
      }

      currentDate.setDate(currentDate.getDate() + interval);
    }

    return dates;
  }

  /**
   * WEEKLY 날짜 계산
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
    const { interval, daysOfWeek } = config;

    if (!daysOfWeek || daysOfWeek.length === 0) return dates;

    const currentDate = new Date(fromDate);
    let addedCount = 0;
    let weekCount = 0;

    // 현재 주의 시작(일요일)으로 이동
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    while (addedCount < remainingCount) {
      // interval 간격의 주에만 생성
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(weekDate.getDate() + weekCount * 7 * interval);

      if (weekDate > endDate) break;

      // 해당 주의 지정된 요일들에 대해 생성
      for (const dayOfWeek of daysOfWeek) {
        if (addedCount >= remainingCount) break;

        const targetDate = new Date(weekDate);
        targetDate.setDate(targetDate.getDate() + dayOfWeek);

        // fromDate 이전이거나 endDate 이후면 스킵
        if (targetDate < fromDate || targetDate > endDate) continue;

        const dateStr = this.formatDateString(targetDate);

        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(new Date(targetDate));
          addedCount++;
        }
      }

      weekCount++;
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
    const { interval, monthlyType, dayOfMonth, weekOfMonth, dayOfWeek } =
      config;

    const currentDate = new Date(fromDate);
    let addedCount = 0;
    let monthCount = 0;

    while (addedCount < remainingCount) {
      const targetMonth = new Date(
        fromDate.getFullYear(),
        fromDate.getMonth() + monthCount * interval,
        1,
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
    }

    return dates;
  }

  /**
   * YEARLY 날짜 계산
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
    const { interval, month, dayOfMonth } = config;

    const currentYear = fromDate.getFullYear();
    let addedCount = 0;
    let yearCount = 0;

    while (addedCount < remainingCount) {
      const targetYear = currentYear + yearCount * interval;
      const targetDate = this.getDateOfMonth(targetYear, month - 1, dayOfMonth);

      if (targetDate && targetDate > endDate) break;

      if (targetDate && targetDate >= fromDate) {
        const dateStr = this.formatDateString(targetDate);

        if (!existingDates.has(dateStr) && !skipDates.has(dateStr)) {
          dates.push(targetDate);
          addedCount++;
        }
      }

      yearCount++;
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
    return new Date(year, month, actualDay);
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
    const { interval } = ruleConfig;
    const nextDate = new Date(fromDate);

    switch (ruleType) {
      case RecurringRuleType.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case RecurringRuleType.WEEKLY: {
        const weeklyConfig = ruleConfig as WeeklyRuleConfig;
        const { daysOfWeek } = weeklyConfig;
        if (!daysOfWeek || daysOfWeek.length === 0) return null;

        // 다음 요일 찾기
        let found = false;
        for (let i = 1; i <= 7 * interval; i++) {
          const checkDate = new Date(fromDate);
          checkDate.setDate(checkDate.getDate() + i);
          if (daysOfWeek.includes(checkDate.getDay())) {
            nextDate.setTime(checkDate.getTime());
            found = true;
            break;
          }
        }
        if (!found) return null;
        break;
      }

      case RecurringRuleType.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;

      case RecurringRuleType.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }

    return nextDate;
  }
}
