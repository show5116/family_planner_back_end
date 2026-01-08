# Validate - 빠른 코드 검증

코드 작성 후 TypeScript, ESLint, CODE_STYLE.md 준수 여부를 빠르게 검증하는 통합 스킬입니다.

## ✨ 통합 스킬

이 스킬은 다음을 통합합니다:
- ✅ check-errors (TypeScript + ESLint)
- ✅ code-style-check (CODE_STYLE.md 준수)
- ✅ update-swagger (Swagger 문서화)

## 사용 시점

- ✅ 코드 작성 완료 후 (필수)
- ✅ Git commit 전 (필수)
- ✅ 에러 수정 후 재검증
- ✅ Pull Request 생성 전

## 검증 항목

### 1. TypeScript 컴파일 (자동 실행)

```bash
npx tsc --noEmit
```

**검사 내용:**
- 타입 불일치
- 누락된 속성
- Import 경로 오류
- Enum 값 오류

### 2. ESLint (자동 실행)

```bash
npm run lint
```

**검사 내용:**
- 코드 스타일 위반
- 잠재적 버그
- 안전하지 않은 패턴
- 사용하지 않는 코드

### 3. CODE_STYLE.md 준수 (자동 검사)

#### Import - 절대 경로 (`@/`)
```bash
grep -rn "from '\.\.\/" src/ --include="*.ts" | grep -v "node_modules"
```

**목표:** 0건 (모두 절대 경로 사용)

#### Controller - async 제거
```bash
grep -rn "async.*(" src/**/*.controller.ts
```

**목표:** 0건 (모든 async 제거)

#### Controller - Response DTO
```bash
grep -n "@Api\(Success\|Created\)" src/**/*.controller.ts | grep -v "type:"
```

**목표:** 0건 (모든 엔드포인트에 type 명시)

#### DTO - @ApiProperty
```bash
grep -B1 "^\s*[a-zA-Z].*:.*;" src/**/dto/*.ts | grep -v "@Api"
```

**목표:** 0건 (모든 필드에 @ApiProperty)

### 4. Swagger 문서화 (자동 검사)

**검사 내용:**
- Response DTO 누락 (`type` 파라미터)
- 배열 응답 (`[Type]` 또는 `isArray: true`)
- 에러 응답 데코레이터
- 한글 설명 (`description`)

## 실행 순서

### 1단계: TypeScript + ESLint 검사

```bash
npm run check
```

**통과 조건:**
- TypeScript 에러: 0개
- ESLint 에러: 0개

**실패 시:**
- 에러 목록 출력
- 파일별 그룹화
- 주요 에러 요약

### 2단계: CODE_STYLE 검사

**자동 검사:**
1. 상대 경로 import 찾기
2. Controller의 async 키워드 찾기
3. Response DTO 누락 찾기
4. @ApiProperty 누락 찾기

**자동 수정 제안:**
```typescript
// ❌ Before (상대 경로)
import { PrismaService } from '../../prisma/prisma.service';

// ✅ After (절대 경로)
import { PrismaService } from '@/prisma/prisma.service';
```

```typescript
// ❌ Before (async + Response DTO 누락)
@Get()
async getUsers() { ... }

// ✅ After
@Get()
@ApiSuccess({ type: [UserDto], description: '사용자 목록 조회' })
getUsers() { ... }
```

### 3단계: 결과 요약

**모든 검사 통과:**
```
✅ 검증 완료!

✅ TypeScript 컴파일: 통과
✅ ESLint: 통과
✅ CODE_STYLE: 준수
✅ Swagger 문서화: 완료

다음 단계: /finalize 실행하여 문서 업데이트
```

**에러 발견:**
```
⚠️ 수정이 필요합니다

❌ TypeScript 에러: 3개
❌ ESLint 에러: 5개
⚠️ CODE_STYLE 위반: 2개
⚠️ Swagger 누락: 4개

주요 문제:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TypeScript:
  src/auth/auth.service.ts:42 - Type 'string' is not assignable to type 'number'
  src/user/user.dto.ts:15 - Property 'email' is missing

ESLint:
  src/notification/notification.service.ts:28 - @typescript-eslint/no-floating-promises
  src/group/group.controller.ts:56 - @typescript-eslint/require-await

CODE_STYLE:
  src/auth/auth.controller.ts:15 - 상대 경로 사용 (../../dto/auth.dto)
  src/user/user.controller.ts:23 - async 키워드 제거 필요

Swagger:
  src/auth/auth.controller.ts:42 - Response DTO 누락
  src/user/user.controller.ts:18 - @ApiProperty 누락 (UserDto.phoneNumber)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

수정 후 다시 /validate 실행해주세요.
```

## 자동 수정 가능 항목

Claude가 자동으로 수정 제안:

1. **상대 경로 → 절대 경로**
   - `../../` → `@/`

2. **Controller async 제거**
   - `async getUsers()` → `getUsers()`

3. **Response DTO 추가**
   - `@ApiSuccess({ type: [UserDto] })` 추가

4. **@ApiProperty 추가**
   - 누락된 DTO 필드에 추가

## 에러 해결 가이드

### TypeScript 에러

**Type mismatch:**
```typescript
// ❌
const userId: number = req.user.userId; // string을 number에 할당

// ✅
const userId: string = req.user.userId;
```

**Missing property:**
```typescript
// ❌
export class CreateUserDto {
  email: string;
  // name 누락
}

// ✅
export class CreateUserDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  name: string;
}
```

### ESLint 에러

**@typescript-eslint/no-floating-promises:**
```typescript
// ❌
this.emailService.sendVerification(email);

// ✅
void this.emailService.sendVerification(email);
// 또는
await this.emailService.sendVerification(email);
```

**@typescript-eslint/require-await:**
```typescript
// ❌
async getUsers() { return this.users; }

// ✅
getUsers() { return this.users; } // async 제거
```

**@typescript-eslint/unbound-method (테스트):**
```typescript
// 테스트 파일 상단에 추가
/* eslint-disable @typescript-eslint/unbound-method */
```

### CODE_STYLE 위반

**상대 경로:**
```typescript
// ❌
import { AuthService } from '../../auth/auth.service';

// ✅
import { AuthService } from '@/auth/auth.service';
```

**Controller async:**
```typescript
// ❌
@Get()
async getUsers() { ... }

// ✅
@Get()
@ApiSuccess({ type: [UserDto] })
getUsers() { ... }
```

## 통과 기준

모든 항목이 ✅이어야 통과:

- [ ] TypeScript 컴파일 에러: 0개
- [ ] ESLint 에러: 0개
- [ ] ESLint 경고: 0개 (또는 정당한 사유로 disable)
- [ ] 상대 경로 import: 0건
- [ ] Controller async 키워드: 0건
- [ ] Response DTO 누락: 0건
- [ ] @ApiProperty 누락: 0건

**통과 후:**
- ✅ `/finalize` 실행
- ✅ Git commit 준비

## 주의사항

- **validate는 finalize 전에 반드시 실행**
- **모든 에러를 수정할 때까지 반복 실행**
- **ESLint disable은 정당한 사유가 있을 때만 사용**
- **테스트 파일은 일부 규칙 예외 허용**

## 토큰 최적화

- 변경된 파일만 집중 검사 (git diff 활용)
- 에러가 없으면 간단한 요약만 출력
- 에러가 있으면 우선순위 높은 것부터 표시

## 참고 자료

- [CODE_STYLE.md](../../CODE_STYLE.md) - 코드 스타일 가이드
- [WORKFLOW.md](WORKFLOW.md) - 개발 워크플로우
- check-errors.md (deprecated, validate로 통합됨)
- code-style-check.md (deprecated, validate로 통합됨)
- update-swagger.md (deprecated, validate로 통합됨)
