# 22. 다이어리 미디어 (Diary Media)

> **상태**: ⬜ 미착수 — 프론트 레포에서 인계받은 작업 요청서
> **Phase**: Phase 6
> **선행 작업**: [21-diary.md](21-diary.md) (Phase 1 완료)
> **원본 요청서**: 프론트 레포 `docs/features/24-diary.md` (1~4장에 배경과 근거)
> **인계일**: 2026-09-09
>
> 백로그([../backlog.md](../backlog.md))에 예약돼 있던 "다이어리 Phase 2"의 정식 요청서입니다.
> 백로그에 적어둔 "착수 시 지켜야 할 Phase 1 결정"과 이 문서의 내용은 일치합니다.

---

## 1. 무엇을 만드는가

일기에 **사진·영상을 첨부**하고, 첨부 용량을 **구독 등급별 한도**로 제한합니다.

Phase 1과 성격이 크게 다른 점 두 가지:

| | Phase 1 | **Phase 2** |
|---|---|---|
| 업로드 경로 | 없음 | **R2 Presigned URL 직접 업로드** (서버는 바이트를 보지 않음) |
| 검증 성격 | 입력값 검증 | **비용이 걸린 한도 검증** — 뚫리면 실제 돈이 나감 |

**한도 검증은 서버가 최종 권한**입니다. 클라이언트 압축·사전 안내는 편의일 뿐,
서버가 실측한 값만 신뢰합니다.

---

## 2. 구독 등급별 한도

| Tier | 월간 업로드 | 계정 누적 | 파일 1개 최대 | 영상 |
|------|-----------|----------|-------------|------|
| `free` | 100 MB | 500 MB | 20 MB | ❌ (이미지만) |
| `adFree` | 300 MB | 2 GB | 50 MB | ✅ 최대 60초 |
| `premium` | 2 GB | 20 GB | 200 MB | ✅ 최대 5분 |

> ⚠️ 이 수치는 **초안**입니다. R2 실단가와 초기 사용 통계를 보고 출시 전 조정합니다.
> **앱에 하드코딩하지 않고 서버가 내려주도록** 해주세요 — 한도 조정에 앱 재배포가
> 필요하면 안 됩니다. 환경변수 또는 설정 테이블 중 편한 쪽으로 두시면 됩니다.

### 한도 계산 규칙

- **월간 한도**: `uploadedAt`이 이번 달(KST)인 미디어의 `fileSize` 합
  - 매월 1일 리셋을 **배치로 처리하지 않습니다.** 조회 시점의 기간 집계로 계산해주세요
    (배치는 실패하면 조용히 한도가 안 풀립니다)
  - 월 시작 경계는 기존 `thisMonthStartInKst()` 사용
- **계정 누적 한도**: `deletedAt IS NULL`인 미디어의 `fileSize` 합

### ⚠️ 삭제 시 한도 회복 규칙 — 비대칭입니다

| | 회복되나? |
|---|---|
| 계정 누적 한도 | **즉시 회복** |
| 월간 한도 | **회복되지 않음** |

월간 한도를 회복시키면 "지웠다 올렸다"를 반복해 **실질 무한 용량**이 됩니다.
업로드 트래픽 자체가 비용이므로 이렇게 고정합니다. (프론트에서 이 규칙을 UI에 명시합니다)

### 다운그레이드 시

이미 올린 파일은 **삭제하지 않습니다.** 누적 한도를 초과한 상태여도
**신규 업로드만 차단**하고 조회·삭제는 그대로 허용해주세요. 데이터를 인질로 잡으면 안 됩니다.

---

## 3. 데이터 모델

```prisma
model DiaryMedia {
  id           String      @id @default(uuid())
  diaryId      String?                            // 업로드 직후엔 null (고아 정리 대상)
  userId       String                             // 한도 집계는 diary가 아니라 user 기준
  type         MediaType                          // IMAGE | VIDEO
  status       MediaStatus @default(PENDING)      // presigned 업로드 상태
  storageKey   String      @db.VarChar(500)       // R2 key
  thumbnailKey String?     @db.VarChar(500)       // 영상 썸네일 / 이미지 축소본
  fileName     String      @db.VarChar(255)
  declaredSize Int                                // 클라이언트 신고 크기 (예약용)
  fileSize     Int?                               // ★ 한도 집계 기준 (HeadObject 실측)
  originalSize Int?                               // 압축 전 크기 (절약량 표시용)
  mimeType     String      @db.VarChar(100)
  width        Int?
  height       Int?
  durationMs   Int?                               // 영상 길이
  isOriginal   Boolean     @default(false)        // 원본 업로드 여부
  sortOrder    Int         @default(0)
  reservedAt   DateTime    @default(now())        // presigned 발급 시각 (만료 정리 기준)
  uploadedAt   DateTime?                          // ★ 월간 집계 기준 (확정 시각)
  deletedAt    DateTime?

  diary Diary? @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, uploadedAt])                   // 월간 집계용
  @@index([userId, deletedAt])                    // 누적 집계용
  @@index([userId, status, reservedAt])           // 만료 PENDING 정리용
  @@index([diaryId, sortOrder])
  @@map("diary_media")
}

enum MediaType   { IMAGE VIDEO }
enum MediaStatus { PENDING CONFIRMED }
```

기존 `model Diary`에 관계 추가:
```prisma
  media DiaryMedia[]
```
`model User`에도 `diaryMedia DiaryMedia[]` 추가 필요.

### 설계 근거 (왜 이런 필드가 필요한가)

- **`userId`를 따로 두는 이유**: 한도는 사용자 단위입니다. diary를 거쳐 집계하면
  `diaryId`가 아직 null인 임시 첨부가 집계에서 빠집니다.
- **`diaryId`가 nullable인 이유**: 사진만 올리고 저장 안 하고 나가는 경우가 있습니다.
  이 **고아 미디어가 한도를 계속 잡아먹으므로** 정리 스케줄러가 필요합니다.
- **`declaredSize` / `fileSize`를 나눈 이유**: presigned 방식에서는 서버가 바이트를
  보지 못합니다. 발급 시점엔 신고값으로 **자리를 예약**하고, 완료 콜백에서
  **`HeadObject` 실측값**으로 확정합니다. **한도 집계는 언제나 `fileSize` 기준**입니다.
- **`status`가 필요한 이유**: presigned URL만 받고 업로드하지 않은 레코드는 실제 파일이
  없는데도 예약 용량을 잡습니다. 15분 지나면 정리합니다.

### ⚠️ 마이그레이션 시 COLLATE 필수

`CLAUDE.md`에 적힌 대로 `CREATE TABLE`에 **`COLLATE utf8mb4_unicode_ci`를 명시**해주세요.
생략하면 개발 DB(8.x)는 통과하고 **양산(9.x)에서만 FK 에러 3780으로 죽습니다.**

```bash
grep -c "CREATE TABLE" prisma/migrations/*_diary_media/migration.sql
grep -c "COLLATE utf8mb4_unicode_ci" prisma/migrations/*_diary_media/migration.sql
```

---

## 4. API 명세

### 4-1. 업로드 흐름 — Presigned URL 3단계 ★핵심

당초 multipart 릴레이를 고려했으나, **프리미엄 파일 최대 200MB + 영상**이면
모바일 네트워크에서 백엔드가 병목이 됩니다. Railway 인스턴스의 요청 타임아웃·메모리가
그대로 한계가 되고, 업로드 중 끊기면 처음부터 다시입니다.

**`storage.service.ts`에 `getUploadUrl()`(presigned PUT, 기본 10분)이 이미 구현되어
있습니다.** 새로 만들 필요 없이 그대로 쓰시면 됩니다.

```
[1] POST /diaries/media/reserve       (한도 검증 + 자리 예약)
      → Redis 락 → 한도 확인 → DiaryMedia(status=PENDING) 생성
      → 응답: { mediaId, uploadUrl, storageKey, expiresIn }

[2] PUT <uploadUrl>                   (클라이언트 → R2 직접, 백엔드 경유 안 함)
      → 실패 시 같은 mediaId로 재시도 가능

[3] POST /diaries/media/:id/confirm   (완료 확정)
      → HeadObject로 실제 크기·존재 확인
      → 실측 fileSize 기록, status=CONFIRMED, uploadedAt=now
      → 트랜잭션 내 한도 재확인 → 초과면 R2 파일 삭제 후 402
```

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/diaries/media/quota` | 현재 한도 상태 (업로드 전 필수 조회) |
| `POST` | `/diaries/media/reserve` | 한도 검증 + presigned URL 발급 |
| `POST` | `/diaries/media/:id/confirm` | 업로드 완료 확정 (실측 반영) |
| `PATCH` | `/diaries/media/reorder` | 첨부 순서 변경 |
| `DELETE` | `/diaries/media/:id` | 미디어 삭제 (R2 즉시 삭제, 누적 한도 회복) |
| `GET` | `/diaries/media/large` | 용량 큰 미디어 Top N (저장공간 관리 화면용) |

---

### 4-2. `GET /diaries/media/quota`

```json
{
  "tier": "premium",
  "monthly": {
    "usedBytes": 524288000,
    "limitBytes": 2147483648,
    "remainingBytes": 1623195648,
    "resetsAt": "2026-10-01T00:00:00+09:00"
  },
  "total": {
    "usedBytes": 3221225472,
    "limitBytes": 21474836480,
    "remainingBytes": 18253611008
  },
  "perFileLimitBytes": 209715200,
  "videoAllowed": true,
  "maxVideoDurationMs": 300000
}
```

> `usedBytes`에는 **유효한 `PENDING` 예약분도 포함**해주세요. 그래야 업로드 중인
> 파일이 게이지에 반영되어, 연달아 올리다 마지막에만 거부당하는 일이 없습니다.

---

### 4-3. `POST /diaries/media/reserve`

```json
// 요청
{
  "diaryId": "uuid",          // 선택 — 없으면 나중에 confirm/일기 저장 시 연결
  "date": "2026-09-07",       // diaryId가 없을 때 어느 날짜에 붙일지
  "type": "IMAGE",            // IMAGE | VIDEO
  "fileName": "IMG_1234.jpg",
  "mimeType": "image/jpeg",
  "declaredSize": 3145728,
  "isOriginal": false,        // 사용자가 "원본으로 업로드"를 골랐는지
  "width": 1920,              // 선택
  "height": 1080,             // 선택
  "durationMs": 15000         // 영상일 때
}
```

**검증 순서** — 비용이 큰 것부터 막습니다:

1. `declaredSize`가 파일 1개 최대치 초과 → **413**
2. tier가 영상 불가인데 `type=VIDEO` → **403** `VIDEO_NOT_ALLOWED`
3. 영상 길이 초과 → **400** (신고값 기준, `confirm`에서 재검증)
4. `mimeType` 화이트리스트 검증 (`image/jpeg|png|webp|gif`, `video/mp4|quicktime` 등)
5. **Redis 사용자 락** → 월간/누적 잔여 확인
   (`CONFIRMED` + 유효한 `PENDING` 합산) → 초과 시 **402** `QUOTA_EXCEEDED`
6. `PENDING` 레코드 생성 + presigned URL 발급 (유효 10분)

**402 응답에는 남은 용량을 함께 실어주세요.** 프론트가 "이번 달 남은 용량 N MB"를
그 자리에서 안내해야 합니다.

```json
{
  "statusCode": 402,
  "message": "diary.errors.quota_exceeded",
  "quota": { /* 4-2와 같은 형태 */ }
}
```

---

### 4-4. `POST /diaries/media/:id/confirm`

1. `HeadObject`로 실제 존재·크기 확인 — 없으면 **400** (업로드 실패)
2. **실측 크기가 `declaredSize`보다 크면** → 한도 재검증,
   초과 시 **R2 파일 삭제 후 402**
3. `Content-Type` 재확인
4. 트랜잭션 내 최종 한도 확인 → `CONFIRMED` 확정, `uploadedAt = now()`

> ⚠️ **2번이 이 방식의 유일한 구멍입니다.** presigned URL은 발급 후 10분간 그 키에
> 무엇이든 쓸 수 있습니다. 신고값만 믿으면 **1KB로 예약하고 200MB를 올릴 수 있습니다.**
> 반드시 실측으로 막아주세요.

응답은 확정된 미디어 정보 + 갱신된 quota를 함께 주시면 프론트가 게이지를 바로 맞춥니다.

---

### 4-5. `DELETE /diaries/media/:id`

**soft delete가 아니라 즉시·영구 삭제입니다.**

- R2 파일 삭제 + `deletedAt` 기록 (또는 레코드 삭제 — 편한 쪽으로)
- 누적 한도 즉시 회복, **월간 한도는 회복하지 않음**
- 일기 본문은 30일 soft delete인데 미디어만 즉시 삭제인 이유:
  텍스트는 복구 가치가 크고 저장 비용이 ~0이지만, 미디어는 정반대입니다.
  비용 구조가 다른 두 자원에 같은 정책을 쓸 이유가 없습니다.

> `DELETE /diaries/:id`(일기 삭제) 시에도 **첨부 미디어는 즉시 R2에서 지워주세요.**
> 30일 뒤 일기를 복구하면 본문만 돌아오고 미디어 자리는 비어 있게 됩니다.
> (프론트에서 삭제 다이얼로그에 "사진/영상은 즉시 삭제되며 복구할 수 없습니다"를 명시합니다)

---

### 4-6. `GET /diaries/media/large`

저장공간 관리 화면용. 용량 큰 순으로 N개.

```json
{
  "items": [
    {
      "id": "uuid",
      "diaryId": "uuid",
      "date": "2026-09-01",
      "type": "VIDEO",
      "fileName": "VID_0001.mp4",
      "fileSize": 52428800,
      "originalSize": 104857600,
      "isOriginal": true,
      "thumbnailUrl": "https://...",
      "uploadedAt": "2026-09-01T14:32:00Z"
    }
  ]
}
```

쿼리: `limit`(기본 20), `onlyOriginal`(원본 업로드만 필터 — "압축본으로 교체" 유도용)

---

### 4-7. 기존 API 변경

- **`GET /diaries`, `/diaries/:id`, `/by-date/:date`** 응답에 `media` 배열 추가
  ```json
  "media": [
    { "id": "uuid", "type": "IMAGE", "url": "https://...",
      "thumbnailUrl": "https://...", "width": 1920, "height": 1080,
      "durationMs": null, "sortOrder": 0 }
  ]
  ```
- **`GET /diaries/calendar`**: `hasMedia`를 Phase 1의 하드코딩 `false`에서
  **실제 값으로 교체**해주세요 (프론트는 이미 이 필드를 읽고 있습니다)
- **`POST /diaries/append`**: `mediaIds` 배열을 받아 조각과 함께 첨부할 수 있게
  (빠른 기록으로 사진만 던지는 경우 — 오히려 이쪽이 더 잦습니다)
  - 이 경우 `text`가 비어 있어도 허용해주세요. 현재는 `text` 필수인데,
    **`text`와 `mediaIds` 중 최소 하나**로 완화가 필요합니다

> **URL 발급 방식**: 공개 URL(`getPublicUrl`)로 내릴지 presigned GET으로 내릴지는
> 백엔드 판단에 맡깁니다. 일기는 사적인 내용이라 presigned GET(단기 만료)이
> 안전해 보이지만, 목록에서 썸네일을 많이 불러오므로 성능 트레이드오프가 있습니다.

---

## 4-8. Phase 1에서 이미 확정된 사항 (인계 후 확인해 추가)

이 요청서는 Phase 1 구현 전에 작성되었습니다. 실제 Phase 1이
[21-diary.md](21-diary.md)로 완료되면서 아래 결정이 확정되었고,
Phase 2는 이를 전제로 해야 합니다.

### 휴지통 덮어쓰기(정책 A)와 미디어

Phase 1은 `@@unique([userId, date])`가 soft delete된 행에도 걸리는 문제를
**정책 A(휴지통 덮어쓰기)** 로 해결했습니다 — 삭제된 날짜에 다시 쓰면
휴지통 버전을 완전 삭제하고 새로 만듭니다.

미디어가 붙으면 이 지점에서 **R2 파일이 고아가 됩니다.**

- 휴지통 일기를 완전 삭제할 때 **그 일기에 붙은 미디어의 R2 파일도 함께 지워야** 합니다
- `POST /diaries/:id/restore` 복구 시, 미디어는 이미 영구 삭제된 상태이므로
  본문만 돌아옵니다 (이 요청서 4-5절의 삭제 정책과 동일)
- 기존 완전 삭제 스케줄러(`diary`, 매일 04:30 KST)도 미디어를 함께 정리해야 합니다

### 그룹 일기의 미디어 권한

Phase 1에서 **그룹 일기는 그룹원 전원이 수정·삭제 가능**으로 확정했습니다.
미디어도 같은 규칙을 따릅니다 — 그룹원 누구나 추가·삭제할 수 있습니다.

다만 **한도는 업로드한 사람에게 귀속**됩니다. `DiaryMedia.userId`는 일기 작성자가
아니라 **파일을 올린 사람**이어야 합니다. 그렇지 않으면 남의 한도를 소진시킬 수 있습니다.

### 월간 집계도 새벽 4시 경계

Phase 1의 `diaryDateInKst()`(하루 경계 04:00 KST)와 어긋나지 않도록,
월간 사용량 집계의 월 경계도 같은 기준을 따라야 합니다.
캘린더·스트릭과 다른 기준을 쓰면 사용자에게 설명할 수 없는 차이가 생깁니다.

---

## 5. 정리 스케줄러 2종 ⚠️ 둘 다 없으면 한도가 샙니다

| 대상 | 조건 | 처리 |
|------|------|------|
| **만료된 예약** | `status=PENDING` && `reservedAt` 15분 경과 | 레코드 삭제 + R2 잔여물 제거 |
| **고아 미디어** | `diaryId IS NULL` && `CONFIRMED` 24시간 경과 | R2·레코드 삭제 |

- 첫 번째: presigned만 받고 업로드 안 한 경우. 예약 용량만 잡고 있습니다
- 두 번째: 사진 올리고 일기를 저장하지 않고 나간 경우

기존 스케줄러 패턴(`announcement.scheduler.ts` 등) 참고하시면 됩니다.

---

## 6. 동시성 — Redis 락

`reserve` 요청 여러 건이 동시에 도달하면 각각 한도를 통과해 **합계가 한도를 넘길 수**
있습니다. 사용자별 락으로 직렬화해주세요. `redis` 모듈이 이미 있습니다.

`confirm`의 최종 확인도 트랜잭션 안에서 재집계해주세요.

---

## 7. 구독 한도 조회 API

`GET /subscription/quota-plans` — 등급별 한도표를 내려줍니다.
구독 화면의 플랜 비교 카드에서 "프리미엄은 얼마나 더 쓸 수 있는지"를 보여주는 용도입니다.

```json
{
  "plans": [
    { "tier": "free", "monthlyBytes": 104857600, "totalBytes": 524288000,
      "perFileBytes": 20971520, "videoAllowed": false, "maxVideoDurationMs": null },
    { "tier": "ad_free", "...": "..." },
    { "tier": "premium", "...": "..." }
  ]
}
```

---

## 8. 프로젝트 컨벤션

Phase 1과 동일합니다 (`CODE_STYLE.md`):

- `@/` 절대 경로, Controller `async` 제거, Service `userId` 첫 파라미터
- Response DTO 별도 파일, Swagger 커스텀 데코레이터
- 에러 메시지는 i18n 키 (`diary.errors.quota_exceeded` 등) — **4개 언어 모두**
- 수정 후 `npm run check` 필수
- 커밋은 사용자가 명시적으로 요청할 때만

### 추가될 i18n 키 (제안)
```
diary.errors.quota_exceeded        이번 달 업로드 용량을 모두 사용했습니다
diary.errors.total_quota_exceeded  저장 공간이 부족합니다
diary.errors.file_too_large        파일 크기가 너무 큽니다
diary.errors.video_not_allowed     영상 첨부는 상위 요금제에서 이용할 수 있습니다
diary.errors.video_too_long        영상 길이가 너무 깁니다
diary.errors.invalid_mime_type     지원하지 않는 파일 형식입니다
diary.errors.upload_not_found      업로드된 파일을 찾을 수 없습니다
diary.errors.media_not_found       첨부를 찾을 수 없습니다
```

> ⚠️ **문구 톤**: "제한"이 아니라 "제공"으로 써주세요. 스토어 심사에서 결제 압박으로
> 읽히면 문제가 됩니다. "무료 플랜은 100MB로 제한됩니다"보다
> **"이번 달 무료 용량을 모두 사용했어요"** 쪽입니다.

---

## 9. 완료 기준 (Definition of Done)

- [ ] `DiaryMedia` 모델 + 마이그레이션 (**COLLATE 확인**)
- [ ] 등급별 한도를 **서버 설정에서** 읽도록 구성 (하드코딩 금지)
- [ ] `/media/quota` — PENDING 예약분 포함 집계
- [ ] `/media/reserve` — 검증 6단계 + Redis 락 + presigned 발급
- [ ] `/media/:id/confirm` — **HeadObject 실측 검증** + 초과 시 파일 삭제
- [ ] `/media/:id` DELETE — R2 즉시 삭제, 누적만 회복
- [ ] `/media/reorder`, `/media/large`
- [ ] 기존 조회 API에 `media` 배열 추가, `calendar.hasMedia` 실제 값
- [ ] `append`에 `mediaIds` 지원 + `text` 필수 완화
- [ ] **휴지통 완전 삭제 시 R2 파일 동반 삭제** (정책 A — 4-8절)
- [ ] **정리 스케줄러 2종**
- [ ] `/subscription/quota-plans`
- [ ] i18n 4개 언어
- [ ] `npm run check` 통과
- [ ] 프론트 참조용 API 문서 → 프론트 레포 `docs/api/diaries.md` 갱신

### 검증 시 꼭 확인해주면 좋은 것

이 기능은 **뚫리면 실제 비용이 나가므로** 아래는 반드시 확인 부탁드립니다:

1. **1KB로 예약하고 큰 파일 업로드** → `confirm`에서 402로 막히고 R2 파일이 지워지는지
2. **동시에 여러 건 reserve** → 합계가 한도를 넘지 않는지 (Redis 락)
3. **미디어 삭제 후** → 누적은 회복되고 **월간은 회복되지 않는지**
4. **presigned 받고 업로드 안 함** → 15분 뒤 예약이 정리되는지
5. **사진 올리고 일기 저장 안 함** → 24시간 뒤 고아 미디어가 정리되는지
6. **무료 계정이 영상 업로드 시도** → 403
7. **다운그레이드 후 누적 초과 상태** → 신규 업로드만 막히고 조회·삭제는 되는지
8. **삭제한 날짜에 다시 일기 작성**(정책 A) → 휴지통 일기의 R2 파일이 남지 않는지
9. **그룹원이 올린 미디어** → 한도가 업로더에게 잡히는지(일기 작성자가 아니라)

---

## 10. 참고

- 전체 설계: 프론트 레포 `docs/features/24-diary.md` (1~4장에 근거와 배경)
- 기존 R2 유틸: `src/storage/storage.service.ts`
  — **`getUploadUrl()`, `fileExists()`(HeadObject), `deleteFile()` 모두 구현되어 있음**
- 날짜 유틸: `src/common/utils/date-kst.util.ts` (`thisMonthStartInKst`)
- 구독 tier: `SubscriptionTier` enum (`free` / `ad_free` / `premium`)
- 마이그레이션 절차·COLLATE 주의: 백엔드 `CLAUDE.md`
