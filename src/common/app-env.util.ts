/**
 * 배포 환경(양산/개발) 구분 유틸
 *
 * NODE_ENV는 빌드·런타임 최적화 목적이라 개발 서버도 `production`으로 띄우는 경우가 많다.
 * "어느 서버에서 나간 동작인가"는 NODE_ENV로 판단할 수 없으므로 APP_ENV로 분리한다.
 * APP_ENV가 없으면 기존 동작 그대로 NODE_ENV를 따른다.
 */
export type AppEnv = 'production' | 'development' | 'test';

export function getAppEnv(): AppEnv {
  const raw = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  return raw === 'production' || raw === 'test' ? raw : 'development';
}

export function isProductionEnv(): boolean {
  return getAppEnv() === 'production';
}

/**
 * 알림 제목에 붙일 환경 접두사 (양산은 빈 문자열)
 * 개발 서버가 같은 Firebase 프로젝트로 푸시를 보내기 때문에,
 * 사용자가 알림만 보고 어느 환경에서 온 것인지 구분할 수 있어야 한다.
 */
export function getNotificationEnvPrefix(): string {
  if (isProductionEnv()) return '';
  return getAppEnv() === 'test' ? '[TEST] ' : '[DEV] ';
}
