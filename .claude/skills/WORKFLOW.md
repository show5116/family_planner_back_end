# 개발 워크플로우 가이드

NestJS 백엔드 개발 시 권장하는 스킬 사용 순서입니다.

## 🎯 핵심 원칙

1. **토큰 효율**: 필요한 문서만 읽기
2. **빠른 피드백**: 검증 → 문서화 분리
3. **자동화**: 반복 작업 스킬로 대체

---

## 🚀 워크플로우 (권장 순서)

### 1️⃣ 새 기능 개발

```
/pre-dev [기능명]
  ↓
코드 작성 (DTO → Service → Controller)
  ↓
/validate (TypeScript/ESLint/CODE_STYLE 검사)
  ↓
에러 수정 후 재검증
  ↓
/finalize (문서 업데이트 + ROADMAP)
  ↓
Git commit
```

**예시:**
```bash
# 1. 개발 시작
"공지사항 기능 개발 시작해줘" → Claude가 /pre-dev 실행

# 2. 코드 작성
... (개발 진행)

# 3. 빠른 검증
"검증해줘" → /validate

# 4. 문서화
"마무리해줘" → /finalize

# 5. Git
"커밋해줘"
```

---

### 2️⃣ DB 변경 포함 개발

```
/pre-dev [기능명]
  ↓
Prisma schema 수정
  ↓
/prisma-workflow (generate → migrate)
  ↓
코드 작성
  ↓
/validate
  ↓
/finalize
  ↓
Git commit (schema + migrations 포함)
```

**예시:**
```bash
# 1. DB 스키마 먼저 수정
schema.prisma 수정

# 2. Prisma 워크플로우
"Prisma 업데이트해줘" → /prisma-workflow

# 3. 이후 일반 워크플로우 동일
/validate → /finalize
```

---

### 3️⃣ 버그 수정

```
버그 재현 및 원인 파악
  ↓
코드 수정
  ↓
/validate (필수)
  ↓
/finalize (관련 문서만 업데이트)
  ↓
Git commit
```

**예시:**
```bash
# 간단한 버그는 pre-dev 생략 가능
"이 버그 수정해줘"
  ↓
수정 완료 후 /validate
```

---

### 4️⃣ Pull Request 전 검토

```
개발 완료 (위 워크플로우 완료)
  ↓
/code-review (선택, 중요 기능만)
  ↓
🔴 Critical 이슈 수정
  ↓
🟠 High 이슈 수정 (권장)
  ↓
/validate (재검증)
  ↓
PR 생성
```

**예시:**
```bash
# PR 전에만 선택적 사용
"코드 리뷰해줘" → /code-review

# Critical/High 이슈 수정 후
/validate → PR 생성
```

---

## 📋 스킬 상세 설명

### 🎯 pre-dev (개발 시작)

**목적:** 토큰 절약하며 필요한 문서만 로드

**언제:**
- ✅ 새 기능 개발 시작 전
- ✅ 큰 리팩토링 전
- ❌ 간단한 버그 수정 (불필요)

**효과:**
- 해당 기능 문서만 읽음 → 토큰 90% 절약
- CODE_STYLE 핵심 규칙 요약
- 구현 순서 가이드

**사용법:**
```
"공지사항 개발 시작해줘"
"알림 기능 리팩토링 준비해줘"
```

---

### ✅ validate (빠른 검증)

**목적:** 코드 품질 빠르게 확인

**포함:**
1. TypeScript 컴파일 에러
2. ESLint 에러/경고
3. CODE_STYLE.md 준수 (절대 경로, async 제거, Response DTO)
4. Swagger 문서화 누락

**언제:**
- ✅ 코드 작성 완료 후 (필수)
- ✅ Git commit 전 (필수)
- ✅ 에러 수정 후 재검증

**통과 기준:**
- TypeScript 에러 0개
- ESLint 에러 0개
- Response DTO 모두 명시
- 절대 경로 사용

**사용법:**
```
"검증해줘"
"validate 돌려줘"
```

---

### 📝 finalize (문서화)

**목적:** 문서를 최신 상태로 유지

**포함:**
1. 기능 문서 업데이트 (api.md, database.md, implementation.md)
2. requirements.md 체크박스 (⬜ → ✅)
3. ROADMAP.md 진행률 자동 계산
4. Swagger UI 최종 확인

**언제:**
- ✅ 기능 개발 완료 후 (필수)
- ✅ validate 통과 후
- ✅ Git commit 직전

**자동 수행:**
- 변경된 모듈명 추출 (예: src/auth/ → auth)
- docs/features/[모듈명]/ 문서 업데이트
- 진행률 계산: (완료 작업 / 전체 작업) × 100

**사용법:**
```
"마무리해줘"
"문서 업데이트해줘"
```

---

### 🗄️ prisma-workflow (DB 변경)

**목적:** Prisma 스키마 변경 안전하게 적용

**실행 순서:**
1. schema.prisma 변경 확인
2. `npm run prisma:generate`
3. `npm run prisma:migrate`
4. SQL 미리보기
5. 관련 문서 업데이트 안내

**언제:**
- ✅ 새 모델 추가
- ✅ 필드 추가/수정/삭제
- ✅ 관계(Relation) 변경

**주의:**
- 항상 generate → migrate 순서
- 데이터 손실 위험 확인 (DROP COLUMN/TABLE)

**사용법:**
```
"Prisma 업데이트해줘"
"DB 마이그레이션해줘"
```

---

### 🔍 code-review (심층 리뷰)

**목적:** 여러 관점에서 코드 품질 검토

**관점 (병렬 실행):**
1. 🔒 보안 취약점 (Injection, 인증 우회, 민감 정보)
2. ⚡ 성능 이슈 (N+1 쿼리, 메모리 누수, 캐싱)
3. 🛠️ 유지보수성 (복잡도, 결합도, CODE_STYLE)
4. 🧪 테스팅 (커버리지, 품질)

**언제:**
- ✅ PR 생성 전 (선택)
- ✅ 중요한 비즈니스 로직
- ❌ 간단한 수정 (불필요)

**우선순위:**
- 🔴 Critical - 즉시 수정 필수
- 🟠 High - 빠른 수정 권장
- 🟡 Medium - 수정 권장
- 🟢 Low - 선택적 개선

**사용법:**
```
"코드 리뷰해줘"
"보안 검토해줘"
```

---

## ⚡ 빠른 참조

| 상황 | 스킬 순서 | 소요 시간 |
|------|-----------|-----------|
| 새 기능 | pre-dev → validate → finalize | 5-10분 |
| DB 변경 | pre-dev → prisma-workflow → validate → finalize | 10-15분 |
| 버그 수정 | validate → finalize | 3-5분 |
| PR 전 | code-review → validate | 10-20분 |

---

## 💡 팁

### 토큰 절약
- pre-dev: 기능명 정확히 입력 (예: "알림" → docs/features/10-notifications.md 직접 접근)
- validate: 변경 파일만 검사
- code-review: 꼭 필요할 때만 사용

### 자동화
- validate 실패 시 자동으로 에러 수정 제안
- finalize가 진행률 자동 계산
- prisma-workflow가 문서 업데이트 위치 안내

### 에러 처리
- validate 실패 → 수정 → 재실행 (반복)
- finalize는 validate 통과 후에만 실행
- code-review 이슈는 우선순위별로 처리

---

## 📚 관련 문서

- [README.md](README.md) - 전체 스킬 목록
- [CODE_STYLE.md](../../CODE_STYLE.md) - 코드 작성 규칙
- [ROADMAP.md](../../ROADMAP.md) - 프로젝트 로드맵
- [CLAUDE.md](../../CLAUDE.md) - Claude 사용 가이드
