import { MediaType } from '@prisma/client';

/** 업로드 허용 MIME 화이트리스트 (블랙리스트가 아니라 화이트리스트로 막는다) */
export const ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
  [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  [MediaType.VIDEO]: ['video/mp4', 'video/quicktime'],
};

/** R2 저장 경로 prefix */
export const DIARY_MEDIA_FOLDER = 'diary-media';

/** 한도 계산 직렬화용 사용자 락 */
export const QUOTA_LOCK_TTL_SECONDS = 10;
export const QUOTA_LOCK_MAX_RETRIES = 25;
export const QUOTA_LOCK_RETRY_DELAY_MS = 100;

export function quotaLockKey(userId: string): string {
  return `diary:media:quota:${userId}`;
}
