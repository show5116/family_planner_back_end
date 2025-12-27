/**
 * 알림 카테고리 Enum
 * Prisma Schema의 NotificationCategory와 동기화
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
