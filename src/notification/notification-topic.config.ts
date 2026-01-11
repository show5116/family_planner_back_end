import { NotificationCategory } from './enums/notification-category.enum';

/**
 * FCM Topic 설정
 * 카테고리별 Topic 이름을 매핑
 */
export interface TopicConfig {
  category: NotificationCategory;
  topicName: string;
  description: string;
}

/**
 * FCM Topic 설정 목록
 * 새로운 Topic을 추가할 때 이 배열에 추가하면 됨
 */
export const TOPIC_CONFIGS: TopicConfig[] = [
  {
    category: NotificationCategory.ANNOUNCEMENT,
    topicName: 'announcements',
    description: '전체 공지사항 (긴급 점검, 새로운 기능 출시 등)',
  },
  // 향후 추가 가능한 Topic 예시:
  // {
  //   category: NotificationCategory.SYSTEM,
  //   topicName: 'system_alerts',
  //   description: '시스템 알림 (보안, 업데이트 등)',
  // },
];

/**
 * 카테고리로 Topic 이름 조회
 */
export function getTopicNameByCategory(
  category: NotificationCategory,
): string | null {
  const config = TOPIC_CONFIGS.find((c) => c.category === category);
  return config ? config.topicName : null;
}

/**
 * 카테고리가 Topic 발송용인지 확인
 */
export function isTopicCategory(category: NotificationCategory): boolean {
  return TOPIC_CONFIGS.some((c) => c.category === category);
}

/**
 * 모든 Topic 이름 목록 조회
 */
export function getAllTopicNames(): string[] {
  return TOPIC_CONFIGS.map((c) => c.topicName);
}
