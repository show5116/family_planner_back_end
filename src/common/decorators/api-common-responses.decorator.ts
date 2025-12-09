import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * 인증된 엔드포인트의 공통 응답 (컨트롤러 클래스 레벨)
 * - 401: 인증 실패
 * - 500: 서버 에러
 */
export function ApiCommonAuthResponses() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 500, description: '서버 에러' }),
  );
}

/**
 * 운영자 전용 엔드포인트의 공통 응답 (컨트롤러 클래스 레벨)
 * - 401: 인증 실패
 * - 403: 권한 없음 (운영자 전용)
 * - 500: 서버 에러
 */
export function ApiCommonAdminResponses() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음 (운영자 전용)' }),
    ApiResponse({ status: 500, description: '서버 에러' }),
  );
}
