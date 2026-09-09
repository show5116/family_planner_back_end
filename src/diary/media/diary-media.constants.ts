import { MediaType } from '@prisma/client';

/** 업로드 허용 MIME 화이트리스트 (블랙리스트가 아니라 화이트리스트로 막는다) */
export const ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
  [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  [MediaType.VIDEO]: ['video/mp4', 'video/quicktime'],
};

/** R2 저장 경로 prefix */
export const DIARY_MEDIA_FOLDER = 'diary-media';

/** 썸네일 규격 — 클라이언트가 맞춰 올린다 (JPEG, 최대 변 640px, 품질 80) */
export const THUMBNAIL_MIME_TYPE = 'image/jpeg';
export const THUMBNAIL_KEY_SUFFIX = '_thumb.jpg';

/**
 * 본체 키에서 썸네일 키를 파생한다.
 *
 * DB에 따로 저장하지 않고 필요할 때마다 계산한다 — 예약 시점에 thumbnailKey를
 * 기록해두면 클라이언트가 썸네일 업로드에 실패했을 때 존재하지 않는 파일을
 * 서명하게 된다. 실제 기록은 confirm에서 존재를 확인한 뒤에만 한다.
 */
export function thumbnailKeyOf(storageKey: string): string {
  const dot = storageKey.lastIndexOf('.');
  const base =
    dot > storageKey.lastIndexOf('/') ? storageKey.slice(0, dot) : storageKey;
  return `${base}${THUMBNAIL_KEY_SUFFIX}`;
}

/** 한도 계산 직렬화용 사용자 락 */
export const QUOTA_LOCK_TTL_SECONDS = 10;
export const QUOTA_LOCK_MAX_RETRIES = 25;
export const QUOTA_LOCK_RETRY_DELAY_MS = 100;

export function quotaLockKey(userId: string): string {
  return `diary:media:quota:${userId}`;
}
