import { registerAs } from '@nestjs/config';

/**
 * 등급별 그룹 수 한도
 *
 * 다이어리 용량과 같은 이유로 앱에 하드코딩하지 않고 서버가 내려준다
 * (한도 조정에 앱 재배포가 필요하면 안 된다).
 *
 * 용량 한도와 성격이 다르다 — 저장 용량은 넘으면 실제 돈이 나가지만 그룹 수는 원가가 0이다.
 * 그래서 이 한도의 목적은 비용 방어가 아니라 **전환 동기**다. 용량은 "한 명만 올리면" 우회되지만
 * 그룹 수는 우회할 수 없어서, 유료 등급으로 올라갈 이유가 된다.
 *
 * 다만 어느 등급도 무제한으로 두지 않는다. 상한이 없으면 어뷰징을 막을 수단이 사라지고,
 * "무제한"이라고 한 번 광고하면 나중에 되돌릴 수 없다.
 */

const DEFAULTS = {
  free: 1,
  ad_free: 1, // ad_free의 정체성은 광고 제거다. 그룹 수는 premium 전용 혜택으로 둔다
  premium: 5, // 본가·처가·친구·동아리까지 커버되는 수준
} satisfies Record<string, number>;

/** 'GROUP_QUOTA_PREMIUM_MAX=10' 같은 환경변수로 오버라이드 */
function countFromEnv(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const count = Number(raw);
  return Number.isInteger(count) && count > 0 ? count : fallback;
}

export default registerAs('groupQuota', () => ({
  maxGroups: {
    free: countFromEnv('GROUP_QUOTA_FREE_MAX', DEFAULTS.free),
    ad_free: countFromEnv('GROUP_QUOTA_AD_FREE_MAX', DEFAULTS.ad_free),
    premium: countFromEnv('GROUP_QUOTA_PREMIUM_MAX', DEFAULTS.premium),
  } as Record<string, number>,
}));
