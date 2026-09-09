# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 다이어리 미디어

**Base Path:** `/diaries/media`

### GET `diaries/media/quota`

**요약:** 용량 한도 상태 조회 (업로드 전 필수 — 유효한 예약분 포함)

**Responses:**

#### 200 - 한도 조회 성공

```json
{
  "tier": null, // 구독 등급 (SubscriptionTier)
  "monthly": {
    "usedBytes": 0, // 이번 달 사용량 (bytes, 유효 예약분 포함) (number)
    "limitBytes": 0, // 이번 달 한도 (bytes) (number)
    "remainingBytes": 0, // 이번 달 잔여 (bytes) (number)
    "resetsAt": "2025-01-01T00:00:00Z" // 월간 한도 리셋 시각 (다음 달 1일 04:00 KST) (Date)
  }, // 월간 한도 상태 (MediaQuotaMonthlyDto)
  "total": {
    "usedBytes": 0, // 누적 사용량 (bytes, 유효 예약분 포함) (number)
    "limitBytes": 0, // 누적 한도 (bytes) (number)
    "remainingBytes": 0 // 누적 잔여 (bytes) (number)
  }, // 누적 한도 상태 (MediaQuotaTotalDto)
  "perFileLimitBytes": 0, // 파일 1개 최대 크기 (bytes) (number)
  "videoAllowed": false, // 영상 첨부 가능 여부 (boolean)
  "maxVideoDurationMs": null // 영상 최대 길이 (ms) (number | null)
}
```

---

### GET `diaries/media/large`

**요약:** 용량 큰 미디어 조회 (저장공간 관리 화면용)

**Query Parameters:**

- `limit` (`number`) (Optional): 조회 개수
- `onlyOriginal` (`boolean`) (Optional): 원본으로 올린 것만 (압축본 교체 유도용)

**Responses:**

#### 200 - 조회 성공

```json
{
  "items": [
    {
      "id": "", // 미디어 ID (string)
      "diaryId": null, // 연결된 일기 ID (string | null)
      "date": null, // 일기 날짜 ('YYYY-MM-DD') (string | null)
      "type": null, // 미디어 종류 (MediaType)
      "fileName": "", // 파일명 (string)
      "fileSize": 0, // 실제 크기 (bytes) (number)
      "originalSize": null, // 압축 전 원본 크기 (bytes) (number | null)
      "isOriginal": false, // 원본으로 업로드했는지 (boolean)
      "thumbnailUrl": null, // 썸네일 URL (string | null)
      "uploadedAt": "2025-01-01T00:00:00Z" // 업로드 확정 시각 (Date | null)
    }
  ] // 용량 큰 미디어 목록 (LargeMediaItemDto[])
}
```

---

### POST `diaries/media/reserve`

**요약:** 업로드 예약 — 한도 검증 후 presigned PUT URL 발급

**Request Body:**

```json
{
  "diaryId": "", // 연결할 일기 ID (없으면 나중에 일기 저장 시 연결) (string?)
  "date": "2026-09-07", // diaryId가 없을 때 어느 날짜에 붙일지 ('YYYY-MM-DD'). 그날 일기가 이미 있으면 바로 연결한다 (string?)
  "type": null, // 미디어 종류 (MediaType)
  "fileName": "IMG_1234.jpg", // 파일명 (string)
  "mimeType": "image/jpeg", // MIME 타입 (string)
  "declaredSize": 3145728, // 클라이언트 신고 크기 (bytes) (number)
  "originalSize": 0, // 압축 전 원본 크기 (bytes, 절약량 표시용) (number?)
  "isOriginal": false, // 사용자가 "원본으로 업로드"를 골랐는지 (boolean?)
  "width": 0, // 가로 픽셀 (number?)
  "height": 0, // 세로 픽셀 (number?)
  "durationMs": 0 // 영상 길이 (ms, 영상일 때) (number?)
}
```

**Responses:**

#### 201 - 예약 성공

```json
{
  "mediaId": "", // 미디어 ID (confirm에 사용) (string)
  "uploadUrl": "", // R2 직접 업로드용 presigned PUT URL (string)
  "storageKey": "", // R2 저장 키 (string)
  "expiresIn": 0, // presigned URL 유효 시간 (초) (number)
  "thumbnailUploadUrl": "", // 썸네일 업로드용 presigned PUT URL (JPEG, 최대 변 640px, 품질 80). 선택 — 올리지 않아도 확정된다 (string)
  "thumbnailKey": "" // 썸네일 R2 저장 키 (string)
}
```

#### 400 - 지원하지 않는 형식이거나 영상 길이가 너무 깁니다 (길이 초과 시 maxVideoDurationMs 동봉)

#### 402 - 용량 한도를 초과했습니다 (남은 용량 quota 동봉)

#### 403 - 현재 요금제에서는 영상을 첨부할 수 없습니다

#### 413 - 파일 하나의 최대 크기를 초과했습니다

#### 404 - 일기를 찾을 수 없습니다

---

### POST `diaries/media/:id/confirm`

**요약:** 업로드 완료 확정 (실측 크기로 한도 재검증)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 201 - 확정 성공

```json
{
  "media": {
    "id": "", // 미디어 ID (string)
    "type": null, // 미디어 종류 (MediaType)
    "url": "", // 조회용 URL (단기 만료 presigned GET) (string)
    "thumbnailUrl": null, // 썸네일 URL (string | null)
    "width": null, // 가로 픽셀 (number | null)
    "height": null, // 세로 픽셀 (number | null)
    "durationMs": null, // 영상 길이 (ms) (number | null)
    "sortOrder": 0 // 정렬 순서 (number)
  }, // 확정된 미디어 (DiaryMediaDto)
  "quota": {
    "tier": null, // 구독 등급 (SubscriptionTier)
    "monthly": {
      "usedBytes": 0,
      "limitBytes": 0,
      "remainingBytes": 0,
      "resetsAt": "2025-01-01T00:00:00Z"
    }, // 월간 한도 상태 (MediaQuotaMonthlyDto)
    "total": {
      "usedBytes": 0,
      "limitBytes": 0,
      "remainingBytes": 0
    }, // 누적 한도 상태 (MediaQuotaTotalDto)
    "perFileLimitBytes": 0, // 파일 1개 최대 크기 (bytes) (number)
    "videoAllowed": false, // 영상 첨부 가능 여부 (boolean)
    "maxVideoDurationMs": null // 영상 최대 길이 (ms) (number | null)
  } // 갱신된 한도 상태 (MediaQuotaDto)
}
```

#### 400 - 업로드된 파일을 찾을 수 없거나 형식이 다릅니다

#### 402 - 실측 크기가 용량 한도를 초과했습니다 (R2 파일 삭제됨)

#### 413 - 실측 크기가 파일 최대 크기를 초과했습니다 (R2 파일 삭제됨)

#### 404 - 첨부를 찾을 수 없습니다

---

### PATCH `diaries/media/reorder`

**요약:** 첨부 순서 변경

**Request Body:**

```json
{
  "mediaIds": "<String>" // 표시할 순서대로 나열한 미디어 ID 배열 (한 일기의 전체 첨부) (string[])
}
```

**Responses:**

#### 200 - 순서 변경 성공

```json
{
  "id": "", // 미디어 ID (string)
  "type": null, // 미디어 종류 (MediaType)
  "url": "", // 조회용 URL (단기 만료 presigned GET) (string)
  "thumbnailUrl": null, // 썸네일 URL (string | null)
  "width": null, // 가로 픽셀 (number | null)
  "height": null, // 세로 픽셀 (number | null)
  "durationMs": null, // 영상 길이 (ms) (number | null)
  "sortOrder": 0 // 정렬 순서 (number)
}
```

#### 404 - 첨부를 찾을 수 없습니다

---

### DELETE `diaries/media/:id`

**요약:** 미디어 삭제 (R2 즉시 영구 삭제, 누적 한도만 회복)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 첨부를 찾을 수 없습니다

#### 403 - 삭제 권한이 없습니다

---
