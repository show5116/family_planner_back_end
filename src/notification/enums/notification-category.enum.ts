/**
 * 알림 카테고리 Enum
 * Prisma Schema의 notification_settings_category와 동기화
 * DB에 저장되는 알림 설정 카테고리
 */
export enum NotificationCategory {
  SCHEDULE = 'SCHEDULE',
  TODO = 'TODO',
  HOUSEHOLD = 'HOUSEHOLD',
  ASSET = 'ASSET',
  CHILDCARE = 'CHILDCARE',
  GROUP = 'GROUP',
  SYSTEM = 'SYSTEM',
}
