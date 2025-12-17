import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

/**
 * 생성 성공 응답 (201)
 * @param responseDto 성공 시 응답 DTO
 * @param description 응답 설명 (기본값: '생성 성공')
 */
export function ApiCreated(
  responseDto: Type<unknown>,
  description = '생성 성공',
) {
  return ApiCreatedResponse({
    description,
    type: responseDto,
  });
}

/**
 * 조회/수정/삭제 성공 응답 (200)
 * @param responseDto 성공 시 응답 DTO (배열인 경우 isArray: true 옵션 사용)
 * @param description 응답 설명 (기본값: '성공')
 * @param options 추가 옵션 (isArray: 배열 응답 여부)
 */
export function ApiSuccess(
  responseDto: Type<unknown>,
  description = '성공',
  options?: { isArray?: boolean },
) {
  return ApiOkResponse({
    description,
    type: responseDto,
    isArray: options?.isArray,
  });
}

/**
 * 리소스를 찾을 수 없음 (404)
 * @param description 에러 설명
 */
export function ApiNotFound(description = '리소스를 찾을 수 없음') {
  return ApiNotFoundResponse({ description });
}

/**
 * 중복/충돌 에러 (409)
 * @param description 에러 설명
 */
export function ApiConflict(description = '중복된 데이터') {
  return ApiConflictResponse({ description });
}

/**
 * 잘못된 요청 (400)
 * @param description 에러 설명
 */
export function ApiBadRequest(description: string) {
  return ApiBadRequestResponse({ description });
}

/**
 * 권한 관련 에러 (403)
 * @param description 에러 설명
 */
export function ApiForbidden(description = '권한 없음') {
  return ApiResponse({ status: 403, description });
}

/**
 * 여러 특수 응답을 한 번에 적용
 */
export function ApiExtraResponses(...responses: ReturnType<typeof applyDecorators>[]) {
  return applyDecorators(...responses);
}
