import { registerAs } from '@nestjs/config';

/**
 * 다이어리 미디어 등급별 용량 한도
 *
 * 앱에 하드코딩하지 않고 서버가 내려준다 — 한도 조정에 앱 재배포가 필요하면 안 된다.
 * 기본값은 아래 상수이고, 환경변수로 덮어쓸 수 있다(서버 재시작만으로 반영).
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

export interface MediaQuotaPlan {
  /** 월간 업로드 한도 (bytes) */
  monthlyBytes: number;
  /** 계정 누적 저장 한도 (bytes) */
  totalBytes: number;
  /** 파일 1개 최대 크기 (bytes) */
  perFileBytes: number;
  /** 영상 첨부 가능 여부 */
  videoAllowed: boolean;
  /** 영상 최대 길이 (ms, 영상 불가 등급은 null) */
  maxVideoDurationMs: number | null;
}

const DEFAULTS = {
  free: {
    monthlyBytes: 100 * MB,
    totalBytes: 500 * MB,
    perFileBytes: 20 * MB,
    videoAllowed: false,
    maxVideoDurationMs: null,
  },
  ad_free: {
    monthlyBytes: 300 * MB,
    totalBytes: 2 * GB,
    perFileBytes: 50 * MB,
    videoAllowed: true,
    maxVideoDurationMs: 60 * 1000,
  },
  premium: {
    monthlyBytes: 2 * GB,
    totalBytes: 20 * GB,
    perFileBytes: 200 * MB,
    videoAllowed: true,
    maxVideoDurationMs: 5 * 60 * 1000,
  },
} satisfies Record<string, MediaQuotaPlan>;

/** 'DIARY_MEDIA_FREE_MONTHLY_MB=200' 같은 환경변수로 MB 단위 오버라이드 */
function bytesFromEnv(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const mb = Number(raw);
  return Number.isFinite(mb) && mb > 0 ? Math.floor(mb * MB) : fallback;
}

function msFromEnv(envKey: string, fallback: number | null): number | null {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.floor(seconds * 1000)
    : fallback;
}

function boolFromEnv(envKey: string, fallback: boolean): boolean {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true';
}

function planFromEnv(tier: keyof typeof DEFAULTS, prefix: string) {
  const d = DEFAULTS[tier];
  return {
    monthlyBytes: bytesFromEnv(`${prefix}_MONTHLY_MB`, d.monthlyBytes),
    totalBytes: bytesFromEnv(`${prefix}_TOTAL_MB`, d.totalBytes),
    perFileBytes: bytesFromEnv(`${prefix}_PER_FILE_MB`, d.perFileBytes),
    videoAllowed: boolFromEnv(`${prefix}_VIDEO_ALLOWED`, d.videoAllowed),
    maxVideoDurationMs: msFromEnv(
      `${prefix}_MAX_VIDEO_SECONDS`,
      d.maxVideoDurationMs,
    ),
  } satisfies MediaQuotaPlan;
}

export default registerAs('diaryMedia', () => ({
  plans: {
    free: planFromEnv('free', 'DIARY_MEDIA_FREE'),
    ad_free: planFromEnv('ad_free', 'DIARY_MEDIA_AD_FREE'),
    premium: planFromEnv('premium', 'DIARY_MEDIA_PREMIUM'),
  } as Record<string, MediaQuotaPlan>,

  /** presigned PUT URL 유효 시간 (초) */
  uploadUrlExpiresIn: Number(process.env.DIARY_MEDIA_UPLOAD_URL_TTL || 600),
  /** 조회용 presigned GET URL 유효 시간 (초) */
  viewUrlExpiresIn: Number(process.env.DIARY_MEDIA_VIEW_URL_TTL || 3600),
  /** PENDING 예약 유효 시간 (분) — 지나면 정리 대상 */
  reservationTtlMinutes: Number(
    process.env.DIARY_MEDIA_RESERVATION_TTL_MINUTES || 15,
  ),
  /** 고아 미디어(일기에 붙지 않은 CONFIRMED) 유예 시간 (시간) */
  orphanTtlHours: Number(process.env.DIARY_MEDIA_ORPHAN_TTL_HOURS || 24),
}));
