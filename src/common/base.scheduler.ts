import { isProductionEnv } from './app-env.util';

export function isSchedulerEnabled(schedulerName: string): boolean {
  // 양산 서버는 전부 활성. 개발 서버는 APP_ENV=development로 두고
  // ENABLE_SCHEDULER에 명시한 스케줄러만 돌린다.
  if (isProductionEnv()) return true;
  const enabled = process.env.ENABLE_SCHEDULER;
  if (!enabled) return false;
  return enabled
    .split(',')
    .map((s) => s.trim())
    .includes(schedulerName);
}
