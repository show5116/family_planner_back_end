import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * 인증 관련 공통 응답 (401)
 */
export function ApiAuthResponses() {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
  );
}

/**
 * 운영자 권한 관련 공통 응답 (401, 403)
 */
export function ApiAdminResponses() {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
  );
}

/**
 * 생성 관련 공통 응답 (201, 401, 403, 409)
 * @param responseDto 성공 시 응답 DTO
 * @param conflictMessage 409 에러 메시지 (기본값: '중복된 데이터')
 */
export function ApiCreateResponses(
  responseDto: Type<unknown>,
  conflictMessage = '중복된 데이터',
) {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description: '생성 성공',
      type: responseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
    ApiResponse({
      status: 409,
      description: conflictMessage,
    }),
  );
}

/**
 * 조회(목록) 관련 공통 응답 (200, 401, 403)
 * @param responseDto 성공 시 응답 DTO
 */
export function ApiGetListResponses(responseDto: Type<unknown>) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '조회 성공',
      type: responseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
  );
}

/**
 * 조회(단건) 관련 공통 응답 (200, 401, 403, 404)
 * @param responseDto 성공 시 응답 DTO
 */
export function ApiGetOneResponses(responseDto: Type<unknown>) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '조회 성공',
      type: responseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    }),
  );
}

/**
 * 수정 관련 공통 응답 (200, 401, 403, 404, 409)
 * @param responseDto 성공 시 응답 DTO
 * @param conflictMessage 409 에러 메시지 (기본값: '중복된 데이터')
 */
export function ApiUpdateResponses(
  responseDto: Type<unknown>,
  conflictMessage = '중복된 데이터',
) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '수정 성공',
      type: responseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    }),
    ApiResponse({
      status: 409,
      description: conflictMessage,
    }),
  );
}

/**
 * 삭제 관련 공통 응답 (200, 401, 403, 404)
 * @param responseDto 성공 시 응답 DTO
 */
export function ApiDeleteResponses(responseDto: Type<unknown>) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '삭제 성공',
      type: responseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    }),
  );
}

/**
 * 하드 삭제 관련 공통 응답 (200, 400, 401, 403, 404)
 * @param responseDto 성공 시 응답 DTO
 * @param badRequestMessage 400 에러 메시지 (기본값: '삭제할 수 없는 리소스')
 */
export function ApiHardDeleteResponses(
  responseDto: Type<unknown>,
  badRequestMessage = '삭제할 수 없는 리소스',
) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '완전 삭제 성공',
      type: responseDto,
    }),
    ApiResponse({
      status: 400,
      description: badRequestMessage,
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: '권한 없음 (운영자 전용)',
    }),
    ApiResponse({
      status: 404,
      description: '리소스를 찾을 수 없음',
    }),
  );
}
