# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 다이어리

**Base Path:** `/diaries`

### POST `diaries`

**요약:** 일기 생성

**Request Body:**

```json
{
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD', 생략 시 오늘 — 하루 경계 새벽 4시) (string?)
  "title": "가을 첫날", // 일기 제목 (string?)
  "content": "{"ops":[{"insert":"오늘의 일기\n"}]}", // Delta JSON 문자열 (format=DELTA) 또는 일반 텍스트 (string?)
  "format": null, // 일기 형식 (기본값: DELTA) (DiaryFormat?)
  "visibility": null, // 공개 범위 (기본값: PRIVATE) (DiaryVisibility?)
  "groupId": "", // 그룹 ID (GROUP 공개 시 필수) (string?)
  "mood": "😊", // 기분 이모지/코드 (string?)
  "weather": "SUNNY" // 날씨 코드 (string?)
}
```

**Responses:**

#### 201 - 일기 생성 성공

```json
{
  "id": "uuid-1234", // 일기 ID (string)
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
  "title": "가을 첫날", // 제목 (string | null)
  "content": "", // Delta JSON 문자열 또는 일반 텍스트 (string)
  "plainText": null, // 검색용 평문 (서버 추출) (string | null)
  "format": null, // 일기 형식 (DiaryFormat)
  "visibility": null, // 공개 범위 (DiaryVisibility)
  "mood": "😊", // 기분 이모지/코드 (string | null)
  "weather": "SUNNY", // 날씨 코드 (string | null)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (DiaryAuthorDto)
  "hasMedia": false, // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### POST `diaries/append`

**요약:** 빠른 기록 (그날 일기에 조각 append — 없으면 생성)

**Request Body:**

```json
{
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD', 생략 시 오늘 — 하루 경계 새벽 4시) (string?)
  "text": "점심에 본 고양이", // 텍스트 조각 (string)
  "capturedAt": "14:32", // 조각 시각 마커 ('HH:mm') (string?)
  "visibility": null, // 공개 범위 (일기가 새로 생성될 때만 적용, 기본값 PRIVATE) (DiaryVisibility?)
  "groupId": "" // 그룹 ID (일기가 새로 생성되고 GROUP 공개일 때만 적용) (string?)
}
```

**Responses:**

#### 201 - 빠른 기록 성공

```json
{
  "id": "uuid-1234", // 일기 ID (string)
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
  "created": true, // 이 요청으로 일기가 새로 생성되었는지 (boolean)
  "appended": {
    "text": "점심에 본 고양이", // 추가된 텍스트 조각 (string)
    "capturedAt": "14:32" // 조각 시각 마커 ('HH:mm') (string | null)
  }, // 추가된 조각 (AppendedFragmentDto)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `diaries`

**요약:** 일기 목록 조회

**Query Parameters:**

- `page` (`number`) (Optional): 페이지 번호
- `limit` (`number`) (Optional): 페이지 크기
- `from` (`string`) (Optional): 조회 시작일 ('YYYY-MM-DD')
- `to` (`string`) (Optional): 조회 종료일 ('YYYY-MM-DD')
- `visibility` (`DiaryVisibility`) (Optional): 공개 범위 필터
- `groupId` (`string`) (Optional): 그룹 ID 필터
- `search` (`string`) (Optional): 검색어 (제목/본문)

**Responses:**

#### 200 - 일기 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid-1234", // 일기 ID (string)
      "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
      "title": "가을 첫날", // 제목 (string | null)
      "content": "", // Delta JSON 문자열 또는 일반 텍스트 (string)
      "plainText": null, // 검색용 평문 (서버 추출) (string | null)
      "format": null, // 일기 형식 (DiaryFormat)
      "visibility": null, // 공개 범위 (DiaryVisibility)
      "mood": "😊", // 기분 이모지/코드 (string | null)
      "weather": "SUNNY", // 날씨 코드 (string | null)
      "groupId": null, // 그룹 ID (string | null)
      "user": {
        "id": "uuid-1234",
        "name": "홍길동"
      }, // 작성자 정보 (DiaryAuthorDto)
      "hasMedia": false, // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 일기 목록 (DiaryDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `diaries/calendar`

**요약:** 월별 작성 현황 조회 (캘린더뷰용)

**Query Parameters:**

- `year` (`number`): 연도
- `month` (`number`): 월 (1~12)
- `groupId` (`string`) (Optional): 그룹 ID (지정 시 그룹원 전체의 그룹 공개 일기)

**Responses:**

#### 200 - 월별 작성 현황 조회 성공

```json
{
  "days": [
    {
      "date": "2026-09-01", // 날짜 ('YYYY-MM-DD') (string)
      "diaryId": "uuid-1234", // 일기 ID (string)
      "userId": "uuid-1234", // 작성자 ID (string)
      "authorName": "홍길동", // 작성자 이름 (string)
      "mood": "😊", // 기분 이모지/코드 (string | null)
      "hasMedia": false // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
    }
  ] // 작성 현황 (그룹 조회 시 같은 날짜가 여러 건일 수 있음) (DiaryCalendarDayDto[])
}
```

#### 403 - 그룹에 접근할 권한이 없습니다

---

### GET `diaries/streak`

**요약:** 연속 작성일수 조회 (하루 경계 = 새벽 4시)

**Responses:**

#### 200 - 연속 작성일수 조회 성공

```json
{
  "currentStreak": 5, // 현재 연속 작성일수 (number)
  "thisMonthCount": 12, // 이번 달 작성일수 (number)
  "longestStreak": 23 // 최장 연속 작성일수 (number)
}
```

---

### GET `diaries/flashback`

**요약:** 회고 조회 (1·3·6개월, n년 전 오늘)

**Responses:**

#### 200 - 회고 조회 성공

```json
{
  "items": [
    {
      "id": "uuid-1234", // 일기 ID (string)
      "date": "2025-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
      "label": "1년 전 오늘", // 회고 라벨 (string)
      "title": "가을 첫날", // 제목 (string | null)
      "excerpt": null, // 본문 발췌 (평문 앞부분) (string | null)
      "mood": "😊" // 기분 이모지/코드 (string | null)
    }
  ] // 회고 목록 (없으면 빈 배열) (DiaryFlashbackItemDto[])
}
```

---

### GET `diaries/by-date/:date`

**요약:** 특정 날짜의 내 일기 조회 ('YYYY-MM-DD')

**Path Parameters:**

- `date` (`string`)

**Responses:**

#### 200 - 일기 조회 성공

```json
{
  "id": "uuid-1234", // 일기 ID (string)
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
  "title": "가을 첫날", // 제목 (string | null)
  "content": "", // Delta JSON 문자열 또는 일반 텍스트 (string)
  "plainText": null, // 검색용 평문 (서버 추출) (string | null)
  "format": null, // 일기 형식 (DiaryFormat)
  "visibility": null, // 공개 범위 (DiaryVisibility)
  "mood": "😊", // 기분 이모지/코드 (string | null)
  "weather": "SUNNY", // 날씨 코드 (string | null)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (DiaryAuthorDto)
  "hasMedia": false, // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 해당 날짜의 일기를 찾을 수 없습니다

---

### GET `diaries/:id`

**요약:** 일기 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 일기 상세 조회 성공

```json
{
  "id": "uuid-1234", // 일기 ID (string)
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
  "title": "가을 첫날", // 제목 (string | null)
  "content": "", // Delta JSON 문자열 또는 일반 텍스트 (string)
  "plainText": null, // 검색용 평문 (서버 추출) (string | null)
  "format": null, // 일기 형식 (DiaryFormat)
  "visibility": null, // 공개 범위 (DiaryVisibility)
  "mood": "😊", // 기분 이모지/코드 (string | null)
  "weather": "SUNNY", // 날씨 코드 (string | null)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (DiaryAuthorDto)
  "hasMedia": false, // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 일기를 찾을 수 없습니다

#### 403 - 일기에 접근할 권한이 없습니다

---

### PATCH `diaries/:id`

**요약:** 일기 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 일기 수정 성공

```json
{
  "id": "uuid-1234", // 일기 ID (string)
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
  "title": "가을 첫날", // 제목 (string | null)
  "content": "", // Delta JSON 문자열 또는 일반 텍스트 (string)
  "plainText": null, // 검색용 평문 (서버 추출) (string | null)
  "format": null, // 일기 형식 (DiaryFormat)
  "visibility": null, // 공개 범위 (DiaryVisibility)
  "mood": "😊", // 기분 이모지/코드 (string | null)
  "weather": "SUNNY", // 날씨 코드 (string | null)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (DiaryAuthorDto)
  "hasMedia": false, // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 일기를 찾을 수 없습니다

#### 403 - 본인의 일기만 수정할 수 있습니다

---

### DELETE `diaries/:id`

**요약:** 일기 삭제 (soft delete, 30일 내 복구 가능)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 일기 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 일기를 찾을 수 없습니다

#### 403 - 본인의 일기만 삭제할 수 있습니다

---

### POST `diaries/:id/restore`

**요약:** 삭제한 일기 복구 (30일 이내)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 201 - 일기 복구 성공

```json
{
  "id": "uuid-1234", // 일기 ID (string)
  "date": "2026-09-01", // 일기 날짜 ('YYYY-MM-DD') (string)
  "title": "가을 첫날", // 제목 (string | null)
  "content": "", // Delta JSON 문자열 또는 일반 텍스트 (string)
  "plainText": null, // 검색용 평문 (서버 추출) (string | null)
  "format": null, // 일기 형식 (DiaryFormat)
  "visibility": null, // 공개 범위 (DiaryVisibility)
  "mood": "😊", // 기분 이모지/코드 (string | null)
  "weather": "SUNNY", // 날씨 코드 (string | null)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (DiaryAuthorDto)
  "hasMedia": false, // 첨부 미디어 존재 여부 (Phase 1에서는 항상 false) (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 복구할 일기를 찾을 수 없거나 복구 기간이 지났습니다

#### 403 - 본인의 일기만 복구할 수 있습니다

---
