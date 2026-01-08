# Swagger Documentation Update

⚠️ **DEPRECATED**: 이 스킬은 `/validate`에 통합되었습니다.

**대신 사용:** `/validate` (TypeScript + ESLint + CODE_STYLE + Swagger)

---

<details>
<summary>기존 문서 (참고용)</summary>

NestJS 특성상 누락되기 쉬운 Response DTO를 포함하여 Swagger 문서화를 최신 상태로 유지하는 스킬입니다.

## 사용 시점
- API 엔드포인트 추가/수정 후
- DTO 클래스 수정 후
- 컨트롤러 변경 후

## 주요 검사 항목

### 1. Response DTO 누락 (가장 중요!)
NestJS는 Response DTO를 자동 추론하지 않으므로 **반드시 명시**해야 합니다.

```typescript
// ❌ 잘못된 예
@Get()
async getUsers() { ... }

// ✅ 올바른 예
@Get()
@ApiSuccess({ type: [UserDto], description: '사용자 목록 조회' })
getUsers() { ... }
```

### 2. 커스텀 데코레이터 사용
- `@ApiSuccess({ type: Dto })` - 200 OK
- `@ApiCreated({ type: Dto })` - 201 Created
- `@ApiBadRequest()`, `@ApiUnauthorized()`, `@ApiNotFound()`, `@ApiConflict()` 등

### 3. 한글 문서화
- `@ApiTags('인증')` - 컨트롤러 태그
- `@ApiOperation({ summary: '로그인' })` - 엔드포인트 요약

### 4. DTO 필드 문서화
```typescript
export class CreateUserDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: '전화번호', example: '010-1234-5678' })
  phoneNumber?: string;
}
```

## 검사 스크립트

```bash
# Response DTO 누락 찾기
grep -n "@Api\(Success\|Created\)" src/**/*.controller.ts | grep -v "type:"

# DTO에서 @ApiProperty 누락 찾기
grep -B1 "^\s*[a-zA-Z].*:.*;" src/**/dto/*.ts | grep -v "@Api"

# async 키워드 사용 찾기 (CODE_STYLE 위반)
grep -n "async.*(" src/**/*.controller.ts
```

## 자동 수정 예시

### Response DTO 추가
```typescript
// Before
@Get()
getUsers() { ... }

// After
@Get()
@ApiSuccess({ type: [UserDto], description: '사용자 목록 조회' })
getUsers() { ... }
```

### 에러 응답 추가
```typescript
// Before
@Post()
@ApiCreated({ type: UserDto })
createUser(@Body() dto: CreateUserDto) { ... }

// After
@Post()
@ApiCreated({ type: UserDto, description: '사용자 생성 성공' })
@ApiBadRequest({ description: '잘못된 요청 데이터' })
@ApiConflict({ description: '이미 존재하는 이메일' })
createUser(@Body() dto: CreateUserDto) { ... }
```

## 체크리스트

**컨트롤러:**
- [ ] 모든 엔드포인트에 Response DTO 명시 (`type` 파라미터)
- [ ] 배열 응답에 `[Type]` 또는 `isArray: true` 사용
- [ ] 에러 응답 데코레이터 추가
- [ ] 한글 설명 작성
- [ ] `async` 키워드 제거 (CODE_STYLE 준수)

**DTO:**
- [ ] 모든 필드에 `@ApiProperty()` 또는 `@ApiPropertyOptional()`
- [ ] `description` (한글) 및 `example` 값 제공

**확인:**
- [ ] http://localhost:3000/api 에서 Swagger UI 확인
- [ ] Request/Response 스키마 및 예시 값 확인

## 참고
- [CODE_STYLE.md](../../../CODE_STYLE.md) - 코드 스타일 가이드
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)

</details>
