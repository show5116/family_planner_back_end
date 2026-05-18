# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 투표

**Base Path:** `/votes`

### GET `votes/:groupId`

**요약:** 투표 목록 조회

**Path Parameters:**

- `groupId` (`string`)

**Query Parameters:**

- `status` (`VoteStatusFilter`) (Optional): 투표 상태 필터
- `page` (`number`) (Optional): 페이지
- `limit` (`number`) (Optional): 페이지 크기

**Responses:**

#### 200 - 투표 목록 조회 성공

```json
{
  "items": [
    {
      "id": "uuid-1234", // 투표 ID (string)
      "groupId": "uuid-5678", // 그룹 ID (string)
      "title": "저녁 메뉴 투표", // 투표 제목 (string)
      "description": "오늘 저녁 뭐 먹을까요?", // 투표 설명 (string | null)
      "isMultiple": false, // 복수 선택 허용 여부 (boolean)
      "isAnonymous": false, // 익명 투표 여부 (boolean)
      "endsAt": "2025-01-01T00:00:00Z", // 마감 시각 (Date | null)
      "isOngoing": true, // 진행 중 여부 (boolean)
      "totalVoters": 5, // 총 투표 참여자 수 (number)
      "hasVoted": false, // 현재 사용자 참여 여부 (boolean)
      "creatorName": "홍길동", // 작성자 이름 (string)
      "createdAt": "2025-01-01T00:00:00Z", // 생성 시각 (Date)
      "options": {
        "id": "uuid-1234",
        "label": "치킨",
        "count": 3,
        "isSelected": false,
        "voters": ["홍길동", "김철수"]
      } // 선택지 목록 (VoteOptionDto[])
    }
  ], // VoteDto[]
  "total": 10, // number
  "page": 1, // number
  "limit": 20, // number
  "totalPages": 1 // number
}
```

---

### GET `votes/:groupId/:voteId`

**요약:** 투표 상세 조회

**Path Parameters:**

- `groupId` (`string`)
- `voteId` (`string`)

**Responses:**

#### 200 - 투표 상세 조회 성공

```json
{
  "id": "uuid-1234", // 투표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "title": "저녁 메뉴 투표", // 투표 제목 (string)
  "description": "오늘 저녁 뭐 먹을까요?", // 투표 설명 (string | null)
  "isMultiple": false, // 복수 선택 허용 여부 (boolean)
  "isAnonymous": false, // 익명 투표 여부 (boolean)
  "endsAt": "2025-01-01T00:00:00Z", // 마감 시각 (Date | null)
  "isOngoing": true, // 진행 중 여부 (boolean)
  "totalVoters": 5, // 총 투표 참여자 수 (number)
  "hasVoted": false, // 현재 사용자 참여 여부 (boolean)
  "creatorName": "홍길동", // 작성자 이름 (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성 시각 (Date)
  "options": [
    {
      "id": "uuid-1234", // 선택지 ID (string)
      "label": "치킨", // 선택지 내용 (string)
      "count": 3, // 득표 수 (number)
      "isSelected": false, // 현재 사용자의 선택 여부 (boolean)
      "voters": ["홍길동", "김철수"] // 투표한 사용자 목록 (익명 투표 시 빈 배열) (string[])
    }
  ] // 선택지 목록 (VoteOptionDto[])
}
```

#### 404 - 투표를 찾을 수 없습니다

---

### POST `votes/:groupId`

**요약:** 투표 생성

**Path Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "title": "저녁 메뉴 투표", // 투표 제목 (string)
  "description": "오늘 저녁 뭐 먹을까요?", // 투표 설명 (string?)
  "isMultiple": false, // 복수 선택 허용 여부 (boolean?)
  "isAnonymous": false, // 익명 투표 여부 (boolean?)
  "endsAt": "2026-03-25T23:59:00.000Z", // 투표 마감 시각 (ISO 8601) (string?)
  "options": ["치킨", "피자", "삼겹살"] // 투표 선택지 (최소 2개) (string[])
}
```

**Responses:**

#### 201 - 투표 생성 성공

```json
{
  "id": "uuid-1234", // 투표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "title": "저녁 메뉴 투표", // 투표 제목 (string)
  "description": "오늘 저녁 뭐 먹을까요?", // 투표 설명 (string | null)
  "isMultiple": false, // 복수 선택 허용 여부 (boolean)
  "isAnonymous": false, // 익명 투표 여부 (boolean)
  "endsAt": "2025-01-01T00:00:00Z", // 마감 시각 (Date | null)
  "isOngoing": true, // 진행 중 여부 (boolean)
  "totalVoters": 5, // 총 투표 참여자 수 (number)
  "hasVoted": false, // 현재 사용자 참여 여부 (boolean)
  "creatorName": "홍길동", // 작성자 이름 (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성 시각 (Date)
  "options": [
    {
      "id": "uuid-1234", // 선택지 ID (string)
      "label": "치킨", // 선택지 내용 (string)
      "count": 3, // 득표 수 (number)
      "isSelected": false, // 현재 사용자의 선택 여부 (boolean)
      "voters": ["홍길동", "김철수"] // 투표한 사용자 목록 (익명 투표 시 빈 배열) (string[])
    }
  ] // 선택지 목록 (VoteOptionDto[])
}
```

---

### DELETE `votes/:groupId/:voteId`

**요약:** 투표 삭제 (작성자 또는 그룹 관리자)

**Path Parameters:**

- `groupId` (`string`)
- `voteId` (`string`)

**Responses:**

#### 200 - 투표 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 투표를 찾을 수 없습니다

#### 403 - 투표 작성자 또는 그룹 관리자만 삭제할 수 있습니다

---

### POST `votes/:groupId/:voteId/ballots`

**요약:** 투표 참여 (선택지 선택/변경)

**Path Parameters:**

- `groupId` (`string`)
- `voteId` (`string`)

**Request Body:**

```json
{
  "optionIds": ["option-uuid-1"] // 선택한 선택지 ID 목록 (단일 선택 시 1개, 복수 선택 시 여러 개) (string[])
}
```

**Responses:**

#### 200 - 투표 참여 성공

```json
{
  "id": "uuid-1234", // 투표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "title": "저녁 메뉴 투표", // 투표 제목 (string)
  "description": "오늘 저녁 뭐 먹을까요?", // 투표 설명 (string | null)
  "isMultiple": false, // 복수 선택 허용 여부 (boolean)
  "isAnonymous": false, // 익명 투표 여부 (boolean)
  "endsAt": "2025-01-01T00:00:00Z", // 마감 시각 (Date | null)
  "isOngoing": true, // 진행 중 여부 (boolean)
  "totalVoters": 5, // 총 투표 참여자 수 (number)
  "hasVoted": false, // 현재 사용자 참여 여부 (boolean)
  "creatorName": "홍길동", // 작성자 이름 (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성 시각 (Date)
  "options": [
    {
      "id": "uuid-1234", // 선택지 ID (string)
      "label": "치킨", // 선택지 내용 (string)
      "count": 3, // 득표 수 (number)
      "isSelected": false, // 현재 사용자의 선택 여부 (boolean)
      "voters": ["홍길동", "김철수"] // 투표한 사용자 목록 (익명 투표 시 빈 배열) (string[])
    }
  ] // 선택지 목록 (VoteOptionDto[])
}
```

#### 404 - 투표를 찾을 수 없습니다

---

### DELETE `votes/:groupId/:voteId/ballots`

**요약:** 투표 취소

**Path Parameters:**

- `groupId` (`string`)
- `voteId` (`string`)

**Responses:**

#### 200 - 투표 취소 성공

```json
{
  "id": "uuid-1234", // 투표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "title": "저녁 메뉴 투표", // 투표 제목 (string)
  "description": "오늘 저녁 뭐 먹을까요?", // 투표 설명 (string | null)
  "isMultiple": false, // 복수 선택 허용 여부 (boolean)
  "isAnonymous": false, // 익명 투표 여부 (boolean)
  "endsAt": "2025-01-01T00:00:00Z", // 마감 시각 (Date | null)
  "isOngoing": true, // 진행 중 여부 (boolean)
  "totalVoters": 5, // 총 투표 참여자 수 (number)
  "hasVoted": false, // 현재 사용자 참여 여부 (boolean)
  "creatorName": "홍길동", // 작성자 이름 (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성 시각 (Date)
  "options": [
    {
      "id": "uuid-1234", // 선택지 ID (string)
      "label": "치킨", // 선택지 내용 (string)
      "count": 3, // 득표 수 (number)
      "isSelected": false, // 현재 사용자의 선택 여부 (boolean)
      "voters": ["홍길동", "김철수"] // 투표한 사용자 목록 (익명 투표 시 빈 배열) (string[])
    }
  ] // 선택지 목록 (VoteOptionDto[])
}
```

#### 404 - 투표를 찾을 수 없습니다

---
