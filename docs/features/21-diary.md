# 21. 다이어리 (Diary)

> **상태**: ✅ 완료 (텍스트 일기 + 빠른 기록 + 미디어 첨부)
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

기능은 두 단계로 나눠 만들었습니다. **Phase 1**이 텍스트 일기와 빠른 기록, **Phase 2**가 사진·영상 첨부와 등급별 용량 한도입니다. 성격이 다른 이유는 Phase 2가 **비용이 걸린 검증**이기 때문입니다 — 입력값 검증은 뚫려도 데이터가 지저분해지는 정도지만, 용량 한도가 뚫리면 실제 돈이 나갑니다. 그래서 한도는 **서버가 실측한 값만** 신뢰합니다.

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

### `DiaryMedia` — 첨부 미디어 (Phase 2)

```prisma
/// 일기 첨부 미디어 (R2 Presigned 업로드)
///
/// 한도 집계는 일기가 아니라 "올린 사람"(userId) 기준이다.
/// 그룹 일기에 그룹원이 올려도 그 사람의 한도를 쓴다.
model DiaryMedia {
  id           String      @id @default(uuid())
  diaryId      String?                          // 업로드 직후엔 null (고아 정리 대상)
  userId       String                           // 한도 집계 기준 — 업로더
  type         MediaType                        // IMAGE | VIDEO
  status       MediaStatus @default(PENDING)    // presigned 업로드 상태
  storageKey   String      @db.VarChar(500)
  thumbnailKey String?     @db.VarChar(500)
  fileName     String      @db.VarChar(255)
  declaredSize Int                              // 클라이언트 신고 크기 (예약용)
  fileSize     Int?                             // ★ 한도 집계 기준 (HeadObject 실측)
  originalSize Int?                             // 압축 전 크기 (절약량 표시용)
  mimeType     String      @db.VarChar(100)
  width        Int?
  height       Int?
  durationMs   Int?
  isOriginal   Boolean     @default(false)
  sortOrder    Int         @default(0)
  reservedAt   DateTime    @default(now())      // presigned 발급 시각 (만료 정리 기준)
  uploadedAt   DateTime?                        // ★ 월간 집계 기준 (확정 시각)
  deletedAt    DateTime?

  // 일기를 완전 삭제해도 미디어 행은 남긴다 (행이 사라지면 월간 한도가 회복돼 버린다).
  // 실제 정리는 서비스에서 R2 삭제 + deletedAt 기록으로 처리한다.
  diary Diary? @relation(fields: [diaryId], references: [id], onDelete: SetNull)
  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, uploadedAt])                 // 월간 집계용
  @@index([userId, deletedAt])                  // 누적 집계용
  @@index([userId, status, reservedAt])         // 만료 PENDING 정리용
  @@index([diaryId, sortOrder])
  @@map("diary_media")
}

enum MediaType   { IMAGE VIDEO }
enum MediaStatus { PENDING CONFIRMED }
```

관계 추가: `model Diary`에 `media DiaryMedia[]`, `model User`에 `diaryMedia DiaryMedia[]`.

**왜 이런 필드가 필요한가**

- **`userId`를 따로 두는 이유** — 한도는 사용자 단위다. diary를 거쳐 집계하면 `diaryId`가 아직 null인 임시 첨부가 집계에서 빠진다.
- **`diaryId`가 nullable인 이유** — 사진만 올리고 저장하지 않고 나가는 경우가 있다. 이 고아 미디어가 한도를 계속 잡아먹으므로 정리 스케줄러가 필요하다.
- **`declaredSize` / `fileSize`를 나눈 이유** — presigned 방식에서는 서버가 바이트를 보지 못한다. 발급 시점엔 신고값으로 자리를 예약하고, 완료 확정에서 `HeadObject` 실측값으로 확정한다. **한도 집계는 언제나 `fileSize` 기준**이다.
- **`status`가 필요한 이유** — presigned URL만 받고 업로드하지 않은 레코드는 실제 파일이 없는데도 예약 용량을 잡는다. 15분 지나면 정리한다.
- **`onDelete: SetNull`인 이유** — Cascade면 정책 A 덮어쓰기와 30일 purge가 미디어 행까지 지워 **월간 한도가 회복된다.** 아래 "삭제 시 한도 회복" 참고.

### 마이그레이션 시 COLLATE 필수

`CLAUDE.md`대로 `CREATE TABLE`에 **반드시 `COLLATE utf8mb4_unicode_ci`를 명시**합니다. 생략하면 개발 DB(MySQL 8.x)는 통과하고 양산(9.x)에서만 FK 에러 3780으로 죽습니다.

```bash
# 개수가 일치해야 정상
grep -c "CREATE TABLE" prisma/migrations/*_add_diary/migration.sql
grep -c "COLLATE utf8mb4_unicode_ci" prisma/migrations/*_add_diary/migration.sql
```

마이그레이션은 두 개입니다 — `20260901000000_add_diary`(Diary), `20260909000000_add_diary_media`(DiaryMedia). 둘 다 `CREATE TABLE` 개수와 `COLLATE` 개수가 일치하는 것을 확인했습니다.

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

### 미디어 첨부 (Phase 2)

사진·영상을 일기에 붙이고, 용량을 구독 등급별 한도로 관리합니다.

#### 업로드는 R2 Presigned URL 3단계

파일이 백엔드를 거치지 않고 클라이언트에서 R2로 직접 올라갑니다. 프리미엄 파일 최대 200MB에 영상까지 가면 모바일 네트워크에서 백엔드가 병목이 되고, Railway 인스턴스의 요청 타임아웃·메모리가 그대로 한계가 됩니다.

```
[1] POST /diaries/media/reserve       한도 검증 + 자리 예약
      Redis 락 → 한도 확인 → DiaryMedia(status=PENDING) 생성
      → { mediaId, uploadUrl, storageKey, expiresIn }

[2] PUT <uploadUrl>                   클라이언트 → R2 직접 (백엔드 경유 안 함)
      실패 시 같은 mediaId로 재시도 가능

[3] POST /diaries/media/:id/confirm   완료 확정
      HeadObject로 실제 존재·크기 확인 → 실측 fileSize 기록
      → status=CONFIRMED, uploadedAt=now, 락 안에서 한도 재확인
```

> **★ 실측 검증이 이 방식의 유일한 방어선입니다.** presigned URL은 발급 후 만료 전까지 그 키에 무엇이든 쓸 수 있습니다. 신고값만 믿으면 **1KB로 예약하고 200MB를 올릴 수 있습니다.** `confirm`은 반드시 `HeadObject` 실측값으로 확정하고, 한도를 넘으면 **R2 파일을 지운 뒤 402**를 돌려줍니다.

#### 등급별 한도

| Tier | 월간 업로드 | 계정 누적 | 파일 1개 최대 | 영상 |
| --- | --- | --- | --- | --- |
| `free` | 100 MB | 500 MB | 20 MB | ❌ (이미지만) |
| `ad_free` | 300 MB | 2 GB | 50 MB | ✅ 최대 60초 |
| `premium` | 2 GB | 20 GB | 200 MB | ✅ 최대 5분 |

수치는 R2 실단가와 초기 사용 통계를 보고 출시 전 조정할 초안입니다. **앱에 하드코딩하지 않고 서버가 내려줍니다** — [src/config/diary-media.config.ts](../../src/config/diary-media.config.ts)에 기본값을 두고 `DIARY_MEDIA_FREE_MONTHLY_MB` 같은 환경변수로 덮어씁니다(MB·초 단위). 조정에 앱 재배포가 필요 없습니다.

#### 한도 집계 규칙

- **월간**: `uploadedAt`이 이번 달인 미디어의 `fileSize` 합. 매월 1일 리셋을 배치로 처리하지 않고 **조회 시점의 기간 집계**로 계산합니다(배치는 실패하면 조용히 한도가 안 풀립니다).
- **누적**: `deletedAt IS NULL`인 미디어의 `fileSize` 합
- 양쪽 모두 **유효한 `PENDING` 예약분(`declaredSize`)을 포함**합니다. 그래야 업로드 중인 파일이 게이지에 반영되어, 연달아 올리다 마지막에만 거부당하는 일이 없습니다.
- **월 경계도 새벽 4시** — 월간 집계의 월 시작은 1일 04:00 KST(`diaryMonthStartInKst()`)입니다. 캘린더·스트릭과 다른 기준을 쓰면 사용자에게 설명할 수 없는 차이가 생깁니다.

#### ⚠️ 삭제 시 한도 회복은 비대칭

| | 회복되나? |
| --- | --- |
| 계정 누적 한도 | **즉시 회복** |
| 월간 한도 | **회복되지 않음** |

월간 한도를 회복시키면 "지웠다 올렸다"를 반복해 **실질 무한 용량**이 됩니다. 업로드 트래픽 자체가 비용이므로 이렇게 고정합니다.

이 규칙 때문에 **삭제는 R2 파일만 지우고 행은 남기는 soft delete**입니다. 행까지 지우면 월간 집계에서도 빠져 한도가 되돌아갑니다. 일기를 완전 삭제할 때도 마찬가지로 `diaryId`만 떼고 행은 남깁니다(그래서 FK가 `SetNull`).

행이 무한히 쌓이지 않도록, 두 집계 어디에도 영향이 없어진 행(`deletedAt IS NOT NULL` && `uploadedAt < 이번 달 시작`)은 매일 04:30 배치에서 hard delete합니다.

#### 다운그레이드

이미 올린 파일은 삭제하지 않습니다. 누적 한도를 초과한 상태여도 **신규 업로드만 차단**하고 조회·삭제는 그대로 허용합니다. 데이터를 인질로 잡지 않습니다.

#### 동시성 — Redis 락

`reserve` 요청 여러 건이 동시에 도달하면 각각 한도를 통과해 합계가 한도를 넘길 수 있습니다. 한도는 여러 행에 걸친 집계라 빠른 기록의 `SELECT ... FOR UPDATE`로는 부족하고, `diary:media:quota:{userId}` 키로 사용자 단위 분산 락을 겁니다(TTL 10초, 100ms 간격 재시도). `confirm`의 최종 확인도 같은 락 안에서 재집계합니다.

#### 정리 스케줄러 — 둘 다 없으면 한도가 샙니다

| 대상 | 조건 | 처리 | 주기 |
| --- | --- | --- | --- |
| 만료된 예약 | `PENDING` && `reservedAt` 15분 경과 | R2 잔여물 + 레코드 삭제 | 5분마다 |
| 고아 미디어 | `diaryId IS NULL` && `CONFIRMED` 24시간 경과 | R2 삭제 + soft delete | 매시 10분 |
| 집계 무관 행 | `deletedAt` 있음 && 지난 달 이전 업로드 | 레코드 hard delete | 매일 04:30 |

앞의 둘은 각각 "presigned만 받고 업로드 안 함", "사진 올리고 일기를 저장하지 않고 나감"에 대응합니다.

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

미디어 — Base: `/diaries/media`

| Method | Endpoint | 설명 | 권한 |
| --- | --- | --- | --- |
| GET | `/diaries/media/quota` | 현재 한도 상태 (업로드 전 필수 조회) | JWT |
| GET | `/diaries/media/large` | 용량 큰 미디어 Top N (저장공간 관리 화면용) | JWT |
| POST | `/diaries/media/reserve` | 한도 검증 + presigned URL 발급 | JWT |
| POST | `/diaries/media/:id/confirm` | 업로드 완료 확정 (실측 반영) | JWT, Uploader |
| PATCH | `/diaries/media/reorder` | 첨부 순서 변경 | JWT, Owner/Group Member |
| DELETE | `/diaries/media/:id` | 삭제 (R2 즉시 삭제, 누적만 회복) | JWT, Owner/Group Member |

등급별 한도표는 구독 쪽에 있습니다 — `GET /subscription/quota-plans`([17-subscription.md](17-subscription.md)). 구독 화면의 플랜 비교 카드에서 "프리미엄은 얼마나 더 쓸 수 있는지"를 보여주는 용도로, `/diaries/media/quota`와 같은 서버 설정을 읽습니다.

> **라우트 순서**: `/append`, `/calendar`, `/by-date/:date`, `/streak`, `/flashback`은 반드시 `/:id`보다 **먼저** 선언합니다(메모 컨트롤러의 `/tags`, `/pinned`와 동일).

### `POST /diaries/append` — 빠른 기록 ★ 핵심

```json
// 요청
{
  "date": "2026-09-01",       // 생략 시 서버가 diaryDateInKst()로 결정
  "text": "점심에 본 고양이",   // 텍스트 조각
  "mediaIds": ["uuid"],        // 함께 붙일 첨부 (confirm까지 끝난 것)
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

- `text`와 `mediaIds`가 **둘 다** 비어 있으면 400 (`diary.errors.text_required`). 사진만 던지는 빠른 기록이 오히려 더 잦아, 둘 중 하나만 있으면 됩니다
- 첨부는 **내가 올린 `CONFIRMED`이면서 아직 어디에도 붙지 않은 것**만 허용 (`POST /diaries`·`PATCH /diaries/:id`도 같은 규칙으로 `mediaIds`를 받습니다)
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
      "hasMedia": false,
      "media": []
    }
  ]
}
```

- `groupId` 지정 시 그 그룹의 `GROUP` 일기(멤버 전원) — 같은 `date`가 여러 번 나올 수 있음
- 미지정 시 본인 일기만
- `hasMedia`는 Phase 1에서 자리만 잡아둔(항상 `false`) 필드였고 Phase 2에서 실제 값으로 채워졌습니다 — 프론트 모델은 그대로 두고 값만 바뀌었습니다

### `GET /diaries/streak`

```json
{ "currentStreak": 5, "thisMonthCount": 12, "longestStreak": 23 }
```

- 본인 일기 기준, 새벽 4시 경계
- **오늘(경계 기준) 일기가 아직 없으면 어제부터 역산**합니다. 하루가 다 가기 전에 스트릭이 0으로 보이면 안 됩니다

### `GET /diaries/flashback`

- 기준일은 `diaryDateInKst()`
- 후보: 1개월 / 3개월 / 6개월 전, 그리고 1년 전 · 2년 전 … (가장 오래된 일기 연도까지)
- 여러 후보가 걸리면 **① 첨부가 있는 것 → ② 더 오래된 것** 순으로 하나만 반환합니다. 회고는 찾으러 가지 않아도 올라오는 유일한 뷰라, 글자만 있는 카드는 탭할 이유가 생기지 않습니다
- 없으면 **빈 배열**(404 아님 — 프론트가 카드를 렌더링하지 않을 뿐)
- 본인 일기만 대상
- **대표 썸네일 1장**만 내려줍니다(`thumbnailUrl`). 카드가 사진을 한 장만 쓰는데 `media[]` 전체를 주면 쓰지도 않을 presigned URL을 여러 개 서명하게 됩니다. 대표는 `sortOrder`가 가장 앞선 `CONFIRMED` 첨부 — 상세 갤러리의 첫 장과 같아야 "카드에서 본 사진이 안에 없다"가 되지 않습니다
- **라벨은 서버가 문장을 만들지 않습니다.** `unit`(`MONTH`/`YEAR`)과 `amount`만 주고 앱이 각 언어의 복수형 규칙(`1 month ago` / `3 months ago`)에 맞게 조립합니다. `label`(한국어)은 구버전 앱 호환용으로 남겨둡니다 — 지금 배포된 앱이 이 필드를 그리고 있어 지우면 라벨이 사라집니다

```json
{
  "items": [
    {
      "id": "uuid",
      "date": "2025-09-01",
      "label": "1년 전 오늘",
      "unit": "YEAR",
      "amount": 1,
      "title": "가을 첫날",
      "excerpt": "plainText 앞부분 …",
      "mood": "😊",
      "hasMedia": true,
      "thumbnailUrl": "https://…"
    }
  ]
}
```

### `GET /diaries/media/quota`

```json
{
  "tier": "premium",
  "monthly": {
    "usedBytes": 524288000,
    "limitBytes": 2147483648,
    "remainingBytes": 1623195648,
    "resetsAt": "2026-10-01T04:00:00+09:00"
  },
  "total": { "usedBytes": 3221225472, "limitBytes": 21474836480, "remainingBytes": 18253611008 },
  "perFileLimitBytes": 209715200,
  "videoAllowed": true,
  "maxVideoDurationMs": 300000
}
```

### `POST /diaries/media/reserve`

`diaryId`(선택), `date`(선택), `type`, `fileName`, `mimeType`, `declaredSize`, `isOriginal`, `width`/`height`/`durationMs`(선택)를 받습니다. `diaryId` 없이 `date`만 오면 **그 날짜의 내 일기를 찾아 있으면 즉시 연결**하고, 없으면 `diaryId=null`로 두어 나중에 일기 저장 시 연결합니다.

**검증 순서 — 비용이 큰 것부터 막습니다**

1. `declaredSize`가 파일 1개 최대치 초과 → **413** `file_too_large`
2. 영상 불가 등급인데 `type=VIDEO` → **403** `video_not_allowed`
3. 영상 길이 초과 → **400** `video_too_long` (신고값 기준, `confirm`에서 재검증)
4. `mimeType` 화이트리스트 (`image/jpeg|png|webp|gif`, `video/mp4|quicktime`) → **400** `invalid_mime_type`
5. **Redis 사용자 락** → 월간·누적 잔여 확인(`CONFIRMED` + 유효 `PENDING`) → 초과 시 **402** `quota_exceeded`
6. `PENDING` 레코드 생성 + presigned PUT URL 발급 (유효 10분)

402 응답에는 **남은 용량을 함께 싣습니다.** 프론트가 "이번 달 남은 용량 N MB"를 그 자리에서 안내해야 하기 때문입니다.

```json
{ "statusCode": 402, "message": "이번 달 업로드 용량을 모두 사용했어요", "quota": { /* quota와 같은 형태 */ } }
```

### `POST /diaries/media/:id/confirm`

1. `HeadObject`로 존재·크기 확인 — 없으면 **400** `upload_not_found`
2. `Content-Type` 재확인 — 화이트리스트 밖이면 R2 파일 삭제 후 **400**
3. 실측 크기가 파일 1개 최대치를 넘으면 R2 파일 삭제 후 **413**
4. 락 안에서 실측값으로 한도 재검증 → 초과 시 **R2 파일 삭제 후 402**
5. `CONFIRMED` 확정, `uploadedAt = now()`

응답은 확정된 미디어 + **갱신된 quota**를 함께 주어, 프론트가 게이지를 즉시 맞출 수 있게 합니다. 이미 확정된 건에 다시 호출하면 현재 상태를 그대로 돌려줍니다(재시도 안전).

### 썸네일 — 클라이언트가 만들어 올린다

서버는 바이트를 보지 않으므로 ffmpeg·sharp를 돌릴 수 없습니다. `reserve`가 본체와 **썸네일 업로드 URL을 함께** 발급하고, 앱이 둘을 병렬로 올립니다(영상은 첫 프레임, 이미지는 축소본 — **JPEG, 최대 변 640px, 품질 80**).

```
[1] reserve                    → uploadUrl + thumbnailUploadUrl 수령
[2] PUT <uploadUrl>              본체 → R2
[2'] PUT <thumbnailUploadUrl>    썸네일 → R2   (본체와 병렬)
[3] confirm                    → 서버가 둘 다 HeadObject로 확인
```

- 썸네일 키는 본체 키에서 파생합니다(`…_thumb.jpg`). 예약 시점에 `thumbnailKey`를 기록해두면 업로드에 실패했을 때 없는 파일을 서명하게 되므로, **`confirm`에서 존재를 확인한 뒤에만** 기록합니다.
- **썸네일이 없다고 `confirm`을 실패시키지 않습니다.** 프레임 추출은 기기·코덱에 따라 실패하는데, 본체가 올라갔는데 썸네일 때문에 업로드 전체가 날아가는 쪽이 훨씬 나쁩니다. 없으면 `thumbnailKey`를 비운 채 확정합니다.
- **썸네일 크기는 한도에 넣지 않습니다.** 수십 KB가 월간 한도를 깎으면 "20MB 영상을 올렸는데 20.1MB가 줄었다"를 사용자가 겪습니다. 집계는 본체 `fileSize`만 씁니다(`perFileBytes` 검증에도 넣지 않음).
- 이미지에도 같은 경로를 엽니다. 목록에서 원본을 그대로 받는 구조라 사진이 많은 달에 트래픽이 큽니다.

### 업로드 형식 검증 — 신고값이 아니라 바이트

`reserve`의 MIME 화이트리스트는 **클라이언트 신고값**이고, presigned PUT의 `Content-Type`은 **서명 대상이 아닙니다**(`SignedHeaders=host`). 클라이언트는 Content-Type을 마음대로 붙이거나 생략할 수 있고 R2는 그 값을 그대로 저장하므로, 신고값도 저장된 헤더도 내용을 보증하지 못합니다.

그래서 `confirm`에서 **Range GET으로 선두 32바이트만 받아 매직바이트로 실제 형식을 판별**합니다(요청 1회, 수십 바이트).

- 화이트리스트 밖이면 R2 파일을 지우고 **400**
- 화이트리스트 안이면 **실측 형식을 `mimeType`으로 저장**합니다. 신고와 다른 형식(예: jpeg로 신고한 png)이어도 형식 자체가 허용 범위면 막을 이유가 없고, 저장값이 실제와 맞아야 조회 URL의 Content-Type이 맞습니다
- **MP4·QuickTime·HEIC는 전부 `ftyp` 컨테이너**라 브랜드로 구분합니다. `image/jpeg`로 신고한 HEIC가 이 단계에서 걸립니다
- 썸네일도 같은 검사를 하되, JPEG가 아니면 잔여물만 지우고 **없는 것으로 다룹니다**(확정은 막지 않음)

조회 URL에는 `ResponseContentType`으로 **서버가 확인한 형식을 강제**합니다. 저장된 헤더가 거짓이어도 우리가 서명한 URL은 올바른 타입으로 서빙됩니다(추가 요청 없음).

### 미디어 URL — presigned GET

일기는 사적인 내용이라 R2 버킷을 public으로 열지 않고 **만료 1시간의 presigned GET**으로 내립니다. 서명은 네트워크 호출 없는 로컬 계산이라 목록에서 썸네일 수십 건을 서명해도 부담이 없습니다. 조회 응답의 `media[].url`·`thumbnailUrl`이 여기 해당합니다.

```json
"media": [
  { "id": "uuid", "type": "IMAGE", "url": "https://...", "thumbnailUrl": null,
    "width": 1920, "height": 1080, "durationMs": null, "sortOrder": 0 }
]
```

### 삭제 정책

| 대상 | 정책 |
| --- | --- |
| 일기 본문 | **soft delete 30일** → `restore` 가능, 이후 스케줄러가 완전 삭제 |
| 첨부 미디어 | **즉시 영구 삭제 — 복구 불가** (R2 파일 삭제, 행은 월간 집계용으로 유지) |

- `POST /diaries/:id/restore`: `deletedAt`이 30일 이내여야 하고(초과 시 404), 같은 날짜에 활성 일기가 있으면 409
- 완전 삭제 스케줄러: `diary` 이름으로 `isSchedulerEnabled('diary')` 게이트, 매일 1회 `deletedAt < now-30d` 하드 삭제
- 본문과 미디어의 정책이 다른 이유: 텍스트는 복구 가치가 크고 저장 비용이 ~0인 반면, 미디어는 정반대입니다. 비용 구조가 다른 두 자원에 같은 정책을 쓸 이유가 없습니다
- 그래서 **일기를 삭제하면 첨부는 그 자리에서 R2에서 사라집니다.** 30일 뒤 복구하면 본문만 돌아오고 미디어 자리는 비어 있습니다
- 정책 A(휴지통 덮어쓰기)로 휴지통 일기를 완전 삭제할 때도 첨부 R2 파일을 함께 지웁니다 — 안 지우면 참조가 사라진 파일이 R2에 영구히 남습니다

---

## 접근 권한

메모의 `getAccessCondition` / `validateGroupMembership`과 동일한 규칙입니다.

- `PRIVATE`: 본인만
- `GROUP`: 해당 그룹 멤버 전원 (`groupId` 필수, 멤버십 검증)
- **수정·삭제·복구는 그룹 일기면 그룹원 전원** — 가족이 함께 쓰는 기록이므로 메모·가계부와 동일하게 그룹원이면 누구나 다룰 수 있다. 개인(`PRIVATE`) 일기는 작성자 본인만
- 그룹 목록 조회 시 `getUserGroupIds` Redis 캐시 패턴(TTL 60초) 재사용

미디어도 같은 규칙을 따릅니다 — 그룹 일기의 첨부는 그룹원 누구나 추가·삭제할 수 있습니다. 다만 **한도는 업로드한 사람에게 귀속**됩니다. `DiaryMedia.userId`가 일기 작성자였다면 남의 한도를 소진시킬 수 있습니다. 일기에 붙지 않은 첨부는 올린 본인만 다룰 수 있습니다.

---

## 구현 파일

```
src/diary/
  diary.module.ts
  diary.controller.ts
  diary.service.ts
  diary.scheduler.ts                — 30일 경과 일기 완전 삭제 + 집계 무관 미디어 행 정리 (매일 04:30)
  dto/
    create-diary.dto.ts             — mediaIds 포함
    update-diary.dto.ts
    append-diary.dto.ts             — ★ 빠른 기록 (text·mediaIds 중 하나)
    diary-query.dto.ts
    diary-response.dto.ts
  enums/
    diary-format.enum.ts            — export { DiaryFormat } from '@prisma/client'
    diary-visibility.enum.ts
  utils/
    delta-append.util.ts            — ★ Delta에 조각 append
  media/
    diary-media.controller.ts
    diary-media.service.ts          — ★ reserve / confirm / delete / reorder / 정리
    diary-media-quota.service.ts    — ★ 월간·누적 집계 (비대칭 회복 규칙)
    diary-media.scheduler.ts        — 만료 예약(5분) / 고아 미디어(매시)
    diary-media.constants.ts        — MIME 화이트리스트, 락 설정
    quota-exceeded.exception.ts     — 402 + quota payload
    dto/
      reserve-media.dto.ts
      reorder-media.dto.ts
      large-media-query.dto.ts
      diary-media-response.dto.ts
```

함께 손댄 공용 코드

- [src/config/diary-media.config.ts](../../src/config/diary-media.config.ts) — 등급별 한도 (환경변수 오버라이드)
- [src/common/utils/date-kst.util.ts](../../src/common/utils/date-kst.util.ts) — `diaryDateInKst()`, `diaryMonthStartInKst()`, `nextDiaryMonthStartInKst()`
- [src/storage/storage.service.ts](../../src/storage/storage.service.ts) — `getFileMetadata()`(HeadObject 실측), `getViewUrl()`(로그 없는 presigned GET) 추가
- [src/common/filters/i18n-exception.filter.ts](../../src/common/filters/i18n-exception.filter.ts) — HttpException payload 전달 (402의 `quota`)
- `deltaToPlainText`는 메모에서 `src/common/utils/`로 승격해 공유
- i18n: `src/i18n/{ko,en,ja,zh}/diary.json` — 문구 톤은 "제한"이 아니라 "다 썼어요" 쪽(스토어 심사에서 결제 압박으로 읽히지 않게)

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

### ✅ Phase 2 (완료 — 2026-09-09)

- [x] `DiaryMedia` 모델 + 마이그레이션 (`20260909000000_add_diary_media`, COLLATE 1:1 확인)
- [x] 등급별 한도를 서버 설정에서 읽도록 구성 (환경변수 오버라이드, 하드코딩 없음)
- [x] `/media/quota` — 유효 `PENDING` 예약분 포함 집계
- [x] `/media/reserve` — 검증 6단계 + Redis 락 + presigned 발급
- [x] `/media/:id/confirm` — **HeadObject 실측 검증** + 초과 시 R2 파일 삭제 후 402
- [x] `/media/:id` DELETE — R2 즉시 삭제, 누적만 회복
- [x] `/media/reorder`, `/media/large`
- [x] 기존 조회 API에 `media` 배열 추가, `calendar.hasMedia` 실제 값
- [x] `append`의 `text` 필수 완화 + `mediaIds` (`create`/`update`에도 추가)
- [x] 휴지통 완전 삭제·일기 삭제 시 R2 파일 동반 삭제 (정책 A 포함)
- [x] 정리 스케줄러 3종 (만료 예약 / 고아 미디어 / 집계 무관 행)
- [x] `GET /subscription/quota-plans`
- [x] i18n 4개 언어 (한도·업로드 오류 11키)
- [x] `npm run check` 통과

### 검증 결과 (2026-09-09, 개발 서버 + 실제 R2 버킷)

비용이 걸린 기능이라 9개 시나리오를 실호출로 확인했습니다 (총 54개 체크 통과).

| 시나리오 | 결과 |
| --- | --- |
| 1KB 예약 후 3MB 업로드 | `confirm` 402 + R2 파일 삭제 + 예약 행 제거 |
| 20MB × 6건 동시 reserve (한도 100MB) | 5건 성공 / 1건 402, 합계 정확히 100MB |
| 미디어 삭제 | 누적만 회복, 월간 유지 |
| presigned 받고 업로드 안 함 | 15분 경과분만 정리, 유효 예약 유지 |
| 사진만 올리고 일기 미저장 | 24시간 경과분만 정리, R2 삭제 + 행 유지 |
| 무료 계정 영상 업로드 | 403 (+ 413 파일 초과, 400 MIME도 확인) |
| 다운그레이드 후 누적 초과 | 신규만 402, 조회·삭제 정상 |
| 삭제한 날짜에 재작성 (정책 A) | 휴지통 일기의 R2 파일 잔여 없음 |
| 그룹원이 올린 미디어 | 한도가 업로더에게 귀속 |

---

## 구현 노트 — 요청서와 달라진 판단

Phase 2 요청서(프론트 레포 `docs/features/24-diary.md`)와 다르게 구현한 지점입니다.

### 삭제를 "레코드 삭제"로 할 수 없다

요청서는 "`deletedAt` 기록 또는 레코드 삭제 — 편한 쪽으로"라고 열어뒀지만, 행을 지우면 월간 집계에서도 빠져 **월간 한도가 회복됩니다.** 요청서가 금지한 "지웠다 올렸다 무한 용량"이 그대로 열립니다. R2 파일만 지우고 행은 남깁니다.

같은 이유로 `DiaryMedia.diaryId`의 FK를 요청서의 `onDelete: Cascade` 대신 **`SetNull`** 로 두고, 일기 완전 삭제 경로에서 서비스가 R2 삭제 → `deletedAt` 기록 → 분리를 직접 합니다.

### 월 경계는 `thisMonthStartInKst()`를 쓸 수 없다

요청서 본문은 기존 `thisMonthStartInKst()`를, 뒤쪽 절은 하루 경계(04:00 KST)에 맞추라고 해 서로 어긋났습니다. 후자를 택했습니다. 게다가 `thisMonthStartInKst()`는 **UTC 자정 순수 날짜**를 반환해 `uploadedAt`(실제 timestamp)과 비교하면 **매월 1일 00:00~09:00 KST 업로드분이 통째로 누락**됩니다. `diaryMonthStartInKst()`를 새로 만들었습니다.

### `fileExists()`로는 실측 검증을 할 수 없다

기존 `StorageService.fileExists()`는 boolean만 돌려줘 핵심 방어(실제 크기 확인)에 쓸 수 없습니다. `HeadObject`의 `ContentLength`/`ContentType`을 반환하는 `getFileMetadata()`를 추가했습니다.

### 402에 `quota`를 실으려면 예외 필터를 넓혀야 했다

`I18nExceptionFilter`가 `statusCode`/`message`/`error`만 내보내고 있어 `quota`가 잘려나갔습니다. HttpException이 실은 payload를 그대로 전달하도록 확장했습니다(추가 필드가 없는 기존 예외는 응답 그대로).

### `create`/`update`에도 `mediaIds`

요청서는 `append`만 명시했지만, "`diaryId` 없이 예약 → 일기 저장 시 연결" 흐름은 일반 작성 경로에도 필요합니다.

### `reserve`의 `date`는 저장하지 않는다

모델에 날짜 칼럼이 없어, 그 날짜의 내 일기를 찾아 연결하는 용도로만 씁니다.

### 조회 URL은 presigned GET

요청서가 백엔드 판단에 맡긴 항목입니다. 공개 URL은 캐시 효율이 좋지만 키를 아는 사람은 누구나 영구 접근할 수 있어, 사적인 기록에는 단기 만료 서명을 택했습니다.

---

**Last Updated**: 2026-09-09
