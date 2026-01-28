/**
 * 반복 일정 규칙 설정 인터페이스
 */

/**
 * 반복 종료 조건 타입
 */
export enum RecurringEndType {
  NEVER = 'NEVER', // 계속 반복 (종료일 없음)
  DATE = 'DATE', // 특정 날짜까지
  COUNT = 'COUNT', // 지정 횟수만큼
}

/**
 * 기본 반복 규칙 설정
 */
export interface BaseRuleConfig {
  /** 반복 간격 (1 = 매번, 2 = 격주/격월 등) */
  interval: number;
  /** 종료 조건 */
  endType: RecurringEndType;
  /** 종료 날짜 (endType이 DATE인 경우 필수) */
  endDate?: string;
  /** 반복 횟수 (endType이 COUNT인 경우 필수) */
  count?: number;
  /** 현재까지 생성된 횟수 (내부 추적용) */
  generatedCount?: number;
}

/**
 * DAILY 규칙 설정
 * 매일/격일/n일마다 반복
 * interval: 1 = 매일, 2 = 격일, 3 = 3일마다 등
 */
export type DailyRuleConfig = BaseRuleConfig;

/**
 * WEEKLY 규칙 설정
 * 매주/격주/n주마다 특정 요일에 반복
 */
export interface WeeklyRuleConfig extends BaseRuleConfig {
  /** 반복할 요일 목록 (0 = 일요일, 1 = 월요일, ..., 6 = 토요일) */
  daysOfWeek: number[];
}

/**
 * MONTHLY 규칙 설정
 * 매달/격월/n달마다 특정 날짜 또는 특정 주차 요일에 반복
 */
export interface MonthlyRuleConfig extends BaseRuleConfig {
  /** 반복 타입: 날짜 기준 또는 요일 기준 */
  monthlyType: 'dayOfMonth' | 'weekOfMonth';
  /** 날짜 (1-31, monthlyType이 dayOfMonth인 경우) */
  dayOfMonth?: number;
  /** 주차 (1-5, monthlyType이 weekOfMonth인 경우, 5는 마지막 주) */
  weekOfMonth?: number;
  /** 요일 (0-6, monthlyType이 weekOfMonth인 경우) */
  dayOfWeek?: number;
}

/**
 * YEARLY 규칙 설정
 * 매년/격년/n년마다 특정 월일에 반복
 */
export interface YearlyRuleConfig extends BaseRuleConfig {
  /** 월 (1-12) */
  month: number;
  /** 날짜 (1-31) */
  dayOfMonth: number;
}

/**
 * 통합 RuleConfig 타입
 */
export type RuleConfig =
  | DailyRuleConfig
  | WeeklyRuleConfig
  | MonthlyRuleConfig
  | YearlyRuleConfig;
