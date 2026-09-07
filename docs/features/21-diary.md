# 21. 다이어리 (Diary)

> **상태**: ✅ 완료 (Phase 1 — 텍스트 일기 + 빠른 기록)
> **Phase**: Phase 6
> **원본 요청서**: 프론트 레포 `docs/features/24-diary.md`
> **참고 구현체**: `src/memo/` (구조가 거의 동일)

---

## 개요

매일의 일상을 기록하는 기능입니다. 구조는 메모([08-memo.md](08-memo.md))와 거의 같지만 두 가지가 다릅니다.

| | 메모 | 다이어리 |
| --- | --- | --- |
| 식별 단위 | 자유 (개수 무제한) | **날짜** — `@@unique([userId, date])` |
| 작성 방식 | 폼으로 한 번에 작성 | **조각을 던져 누적(append)** 후 나중에 다듬기 |

Phase 1은 **텍스트 일기 + 빠른 기록**만 다룹니다. 사진·영상 첨부와 용량 한도는 Phase 2입니다(맨 아래 참고).

---

## 핵심 개념

### 빠른 기록 (`POST /diaries/append`)

일기 앱의 실패는 대부분 "쓰기 시작하는 부담" 때문입니다. 그래서 입력의 자유도와 저장 단위를 분리합니다.

```
사용자는 아무 때나 조각을 던지고  →  서버가 그날 문서 하나에 모은다
```

- 앱 하단 입력창에 한 줄 쓰고 보내면 그날 일기에 append 됩니다. 화면 전환도 저장 버튼도 없습니다.
- 그래서 **append는 upsert**입니다. 클라이언트가 "오늘 일기가 있나?"를 먼저 조회하면 왕복이 2회가 되고 경합도 생깁니다.
- 조각은 **별도 테이블이 아니라 Delta 문서 안의 블록**입니다. `DiaryEntry` 같은 테이블을 두면 본문과 조각이 이원화되어 동기화 문제가 생깁니다.

### 하루의 경계는 자정이 아니라 새벽 4시

자정 기준이면 새벽 1시에 남긴 기록이 "내일 일기"가 되어 체감과 어긋납니다.

- 새벽 3시 59분 기록 → **전날** 일기
- 새벽 4시 00분 기록 → 당일 일기
- **캘린더·통계·스트릭·회고가 전부 이 경계를 따릅니다.** 한 곳만 자정 기준이면 어긋납니다.

`src/common/utils/date-kst.util.ts`에 헬퍼를 추가합니다.

```typescript
/** 다이어리 하루 경계 시각 (KST 기준 시) */
export const DIARY_DAY_BOUNDARY_HOUR = 4;

/**
 * 다이어리의 "오늘" 날짜 (하루 경계 = 새벽 4시 KST)
 * 4시간을 뺀 뒤 날짜를 취해, 새벽 3시 59분까지는 전날 일기로 들어가게 한다.
 */
export function diaryDateInKst(now: Date = new Date()): Date {
  const kstDateStr = dayjs(now)
    .tz('Asia/Seoul')
    .subtract(DIARY_DAY_BOUNDARY_HOUR, 'hour')
    .format('YYYY-MM-DD');
  return new Date(`${kstDateStr}T00:00:00.000Z`);
}
```

### 하루 1편은 "사용자별" 제약

`@@unique([userId, date])`이므로 **한 사용자**가 같은 날짜에 일기를 두 편 쓸 수 없습니다. 그룹 뷰에서는 같은 날짜에 여러 사람의 일기가 존재하므로, 목록·캘린더 쿼리가 이를 전제해야 합니다(캘린더 응답의 `days`는 같은 `date`가 여러 번 나올 수 있음).

---

## 날짜·타임존 규약

`@db.Date`는 타임존 정보가 없습니다. KST 2026-09-01 23:30에 쓴 일기를 UTC로 변환하면 `2026-08-31`이 되어 유니크 제약이 엉뚱하게 충돌하거나 조회가 하루씩 밀립니다. 루틴이 `checkedDate`에서 같은 문제를 겪고 만든 `date-kst.util.ts`를 그대로 씁니다.

| 구간 | 규약 |
| --- | --- |
| 클라이언트 → 서버 | `date`를 **`'YYYY-MM-DD'` 문자열**로 전송 (ISO8601 금지) |
| 서버 파싱 | `parseDateOnly(dto.date)` |
| "오늘" 판정 | **`diaryDateInKst()`** — 서버 로컬시각·UTC 기준 금지 |
| 서버 → 클라이언트 | 응답도 **`'YYYY-MM-DD'` 문자열**로 반환 |
| 미래 날짜 | 서버가 `diaryDateInKst()` 초과를 **거부(400)** |

> 응답을 문자열로 내리는 이유: `Date` 객체로 내리면 Flutter에서 `DateTime.parse` 시 UTC로 해석되어 기기 타임존에 따라 하루가 밀립니다. 응답 DTO에서 `date`는 `string`, `createdAt`/`updatedAt`은 기존 컨벤션대로 `Date`입니다.

---

## 데이터베이스

Phase 1은 `Diary` 하나만 만듭니다.

```prisma
/// 다이어리(일기)
///
/// 하루 1편이 원칙이며(@@unique([userId, date])), 빠른 기록으로 던진 조각들이
/// 이 한 문서의 content(Delta) 안에 누적된다.
/// date는 KST 기준 순수 날짜(UTC 자정 정규화) — date-kst.util.ts 참고.
model Diary {
  id         String          @id @default(uuid())
  userId     String
  groupId    String?
  date       DateTime        @db.Date
  title      String?         @db.VarChar(200)
  content    String          @db.Text          // Quill Delta JSON
  plainText  String?         @db.Text          // 검색용 평문 (서버가 추출)
  format     DiaryFormat     @default(DELTA)
  visibility DiaryVisibility @default(PRIVATE)
  mood       String?         @db.VarChar(20)   // 기분 이모지/코드
  weather    String?         @db.VarChar(20)   // 날씨 코드
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  deletedAt  DateTime?

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  group Group? @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date(sort: Desc)])
  @@index([groupId, date(sort: Desc)])
  @@index([deletedAt])
  @@map("diaries")
}

enum DiaryFormat {
  DELTA
  PLAIN
  MARKDOWN
}

enum DiaryVisibility {
  PRIVATE
  GROUP
}
```

관계 추가: `model User`에 `diaries Diary[]`, `model Group`에 `diaries Diary[]`.

### 마이그레이션 시 COLLATE 필수

`CLAUDE.md`대로 `CREATE TABLE`에 **반드시 `COLLATE utf8mb4_unicode_ci`를 명시**합니다. 생략하면 개발 DB(MySQL 8.x)는 통과하고 양산(9.x)에서만 FK 에러 3780으로 죽습니다.

```bash
# 개수가 일치해야 정상
grep -c "CREATE TABLE" prisma/migrations/*_add_diary/migration.sql
grep -c "COLLATE utf8mb4_unicode_ci" prisma/migrations/*_add_diary/migration.sql
```

### ⚠️ soft delete와 유니크 제약의 충돌 (정책 A 채택)

`@@unique([userId, date])`는 **soft delete된 행에도 걸립니다.** 9/1 일기를 삭제(휴지통)한 뒤 같은 날짜에 새 일기를 쓰면 P2002가 납니다. MySQL에서 부분 유니크 인덱스는 쓸 수 없으므로(`deletedAt`을 유니크에 넣으면 NULL 중복이 허용되어 활성 행의 유일성이 깨짐) 아래 중 하나를 택해야 합니다.

- **(A) 채택 — 휴지통 덮어쓰기**: 같은 날짜에 삭제된 일기가 있는 상태에서 생성/append 하면, 삭제된 일기를 **완전 삭제하고 새로 만든다.** 그 날짜의 복구는 포기됨. 사용자가 "그날 일기를 다시 쓰기 시작"한 이상 휴지통 버전을 되살릴 의도는 없다고 본다.
- (B) 미채택 — 부활: 삭제된 일기를 되살려 그 뒤에 append. 지웠던 내용이 다시 나타나 놀랄 수 있음.

**둘 다 `POST /diaries/:id/restore`는 같은 날짜에 활성 일기가 있으면 409**입니다.

---

## 주요 기능

### 일기 CRUD

- 제목(선택), 본문(Delta), 기분(`mood`), 날씨(`weather`), 공개 범위(`visibility`), 그룹(`groupId`)
- `plainText`는 서버가 Delta에서 추출해 저장(검색용). 클라이언트가 보내지 않음
- 같은 날짜에 이미 일기가 있으면 `POST /diaries`는 **409**
- 삭제는 soft delete, **30일** 내 `restore` 가능, 이후 스케줄러가 완전 삭제
- 수정·삭제는 **그룹 일기면 그룹원 전원**, 개인 일기면 작성자 본인만 (메모와 동일한 규칙)

### 빠른 기록 (append)

- `date` 생략 시 `diaryDateInKst()`로 결정
- 해당 `(userId, date)` 일기가 **없으면 생성, 있으면 content 끝에 조각 append**
- `plainText` 재추출 후 저장
- 응답은 전체 문서가 아니라 **추가된 조각 + 일기 id**(목록 낙관적 갱신용)

### 캘린더 / 스트릭 / 회고

- 캘린더: 월별 작성 여부·기분을 점으로 찍기 위한 경량 응답(본문 없음)
- 스트릭: 연속 작성일수 + 이번 달 작성일수 + 최장 연속일수, 전부 새벽 4시 경계 기준
- 회고(flashback): 1개월 / 3개월 / 6개월 / 1년 / n년 전 오늘

---

## API 엔드포인트

Base: `/diaries` · 전 엔드포인트 인증 필요(`@ApiCommonAuthResponses()`)

| Method | Endpoint | 설명 | 권한 |
| --- | --- | --- | --- |
| GET | `/diaries` | 목록 (페이지네이션, 기간·그룹·검색 필터) | JWT |
| GET | `/diaries/calendar` | 월별 작성 현황 (캘린더뷰용) | JWT |
| GET | `/diaries/by-date/:date` | 특정 날짜 내 일기 (없으면 404) | JWT |
| GET | `/diaries/streak` | 연속 작성일수 + 이번달 작성일수 | JWT |
| GET | `/diaries/flashback` | 회고 — 1·3·6개월, n년 전 오늘 | JWT |
| GET | `/diaries/:id` | 상세 | JWT, Access |
| POST | `/diaries` | 생성 (같은 날짜 존재 시 409) | JWT |
| **POST** | **`/diaries/append`** | **빠른 기록 — upsert** | JWT |
| PATCH | `/diaries/:id` | 수정 | JWT, Owner/Group Member |
| DELETE | `/diaries/:id` | 삭제 (soft delete) | JWT, Owner/Group Member |
| POST | `/diaries/:id/restore` | 30일 내 복구 | JWT, Owner/Group Member |

> **라우트 순서**: `/append`, `/calendar`, `/by-date/:date`, `/streak`, `/flashback`은 반드시 `/:id`보다 **먼저** 선언합니다(메모 컨트롤러의 `/tags`, `/pinned`와 동일).

### `POST /diaries/append` — 빠른 기록 ★ 핵심

```json
// 요청
{
  "date": "2026-09-01",       // 생략 시 서버가 diaryDateInKst()로 결정
  "text": "점심에 본 고양이",   // 텍스트 조각 (Phase 1의 유일한 조각 종류)
  "capturedAt": "14:32"        // 조각 시각 마커 (선택, HH:mm)
}
```

```json
// 응답 201
{
  "id": "uuid-1234",
  "date": "2026-09-01",
  "created": true,             // 이 요청으로 일기가 새로 만들어졌는지
  "appended": { "text": "점심에 본 고양이", "capturedAt": "14:32" },
  "updatedAt": "2026-09-01T05:32:10.000Z"
}
```

**동작**

1. `date` 생략 시 `diaryDateInKst()`
2. `(userId, date)` 조회
   - 없으면 새로 생성 — `visibility`는 요청값 또는 `PRIVATE`
   - 있으면 Delta 끝에 조각 append, **`visibility`는 기존 값 유지**
3. `plainText` 재추출 후 저장

**검증**

- `text`가 비어 있으면 400 (`diary.errors.text_required`)
- 미래 날짜면 400 (`diary.errors.future_date`)
- `capturedAt`은 `HH:mm` 형식만 허용

**Delta append 규칙**

조각 사이에 개행 문단을 넣고, `capturedAt`을 **attribute로** 부여합니다. 프론트가 시각 마커를 좌측에 렌더링하고, 다듬기 모드에서 일괄 제거합니다.

```json
{ "insert": "점심에 본 고양이\n", "attributes": { "diaryTime": "14:32" } }
```

**동시성 — 반드시 처리**

사용자가 연달아 보내면 같은 `(userId, date)`에 동시 upsert가 발생해 **P2002**가 납니다(Prisma `upsert`도 경합 시 P2002를 던짐). 또한 읽고-쓰는 사이에 다른 요청이 끼면 **조각이 유실**됩니다.

→ 인터랙티브 트랜잭션 안에서 `SELECT ... FOR UPDATE`로 그날 행을 잠근 뒤 append, 행이 없어 create 하다 P2002를 만나면 **1회 재시도**(재시도 시엔 잠금 후 append 경로로 들어옴).

**공개범위 사고 방지**

기본값은 **새 일기를 만들 때만** 적용하고, 기존 일기가 있으면 그 값을 따릅니다. 빠른 기록에서 매번 공개범위를 묻지 않기 위한 설계입니다.

> Phase 1에는 "사용자 기본 공개범위" 저장소가 없으므로 기본값은 `PRIVATE`이며, append DTO의 선택 필드(`visibility`/`groupId`)는 **신규 생성 시에만** 반영됩니다.

### `GET /diaries/calendar`

쿼리: `year`, `month`, `groupId?`

```json
{
  "days": [
    {
      "date": "2026-09-01",
      "diaryId": "uuid",
      "userId": "uuid",
      "authorName": "홍길동",
      "mood": "😊",
      "hasMedia": false
    }
  ]
}
```

- `groupId` 지정 시 그 그룹의 `GROUP` 일기(멤버 전원) — 같은 `date`가 여러 번 나올 수 있음
- 미지정 시 본인 일기만
- `hasMedia`는 **Phase 1에서 항상 `false`**. 필드를 미리 둬서 Phase 2에 프론트 모델을 고치지 않게 함

### `GET /diaries/streak`

```json
{ "currentStreak": 5, "thisMonthCount": 12, "longestStreak": 23 }
```

- 본인 일기 기준, 새벽 4시 경계
- **오늘(경계 기준) 일기가 아직 없으면 어제부터 역산**합니다. 하루가 다 가기 전에 스트릭이 0으로 보이면 안 됩니다

### `GET /diaries/flashback`

- 기준일은 `diaryDateInKst()`
- 후보: 1개월 / 3개월 / 6개월 전, 그리고 1년 전 · 2년 전 … (가장 오래된 일기 연도까지)
- 여러 후보가 걸리면 **가장 오래된 것 하나만** 반환(오래될수록 반가움이 큼)
- 없으면 **빈 배열**(404 아님 — 프론트가 카드를 렌더링하지 않을 뿐)
- 본인 일기만 대상

```json
{
  "items": [
    {
      "id": "uuid",
      "date": "2025-09-01",
      "label": "1년 전 오늘",
      "title": "가을 첫날",
      "excerpt": "plainText 앞부분 …",
      "mood": "😊"
    }
  ]
}
```

### 삭제 정책

| 대상 | 정책 |
| --- | --- |
| 일기 본문 | **soft delete 30일** → `restore` 가능, 이후 스케줄러가 완전 삭제 |
| 첨부 미디어 | (Phase 2) 즉시 영구 삭제 — 복구 불가 |

- `POST /diaries/:id/restore`: `deletedAt`이 30일 이내여야 하고(초과 시 404), 같은 날짜에 활성 일기가 있으면 409
- 완전 삭제 스케줄러: `diary` 이름으로 `isSchedulerEnabled('diary')` 게이트, 매일 1회 `deletedAt < now-30d` 하드 삭제

---

## 접근 권한

메모의 `getAccessCondition` / `validateGroupMembership`과 동일한 규칙입니다.

- `PRIVATE`: 본인만
- `GROUP`: 해당 그룹 멤버 전원 (`groupId` 필수, 멤버십 검증)
- **수정·삭제·복구는 그룹 일기면 그룹원 전원** — 가족이 함께 쓰는 기록이므로 메모·가계부와 동일하게 그룹원이면 누구나 다룰 수 있다. 개인(`PRIVATE`) 일기는 작성자 본인만
- 그룹 목록 조회 시 `getUserGroupIds` Redis 캐시 패턴(TTL 60초) 재사용

---

## 구현 파일 (예정)

```
src/diary/
  diary.module.ts
  diary.controller.ts
  diary.service.ts
  diary.scheduler.ts                — 30일 경과 soft delete 완전 삭제 (매일 1회)
  dto/
    create-diary.dto.ts
    update-diary.dto.ts
    append-diary.dto.ts             — ★ 빠른 기록
    diary-query.dto.ts              — 목록/캘린더 쿼리
    diary-response.dto.ts           — DiaryDto, AppendDiaryResultDto, DiaryCalendarDto, DiaryStreakDto, DiaryFlashbackDto, PaginatedDiaryDto
  enums/
    diary-format.enum.ts            — export { DiaryFormat } from '@prisma/client'
    diary-visibility.enum.ts        — export { DiaryVisibility } from '@prisma/client'
  utils/
    delta-append.util.ts            — ★ Delta에 조각 append
```

- `deltaToPlainText`는 `src/memo/utils/delta-to-plain-text.util.ts`에 이미 있습니다. 다이어리도 Delta를 쓰므로 **`src/common/utils/delta-to-plain-text.util.ts`로 승격**하고 메모 import를 갱신합니다(복제 금지).
- `app.module.ts`에 `DiaryModule` 등록
- i18n: `src/i18n/{ko,en,ja,zh}/diary.json` 4개 언어

---

## 구현 상태

### ✅ Phase 1 (완료)

- [x] Prisma 모델 + 마이그레이션 (`20260901000000_add_diary`, COLLATE 명시 확인)
- [x] `diaryDateInKst()` / `formatDateOnly()` 헬퍼 추가
- [x] `deltaToPlainText` 공용 유틸로 승격 (`src/common/utils/`)
- [x] `/diaries` CRUD + `by-date` + `calendar` + `streak` + `flashback`
- [x] `/diaries/append` upsert + 행 잠금(`FOR UPDATE`) + P2002 1회 재시도
- [x] soft delete / restore(30일) + 완전 삭제 스케줄러(`diary`, 매일 04:30 KST)
- [x] 그룹 권한 검증 (메모 패턴 재사용 — 그룹 일기는 그룹원 전원 수정·삭제 가능)
- [x] i18n 4개 언어 (`diary.json`)
- [x] Swagger 문서 생성 (`npm run gen:api` → `docs/api/diaries.md`, 11개 엔드포인트)
- [x] `npm run check` 통과

### 검증 결과 (2026-09-01, 개발 서버 실호출)

- [x] `append` 연타 5회 동시 요청 → 일기 1건, 조각 5개 전부 보존 (유실·중복 생성 없음)
- [x] 하루 경계: `03:59 KST → 전날`, `04:00 KST → 당일` (`diaryDateInKst()` 단위 확인)
- [x] 미래 날짜 요청 → 400, 같은 날짜 `POST /diaries` → 409
- [x] 그룹 일기를 다른 멤버가 조회/수정/삭제/복구 → 모두 허용 (개인 일기는 작성자만, 조회도 403)
- [x] 다른 멤버의 부분 수정(`PATCH {title}`)에도 `visibility=GROUP`/`groupId` 유지
- [x] soft delete → 상세조회 404 → `restore` 복구 성공
- [x] 빈 텍스트 append → 400, 잘못된 `capturedAt` → 400
- [x] `streak` / `calendar`(그룹 포함) / `flashback` / 검색 정상
- [x] 엣지 케이스 91종 통과 — 널·생략 필드, 잘못된 타입/길이/enum, 정의되지 않은 필드,
      존재하지 않는 날짜(`2026-02-30`, 평년 `2025-02-29`)의 롤오버 차단, 경로·쿼리 파라미터 검증,
      휴지통 덮어쓰기·복구 충돌, 공개범위 전환(GROUP↔PRIVATE), 인증 누락

### ⬜ Phase 2 (미착수 — 별도 요청서)

미디어 첨부·용량 한도·R2 직접 업로드는 **[docs/backlog.md](../backlog.md)** 에 항목과
착수 시 지켜야 할 Phase 1 결정을 함께 정리해두었다.

---

**Last Updated**: 2026-09-01
