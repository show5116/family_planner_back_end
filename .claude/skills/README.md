# Claude Skills

이 디렉토리는 Claude Code에서 사용할 수 있는 커스텀 스킬들을 포함합니다.

## 📖 사용 가이드

**처음 사용하시나요?** → [WORKFLOW.md](WORKFLOW.md) 필독!

개발 워크플로우와 각 스킬을 언제 어떻게 사용하는지 상세히 안내합니다.

---

## ⚡ 핵심 스킬 (권장)

### ✅ validate (빠른 검증)

**목적:** 코드 작성 후 TypeScript, ESLint, CODE_STYLE 검증

**포함:**
- TypeScript 컴파일 에러
- ESLint 에러/경고
- CODE_STYLE.md 준수 (절대 경로, async 제거, Response DTO)
- Swagger 문서화 누락

**언제:**
- ✅ 코드 작성 완료 후 (필수)
- ✅ Git commit 전 (필수)

**사용법:** "검증해줘" 또는 `/validate`

자세한 내용은 [validate.md](validate.md)를 참고하세요.

---

### 📝 finalize (문서화 및 마무리)

**목적:** 문서를 최신 상태로 업데이트하고 ROADMAP 진행률 자동 계산

**포함:**
- 기능 문서 업데이트 (requirements, api, database, implementation)
- ROADMAP 진행률 자동 계산
- 최종 확인 체크리스트

**언제:**
- ✅ `/validate` 통과 후 (필수)
- ✅ Git commit 직전

**사용법:** "마무리해줘" 또는 `/finalize`

자세한 내용은 [finalize.md](finalize.md)를 참고하세요.

## 🔧 보조 스킬

### 🎯 pre-dev (개발 시작 전 준비)

**목적:** 토큰 절약하며 필요한 문서만 로드

**언제:**
- ✅ 새 기능 개발 시작 전
- ✅ 큰 리팩토링 전

**제공 정보:**
- 기능 문서 요약 (requirements, API, DB 스키마)
- CODE_STYLE 핵심 규칙
- 구현 순서 가이드

**사용법:** "공지사항 개발 시작해줘"

자세한 내용은 [pre-dev.md](pre-dev.md)를 참고하세요.

---

### 🗄️ prisma-workflow (DB 변경)

**목적:** Prisma 스키마 변경 안전하게 적용

**실행 순서:**
1. `npm run prisma:generate`
2. `npm run prisma:migrate`
3. SQL 미리보기
4. 문서 업데이트 안내

**언제:**
- ✅ Prisma 스키마 수정 후
- ✅ 새 모델 추가 후

**사용법:** "Prisma 업데이트해줘"

자세한 내용은 [prisma-workflow.md](prisma-workflow.md)를 참고하세요.

### 🔍 code-review (선택적)

**목적:** 여러 관점에서 심층 코드 리뷰

**관점 (병렬 실행):**
1. 🔒 보안 취약점
2. ⚡ 성능 이슈
3. 🛠️ 유지보수성
4. 🧪 테스팅

**언제:**
- ✅ PR 생성 전 (선택)
- ✅ 중요한 비즈니스 로직

**우선순위:**
- 🔴 Critical - 즉시 수정
- 🟠 High - 빠른 수정 권장
- 🟡 Medium - 수정 권장
- 🟢 Low - 선택적 개선

**사용법:** "코드 리뷰해줘"

자세한 내용은 [code-review.md](code-review.md)를 참고하세요.

---

## 📦 Deprecated (사용 중단)

다음 스킬들은 더 나은 스킬로 통합되었습니다:

- ❌ **post-dev** → `/validate` + `/finalize`로 분리
- ❌ **check-errors** → `/validate`에 통합
- ❌ **code-style-check** → `/validate`에 통합
- ❌ **update-swagger** → `/validate`에 통합
- ❌ **update-docs** → `/finalize`에 통합

기존 문서는 참고용으로 남아있습니다.

---

## 🚀 빠른 시작

### 새 기능 개발
```
"공지사항 개발 시작해줘" → pre-dev
코드 작성
"검증해줘" → validate
"마무리해줘" → finalize
Git commit
```

### DB 변경 포함
```
schema.prisma 수정
"Prisma 업데이트해줘" → prisma-workflow
코드 작성
"검증해줘" → validate
"마무리해줘" → finalize
```

### PR 전 검토
```
개발 완료
"코드 리뷰해줘" → code-review (선택)
Critical/High 이슈 수정
"검증해줘" → validate
PR 생성
```

---

## 💡 토큰 효율 팁

1. **pre-dev**: 기능명 정확히 입력 ("알림" → docs/features/10-notifications.md 직접 접근)
2. **validate**: 변경 파일만 검사
3. **finalize**: 모듈명 기반 문서 직접 접근
4. **code-review**: 꼭 필요할 때만 (토큰 많이 사용)

---

## 📚 추가 정보

- [WORKFLOW.md](WORKFLOW.md) - 개발 워크플로우 상세 가이드
- [CODE_STYLE.md](../../CODE_STYLE.md) - 코드 작성 규칙
- [ROADMAP.md](../../ROADMAP.md) - 프로젝트 로드맵

각 스킬의 상세한 사용법은 개별 Markdown 파일을 참고하세요.
