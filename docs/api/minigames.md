# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 미니게임

**Base Path:** `/minigames`

### POST `minigames/results`

**요약:** 게임 결과 저장

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "gameType": null, // 게임 타입 (MinigameType)
  "title": "저녁 메뉴 정하기", // 게임 제목 (string)
  "participants": ["아빠", "엄마", "민준"], // 참여자 이름 목록 (string[])
  "options": ["삼겹살", "치킨", "피자"], // 결과 항목 목록 (string[])
  "result": { "assignments": [{ "participant": "아빠", "option": "치킨" }] } // 게임 결과 (Record<string, unknown>)
}
```

**Responses:**

#### 201 - 게임 결과 저장 성공

```json
{
  "id": "uuid-1234", // 결과 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "gameType": null, // 게임 타입 (MinigameType)
  "title": "저녁 메뉴 정하기", // 게임 제목 (string)
  "participants": ["아빠", "엄마", "민준"], // 참여자 이름 목록 (string[])
  "options": ["삼겹살", "치킨", "피자"], // 결과 항목 목록 (string[])
  "result": { "assignments": [{ "participant": "아빠", "option": "치킨" }] }, // 게임 결과 (Record<string, unknown>)
  "createdBy": "uuid-user", // 생성자 userId (string)
  "createdAt": "2026-03-06T12:00:00.000Z" // 생성 시각 (Date)
}
```

#### 403 - 그룹 멤버만 저장할 수 있습니다

---

### GET `minigames/results`

**요약:** 그룹 게임 이력 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID
- `gameType` (`MinigameType`) (Optional): 게임 타입 필터
- `limit` (`number`) (Optional): 조회 개수
- `offset` (`number`) (Optional): 오프셋

**Responses:**

#### 200 - 게임 이력 조회 성공

```json
{
  "items": [
    {
      "id": "uuid-1234", // 결과 ID (string)
      "groupId": "uuid-1234", // 그룹 ID (string)
      "gameType": null, // 게임 타입 (MinigameType)
      "title": "저녁 메뉴 정하기", // 게임 제목 (string)
      "participants": ["아빠", "엄마", "민준"], // 참여자 이름 목록 (string[])
      "options": ["삼겹살", "치킨", "피자"], // 결과 항목 목록 (string[])
      "result": {
        "assignments": [{ "participant": "아빠", "option": "치킨" }]
      }, // 게임 결과 (Record<string, unknown>)
      "createdBy": "uuid-user", // 생성자 userId (string)
      "createdAt": "2026-03-06T12:00:00.000Z" // 생성 시각 (Date)
    }
  ], // MinigameResultDto[]
  "total": 42, // 전체 개수 (number)
  "hasMore": true // 더 있는지 여부 (boolean)
}
```

#### 403 - 그룹 멤버만 조회할 수 있습니다

---

### DELETE `minigames/results/:id`

**요약:** 게임 이력 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 게임 이력 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 게임 이력을 찾을 수 없습니다

#### 403 - 본인 또는 그룹 관리자만 삭제할 수 있습니다

---
