export function isSchedulerEnabled(schedulerName: string): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const enabled = process.env.ENABLE_SCHEDULER;
  if (!enabled) return false;
  return enabled
    .split(',')
    .map((s) => s.trim())
    .includes(schedulerName);
}
