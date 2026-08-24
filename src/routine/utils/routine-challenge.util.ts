import { RoutineChallengeStatus } from '../dto/routine-challenge-response.dto';

/** startDate/endDate와 오늘(순수 날짜) 기준으로 챌린지 상태를 계산. endDate 당일까지 ONGOING */
export function computeChallengeStatus(
  startDate: Date,
  endDate: Date,
  today: Date,
): RoutineChallengeStatus {
  if (today.getTime() < startDate.getTime())
    return RoutineChallengeStatus.UPCOMING;
  if (today.getTime() > endDate.getTime()) return RoutineChallengeStatus.ENDED;
  return RoutineChallengeStatus.ONGOING;
}

export function computeAchieved(
  checkedCount: number,
  targetCount: number,
): boolean {
  return checkedCount >= targetCount;
}
