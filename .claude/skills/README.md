# Claude Skills

이 디렉토리는 Claude Code에서 사용할 수 있는 커스텀 스킬들을 포함합니다.

## 사용 가능한 스킬

### 🔍 check-errors

코드 수정 후 TypeScript 컴파일 에러와 ESLint 에러를 자동으로 확인하는 스킬입니다.

### 🔍 code-review

코드 작성 후 여러 관점에서 병렬로 코드를 리뷰하고 우선순위별 리포트를 생성하는 스킬입니다.

**언제 사용하나요?**
- ✅ 새로운 기능 구현 후
- ✅ 중요한 비즈니스 로직 수정 후
- ✅ Pull Request 생성 전
- ✅ 코드 리팩토링 후

**리뷰 관점 (병렬 실행):**
1. 🔒 **보안 취약점** - 인젝션, 인증 우회, 민감 정보 노출 등
2. ⚡ **성능 이슈** - N+1 쿼리, 메모리 누수, 캐싱 기회 등
3. 🛠️ **유지보수성** - 코드 복잡도, 결합도, 스타일 준수 등
4. 🧪 **테스팅** - 테스트 커버리지, 품질, 테스트 가능성 등

**실행 순서:**
1. 변경 사항 확인 (git diff 또는 특정 파일)
2. 4개 Task를 **병렬**로 실행하여 각 관점 리뷰
3. 결과 종합 및 **우선순위별 리포트** 생성 (🔴/🟠/🟡/🟢)
4. 액션 아이템 체크리스트 제공

**우선순위:**
- 🔴 Critical - 즉시 수정 필요 (보안 취약점, 심각한 성능 이슈)
- 🟠 High - 빠른 수정 권장 (N+1 쿼리, 테스트 누락)
- 🟡 Medium - 수정 권장 (코드 스타일, 캐싱 미사용)
- 🟢 Low - 선택적 개선 (함수 분리, 주석 추가)

자세한 내용은 [code-review.md](code-review.md)를 참고하세요.

---

### 📝 update-docs

비즈니스 로직 변경 시 관련 문서를 자동으로 찾아서 업데이트하는 스킬입니다.

**언제 사용하나요?**
- ✅ 비즈니스 로직 수정 후
- ✅ 새로운 기능 추가 후
- ✅ API 엔드포인트 변경 후
- ✅ 데이터베이스 스키마 수정 후

**업데이트 대상 문서:**
1. **기능별 문서** (`docs/features/[기능명]/`)
   - requirements.md - 요구사항 및 체크박스 상태
   - api.md - API 엔드포인트 명세
   - database.md - 데이터베이스 스키마
   - implementation.md - 구현 완료 요약

2. **프로젝트 문서**
   - ROADMAP.md - Phase별 진행률 및 완료 상태
   - TODO.md - 프로젝트 개요 및 문서 인덱스

**실행 순서:**
1. 변경 사항 분석 (수정된 모듈/API/스키마 파악)
2. 관련 문서 찾기 (기능명 기반 검색)
3. 문서 업데이트 (체크박스, 진행률, API 명세 등)
4. 결과 요약 보고

자세한 내용은 [update-docs.md](update-docs.md)를 참고하세요.

---

### 🔍 check-errors (기존)

**사용 방법:**
```bash
npm run check
```

**개별 체크:**
```bash
npm run check:types    # TypeScript 컴파일 에러만
npm run check:lint     # ESLint 에러만
```

**언제 사용하나요?**
- ✅ 코드 수정 후
- ✅ 새로운 기능 추가 후
- ✅ Pull Request 생성 전
- ✅ Git commit 전

**검사 항목:**
1. **TypeScript 컴파일 에러**
   - 타입 불일치
   - 누락된 속성
   - Import 경로 오류
   - Enum 값 오류

2. **ESLint 에러 및 경고**
   - 코드 스타일 위반
   - 잠재적 버그
   - 안전하지 않은 패턴
   - 사용하지 않는 코드

**출력 예시:**

✅ **모든 검사 통과 시:**
```
🎉 모든 검사를 통과했습니다!

✅ TypeScript 컴파일: 통과
✅ ESLint: 통과
```

❌ **에러가 있을 시:**
```
⚠️ 수정이 필요한 항목이 있습니다

TypeScript 에러: 3개
ESLint 에러: 5개
ESLint 경고: 2개

주요 에러:
src/example.ts:42:7 - error TS2322: Type 'string' is not assignable to type 'number'
src/test.spec.ts:15:14 - error: A method that is not declared with `this: void`...
```

## 스킬 작성 가이드

새로운 스킬을 추가하려면:

1. `.claude/skills/` 디렉토리에 Markdown 파일 생성
2. 스킬의 목적, 사용법, 실행 순서 문서화
3. 필요한 경우 실행 스크립트(.sh) 생성
4. `package.json`에 npm 스크립트 추가
5. 이 README에 스킬 설명 추가

## 추가 정보

자세한 사용법은 각 스킬의 Markdown 파일을 참고하세요.
