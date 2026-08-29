# api-smoke-test — 실제 서버로 API 동작 검증

`npm run check`(타입/린트)로는 잡히지 않는 "실제로 호출했을 때 맞게 동작하는가"를 curl 등으로 검증하는 스킬. `validate` 스킬(정적 검사)과는 별개이며, 신규/변경 엔드포인트를 작성한 뒤 실제 응답값을 눈으로 확인하고 싶을 때 사용한다.

**사용법:** `/api-smoke-test` 또는 "실제로 호출해서 검증해줘", "서버 띄워서 테스트해줘"

---

## ⚠️ 가장 중요한 규칙: 절대 `POST /v1/auth/signup`을 쓰지 않는다

`AuthService.signup()`(`src/auth/auth.service.ts`)은 개발 환경 스킵 로직 없이 **무조건 실제 이메일 인증 메일을 발송**한다. 나중에 Prisma로 `isEmailVerified: true`를 직접 박아 인증을 우회해도, 메일은 signup 호출 시점에 이미 나간 뒤라 막을 수 없다.

**대신 기존 테스트 계정을 재사용한다** (`docs/maintenance/test-accounts.md`):

| 이메일 | 비밀번호 | 이름 | 테스트 가족 | 테스트 가족 2 |
|---|---|---|---|---|
| `test-owner@familyplanner.test` | `Test1234!` | 테스트 그룹장 | OWNER | MEMBER |
| `test-member@familyplanner.test` | `Test1234!` | 테스트 멤버 | MEMBER | MEMBER |
| `test-owner2@familyplanner.test` | `Test1234!` | 테스트 그룹장2 | - | OWNER |

`test-owner`/`test-member`는 두 그룹 모두에 속함(여러 그룹에 걸친 시나리오 검증용). 전부 `isEmailVerified: true` 상태로 이미 존재하므로 `POST /v1/auth/login`으로 바로 토큰을 받아 쓴다. 계정이 DB에 없다면(예: DB 초기화 후) `npx ts-node -r tsconfig-paths/register scripts/create-test-account.ts`로 재생성(멱등적).

**이 계정 자체를 삭제하지 않는다** — 플레이스토어 심사 제출용으로도 쓰인다.

---

## 실행 순서

### 1단계 — 서버 기동 상태 확인

사용자가 `npm run start:debug`(watch 모드)로 서버를 이미 띄워둔 경우가 많다. 새 서버를 직접 띄우거나 기존 서버를 종료하지 말고, 그 서버를 그대로 사용한다.

```bash
curl -s --max-time 5 -o /dev/null -w "%{http_code}\n" http://localhost:3000/v1/routines
```

- `401`이 오면 서버는 정상 응답 중(인증 없이 호출했으니 당연히 401).
- 응답이 없으면(`exit code 7`, `000`) 사용자에게 서버 기동 여부를 확인한다. 특히 `prisma generate` 등으로 사용자가 서버를 방금 종료했다면 재기동이 필요할 수 있다.
- 스키마 변경 직후처럼 watch 모드가 재컴파일 중이면 일시적으로 응답이 없을 수 있다 — 몇 초 후 재시도.

### 2단계 — 로그인

```bash
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-owner@familyplanner.test","password":"Test1234!"}'
```

응답의 `accessToken`을 이후 모든 호출의 `Authorization: Bearer <token>` 헤더에 사용한다.

### 3단계 — 검증용 데이터 준비 (필요한 경우)

신규 기능이 특정 데이터 상태를 요구하면(예: 특정 `frequencyType`의 루틴, 특정 날짜의 체크 로그) 이 계정 아래에 직접 생성한다. DB에 직접 값을 넣어야 하는 경우(예: 과거 날짜의 이력 데이터)는 임시 Node 스크립트를 프로젝트 루트에 작성해 실행 후 **즉시 삭제**한다:

```js
// verify_xxx.js — 실행 후 바로 rm
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // ...
  await prisma.$disconnect();
})();
```

### 4단계 — 실제 호출로 시나리오 검증

계획서(또는 요구사항)에 적힌 검증 시나리오를 하나씩 curl로 실행하고, 응답을 수기 계산값과 대조한다. 정상 케이스뿐 아니라 엣지 케이스(빈 데이터, 잘못된 파라미터 → 400, 경계값)까지 포함한다.

### 5단계 — 테스트 데이터 정리

이 계정 아래에 이번 세션에서 만든 데이터(루틴, 체크 로그, 임시 이력 등)만 정리한다. **계정 자체(`test-owner@familyplanner.test`, `test-member@familyplanner.test`)는 삭제하지 않는다.**

```js
// cleanup_xxx.js — 실행 후 바로 rm
// 예: 이번 세션에서 만든 루틴만 골라서 삭제
await prisma.routine.deleteMany({ where: { userId, title: { startsWith: 'habit' } } });
```

---

## 주의사항

- 이 스킬은 실제 서버·DB에 대고 검증하는 것이므로 **개발 DB(`family_dev`)에서만 실행**한다. `.env`의 `DATABASE_URL`을 실행 전에 확인.
- curl 명령의 토큰은 매번 새로 로그인해서 얻은 값을 쓴다(만료 시간이 짧음).
- Windows Git Bash 콘솔에서 한글 payload가 깨져 보일 수 있으나(CP949 인코딩 이슈), 서버 저장/응답 자체는 정상인 경우가 많다 — 실제 DB 값이나 API 응답을 다시 확인해 판단.
- 검증이 끝나면 [validate](validate.md)(타입/린트)도 함께 통과했는지 재확인한다.
