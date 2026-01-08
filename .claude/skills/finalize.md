# Finalize - 문서화 및 마무리

코드 개발 완료 후 문서를 최신 상태로 업데이트하고 ROADMAP 진행률을 자동 계산하는 통합 스킬입니다.

## ✨ 통합 스킬

이 스킬은 다음을 통합합니다:
- ✅ update-docs (문서 업데이트)
- ✅ ROADMAP 진행률 자동 계산
- ✅ 최종 확인 체크리스트

## 사용 시점

- ✅ `/validate` 통과 후 (필수)
- ✅ 기능 개발 완료 후
- ✅ Git commit 직전

## 전제 조건

**finalize 실행 전 반드시:**
```
/validate 통과 ✅
├ TypeScript 에러: 0개
├ ESLint 에러: 0개
├ CODE_STYLE 준수
└ Swagger 문서화 완료
```

**validate를 통과하지 않으면 finalize 실행 불가!**

## 실행 순서

### 1단계: 변경 사항 분석

**자동 분석:**
```bash
# 변경된 파일 확인
git diff --name-only --cached
git diff --name-only

# 모듈명 추출
src/auth/auth.service.ts → "auth"
src/notification/notification.controller.ts → "notification"
```

**분석 항목:**
- 수정된 모듈/기능 (예: auth, group, notification)
- 변경된 API 엔드포인트
- 수정된 비즈니스 로직
- 변경된 데이터베이스 스키마

### 2단계: 기능 문서 업데이트

**문서 위치:**
```
docs/features/[기능명]/
  ├ requirements.md     - 요구사항 및 체크박스
  ├ api.md             - API 엔드포인트 명세
  ├ database.md        - 데이터베이스 스키마
  └ implementation.md  - 구현 완료 요약
```

**자동 찾기:**
```bash
# 모듈명으로 문서 찾기
find docs/features/ -name "*auth*.md"
find docs/features/ -name "*notification*.md"

# 없으면 파일명 기반 검색
ls docs/features/ | grep -i "auth"
```

#### 2.1 requirements.md 업데이트

**체크박스 상태 변경:**
```markdown
# Before
- ⬜ 이메일 인증 코드 발송
- ⬜ 인증 코드 검증

# After
- ✅ 이메일 인증 코드 발송
- ✅ 인증 코드 검증
```

**상태:**
- ⬜ 미시작
- 🟨 진행 중
- ✅ 완료

#### 2.2 api.md 업데이트

**실제 코드와 동기화:**
```markdown
## POST /auth/verify-email

이메일 인증 코드를 발송합니다.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "인증 코드가 발송되었습니다"
}
```

**Errors:**
- 400: 잘못된 이메일 형식
- 429: 너무 많은 요청
```

**자동 확인:**
- Controller 코드에서 엔드포인트 추출
- Request/Response DTO 확인
- 에러 응답 데코레이터 확인

#### 2.3 database.md 업데이트

**Prisma 스키마 변경 반영:**
```markdown
## EmailVerification

이메일 인증 코드를 저장하는 모델입니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String | UUID |
| email | String | 이메일 주소 |
| code | String | 인증 코드 (6자리) |
| expiresAt | DateTime | 만료 시간 |
| createdAt | DateTime | 생성 시간 |
```

**자동 확인:**
```bash
# Prisma 스키마 읽기
cat prisma/schema.prisma | grep -A 10 "model EmailVerification"
```

#### 2.4 implementation.md 업데이트

**구현 완료 요약 추가:**
```markdown
## 구현 완료 요약

### 주요 변경사항
- ✅ 이메일 인증 코드 발송 API 구현
- ✅ 인증 코드 검증 로직 구현
- ✅ Redis를 통한 인증 코드 저장 (TTL 5분)
- ✅ Nodemailer를 통한 이메일 발송

### 기술 스택
- Nodemailer (이메일 발송)
- Redis (인증 코드 저장)
- class-validator (DTO 검증)

### 파일 변경 내역
- src/auth/auth.controller.ts - POST /auth/verify-email 추가
- src/auth/auth.service.ts - sendVerificationCode(), verifyCode() 추가
- src/auth/dto/verify-email.dto.ts - DTO 추가

### 테스트
- ✅ 단위 테스트 (auth.service.spec.ts)
- ✅ E2E 테스트 (auth.e2e-spec.ts)

### 알려진 이슈
- 없음
```

### 3단계: ROADMAP.md 진행률 자동 계산

**자동 계산:**
```bash
# ROADMAP.md에서 체크박스 추출
grep -E "- \[(x| )\]" ROADMAP.md

# Phase별 진행률 계산
Phase 1: 완료 8개 / 전체 10개 = 80%
Phase 2: 완료 3개 / 전체 12개 = 25%
```

**업데이트 예시:**
```markdown
# Before
### Phase 1: 사용자 관리 🟡
**진행률: 75%**

- [x] 사용자 인증 (Firebase Auth)
- [x] 알림 시스템
- [ ] 이메일 인증 시스템
- [ ] 프로필 관리

# After
### Phase 1: 사용자 관리 🟢
**진행률: 85%**

- [x] ~~사용자 인증 (Firebase Auth)~~ ✅
- [x] ~~알림 시스템~~ ✅
- [x] 이메일 인증 시스템 ✅ (새로 완료)
- [ ] 프로필 관리 🟨 (진행 중)
```

**상태 아이콘:**
- 🔴 0-30%: Not Started
- 🟡 31-70%: In Progress
- 🟢 71-100%: Completed

### 4단계: 최종 확인

**자동 체크리스트:**
```
✅ 최종 확인 체크리스트

문서:
├ ✅ requirements.md - 체크박스 업데이트 (3개)
├ ✅ api.md - 엔드포인트 추가 (2개)
├ ✅ database.md - 스키마 동기화
└ ✅ implementation.md - 구현 요약 작성

ROADMAP:
├ ✅ Phase 1 진행률: 75% → 85%
├ ✅ 완료 작업 체크 (3개)
└ ✅ 상태 아이콘 업데이트 (🟡 → 🟢)

코드:
├ ✅ TypeScript 에러: 0개
├ ✅ ESLint 에러: 0개
├ ✅ CODE_STYLE 준수
└ ✅ Swagger 문서화 완료

다음 단계:
1. Swagger UI 확인: http://localhost:3000/api
2. Git commit 준비
3. (선택) /code-review 실행
```

## 결과 요약

**성공 시:**
```
📝 문서화 완료!

✅ 업데이트한 문서:
1. docs/features/auth/requirements.md
   - 체크박스 3개 완료 처리

2. docs/features/auth/api.md
   - POST /auth/verify-email 엔드포인트 추가
   - Response DTO 업데이트

3. docs/features/auth/database.md
   - EmailVerification 모델 추가

4. docs/features/auth/implementation.md
   - 구현 완료 요약 작성

5. ROADMAP.md
   - Phase 1 진행률: 75% → 85%
   - 이메일 인증 시스템 완료 표시
   - 상태 아이콘: 🟡 → 🟢

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 개발 완료!

다음 단계:
1. Swagger UI 확인: http://localhost:3000/api
2. Git commit: "feat: 이메일 인증 시스템 구현"
3. (선택) /code-review 실행하여 심층 검토
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 자동화 로직

### 모듈명 추출
```typescript
// src/auth/auth.service.ts → "auth"
const moduleName = filePath.split('/')[1];

// docs/features/ 검색
const featureDocs = glob(`docs/features/*${moduleName}*.md`);
```

### 진행률 계산
```typescript
// ROADMAP.md 파싱
const phase1Tasks = roadmap.match(/### Phase 1:[\s\S]*?### Phase 2:/);
const completed = (phase1Tasks.match(/- \[x\]/g) || []).length;
const total = (phase1Tasks.match(/- \[(x| )\]/g) || []).length;
const progress = Math.round((completed / total) * 100);

// 아이콘 결정
const icon = progress <= 30 ? '🔴' : progress <= 70 ? '🟡' : '🟢';
```

### 문서 동기화 검증
```typescript
// Controller 엔드포인트 추출
const endpoints = grep('@(Get|Post|Put|Delete)', 'src/**/*.controller.ts');

// api.md와 비교
const documented = apiMd.match(/## (GET|POST|PUT|DELETE) \/.*/g);

// 누락된 엔드포인트 경고
const missing = endpoints.filter(e => !documented.includes(e));
```

## 주의사항

- **validate 통과 필수**: 에러가 있으면 finalize 실행 안 됨
- **문서와 코드 동기화**: 실제 코드와 정확히 일치해야 함
- **진행률 정확성**: ROADMAP 체크박스 기반 자동 계산
- **Git commit 전**: finalize 완료 후 커밋

## 토큰 최적화

- 변경된 모듈명 기반 문서 직접 접근
- 전체 문서 읽지 않고 필요한 섹션만 수정
- ROADMAP 진행률 자동 계산 (수동 입력 불필요)

## 에러 처리

### validate 미실행
```
❌ validate를 먼저 실행해주세요!

finalize는 validate 통과 후에만 실행 가능합니다.
다음 명령 실행:
  /validate

통과 후 다시 /finalize 실행
```

### 문서 없음
```
⚠️ 기능 문서가 없습니다

모듈: auth
위치: docs/features/

새 기능 문서를 생성하시겠습니까? (Y/n)
```

### 동기화 오류
```
⚠️ 문서와 코드 불일치

api.md에 없는 엔드포인트:
  - POST /auth/verify-email
  - GET /auth/check-verification

자동으로 추가하시겠습니까? (Y/n)
```

## 참고 자료

- [WORKFLOW.md](WORKFLOW.md) - 개발 워크플로우
- [validate.md](validate.md) - 검증 (finalize 전 필수)
- update-docs.md (deprecated, finalize로 통합됨)
- post-dev.md (deprecated, validate + finalize로 분리됨)
