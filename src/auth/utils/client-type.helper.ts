/**
 * User-Agent 헤더를 분석하여 클라이언트 타입을 판별하는 헬퍼 함수
 */

/**
 * User-Agent 헤더로부터 웹 브라우저인지 판별
 * @param userAgent - Request의 User-Agent 헤더 값
 * @returns 웹 브라우저이면 true, 모바일 앱이면 false
 */
export function isWebClient(userAgent?: string): boolean {
  if (!userAgent) {
    // User-Agent가 없는 경우 모바일 앱으로 간주
    return false;
  }

  // 일반적인 웹 브라우저 패턴
  const webBrowserPatterns = [
    /Mozilla/i,
    /Chrome/i,
    /Safari/i,
    /Firefox/i,
    /Edge/i,
    /Opera/i,
  ];

  // 모바일 앱 식별 패턴 (예: 커스텀 User-Agent)
  const mobileAppPatterns = [
    /FamilyPlanner-iOS/i,
    /FamilyPlanner-Android/i,
    /FamilyPlannerApp/i,
  ];

  // 모바일 앱 패턴이 매칭되면 웹이 아님
  for (const pattern of mobileAppPatterns) {
    if (pattern.test(userAgent)) {
      return false;
    }
  }

  // 웹 브라우저 패턴이 매칭되면 웹
  for (const pattern of webBrowserPatterns) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }

  // 패턴이 없으면 모바일 앱으로 간주
  return false;
}
