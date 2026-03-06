# 13. 미니게임 (Minigame)

> **상태**: ✅ 완료
> **Phase**: Phase 5

---

## 개요

그룹 내에서 사다리타기, 룰렛 등의 미니게임을 진행하고 결과를 저장·조회하는 시스템입니다. 게임 로직은 UI에서 처리하며, 백엔드는 이력 저장 및 조회만 담당합니다.

---

## 주요 기능

### 게임 결과 저장
- 게임 타입 (`LADDER` | `ROULETTE`)
- 게임 제목, 참여자 목록, 결과 항목 목록
- 게임 결과 (사다리: 참여자↔항목 매핑, 룰렛: 당첨자)

### 이력 조회
- 그룹별 게임 이력 목록 (최신순)
- 게임 타입별 필터링
- 페이지네이션 (limit / offset)

### 이력 삭제
- 본인 또는 그룹 관리자(`MANAGE_MEMBER` 권한) 삭제 가능

---

## 데이터베이스

```prisma
model MinigameResult {
  id           String       @id @default(uuid())
  groupId      String
  gameType     MinigameType
  title        String       @db.VarChar(200)
  participants Json         // string[]
  options      Json         // string[]
  result       Json         // { assignments: [...] } | { winner: string }
  createdBy    String
  createdAt    DateTime     @default(now())

  @@index([groupId, createdAt(sort: Desc)])
  @@index([groupId, gameType])
  @@index([createdBy])
  @@map("minigame_results")
}

enum MinigameType {
  LADDER
  ROULETTE
}
```

---

## 구현 상태

### ✅ 완료
- [x] 게임 결과 저장 (`POST /minigames/results`)
- [x] 그룹 이력 조회 (`GET /minigames/results`)
- [x] 이력 삭제 (`DELETE /minigames/results/:id`)
- [x] 그룹 멤버십 검증
- [x] 삭제 권한 검증 (본인 또는 그룹 관리자)

---

## API 엔드포인트

| Method | Endpoint                  | 설명          | 권한                     |
| ------ | ------------------------- | ------------- | ------------------------ |
| POST   | `/minigames/results`      | 게임 결과 저장 | JWT, 그룹 멤버           |
| GET    | `/minigames/results`      | 그룹 이력 조회 | JWT, 그룹 멤버           |
| DELETE | `/minigames/results/:id`  | 이력 삭제      | JWT, 본인 또는 그룹 관리자 |

### POST /minigames/results

**Request Body:**
```json
{
  "groupId": "uuid-1234",
  "gameType": "LADDER",
  "title": "저녁 메뉴 정하기",
  "participants": ["아빠", "엄마", "민준"],
  "options": ["삼겹살", "치킨", "피자"],
  "result": {
    "assignments": [
      { "participant": "아빠", "option": "치킨" },
      { "participant": "엄마", "option": "삼겹살" },
      { "participant": "민준", "option": "피자" }
    ]
  }
}
```

### GET /minigames/results

**Query Parameters:**

| 파라미터   | 타입              | 필수 | 기본값 | 설명           |
| --------- | ----------------- | ---- | ------ | -------------- |
| `groupId` | string            | ✅   | -      | 그룹 ID        |
| `gameType`| `LADDER\|ROULETTE`| ❌   | -      | 게임 타입 필터 |
| `limit`   | number            | ❌   | 20     | 조회 개수      |
| `offset`  | number            | ❌   | 0      | 오프셋         |

**Response:**
```json
{
  "items": [ /* MinigameResult[] */ ],
  "total": 42,
  "hasMore": true
}
```

---

**Last Updated**: 2026-03-06
