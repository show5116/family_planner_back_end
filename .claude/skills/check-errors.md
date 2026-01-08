# Check TypeScript and ESLint Errors

⚠️ **DEPRECATED**: 이 스킬은 `/validate`에 통합되었습니다.

**대신 사용:** `/validate` (TypeScript + ESLint + CODE_STYLE + Swagger)

---

<details>
<summary>기존 문서 (참고용)</summary>

코드 수정 후 TypeScript 컴파일 에러와 ESLint 에러를 확인하는 스킬입니다.

## 사용 시점
- 코드를 수정한 후
- 새로운 기능을 추가한 후
- 리팩토링을 완료한 후
- Pull Request를 생성하기 전

## 실행 순서

### 1. TypeScript 컴파일 체크
먼저 TypeScript 컴파일 에러를 확인합니다.

```bash
npx tsc --noEmit
```

에러가 있다면:
- 에러 메시지를 분석하여 문제가 되는 파일과 라인 번호를 파악
- 주요 에러 유형별로 그룹화하여 보고
- 총 에러 개수 표시

### 2. ESLint 체크
ESLint 에러와 경고를 확인합니다.

```bash
npm run lint
```

에러가 있다면:
- 에러와 경고를 구분하여 표시
- 파일별로 그룹화하여 보고
- 주요 에러 유형 요약

### 3. 결과 요약
두 검사의 결과를 요약하여 사용자에게 보고합니다.

**통과한 경우:**
```
✅ TypeScript 컴파일: 에러 없음
✅ ESLint: 에러 없음

모든 검사를 통과했습니다!
```

**에러가 있는 경우:**
```
❌ TypeScript 컴파일: X개 에러
❌ ESLint: Y개 에러, Z개 경고

주요 문제:
1. [파일명:라인] 에러 내용
2. [파일명:라인] 에러 내용
...

수정이 필요한 파일들:
- src/file1.ts (3개 에러)
- src/file2.ts (2개 에러)
```

## 에러 수정 가이드

### TypeScript 에러
- **Missing property**: DTO나 인터페이스에 필수 필드 누락
- **Type mismatch**: 타입이 맞지 않음
- **Cannot find module**: import 경로 오류
- **Property does not exist**: enum이나 타입에 속성이 없음

### ESLint 에러
- **@typescript-eslint/unbound-method**: 테스트 파일 상단에 `/* eslint-disable @typescript-eslint/unbound-method */` 추가
- **@typescript-eslint/no-floating-promises**: Promise 앞에 `void` 또는 `await` 추가
- **@typescript-eslint/no-unsafe-call**: `// eslint-disable-next-line @typescript-eslint/no-unsafe-call` 추가
- **@typescript-eslint/no-unsafe-enum-comparison**: `// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison` 추가
- **@typescript-eslint/require-await**: async 함수에 await가 없으면 `async` 키워드 제거

## 주의사항
- 두 검사 모두 통과해야 코드가 안전합니다
- ESLint 경고도 가능하면 수정하는 것이 좋습니다
- 테스트 파일은 일부 규칙을 비활성화할 수 있습니다

</details>
