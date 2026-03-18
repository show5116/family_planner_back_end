# 15. 그룹 투표 (Vote)

> **상태**: ✅ 완료
> **Phase**: Phase 3

---

## 개요

그룹 멤버들이 함께 의사결정을 내릴 수 있는 투표 시스템입니다. 복수 선택, 익명 투표, 마감 시각 설정을 지원하며, 그룹 멤버라면 누구나 투표를 생성·참여할 수 있습니다.

---

## 주요 기능

### 투표 생성
- 투표 제목 및 설명
- 선택지 2개 이상 등록
- 복수 선택 허용 여부 (`isMultiple`)
- 익명 투표 여부 (`isAnonymous`) — 익명 시 투표자 이름 비공개
- 마감 시각 설정 (`endsAt`) — 미설정 시 무기한

### 투표 참여
- 단일/복수 선택 지원
- 기존 선택 변경 가능 (전체 교체 방식)
- 마감된 투표는 참여/변경/취소 불가

### 투표 취소
- 마감 전이라면 본인 투표 취소 가능

### 투표 삭제
- 작성자 또는 그룹 OWNER만 삭제 가능

### 결과 조회
- 선택지별 득표 수 및 비율
- 익명 투표가 아닐 경우 투표자 이름 공개
- 현재 사용자의 선택 여부 표시
- 투표 상태 필터 (전체 / 진행 중 / 마감)

---

## 데이터베이스

```prisma
model Vote {
  id          String       @id @default(uuid())
  groupId     String
  createdBy   String
  title       String       @db.VarChar(200)
  description String?      @db.Text
  isMultiple  Boolean      @default(false)
  isAnonymous Boolean      @default(false)
  endsAt      DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  group       Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator     User         @relation("VoteCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  options     VoteOption[]

  @@index([groupId, createdAt(sort: Desc)])
  @@index([createdBy])
  @@map("votes")
}

model VoteOption {
  id      String       @id @default(uuid())
  voteId  String
  label   String       @db.VarChar(100)

  vote    Vote         @relation(fields: [voteId], references: [id], onDelete: Cascade)
  ballots VoteBallot[]

  @@index([voteId])
  @@map("vote_options")
}

model VoteBallot {
  id       String     @id @default(uuid())
  optionId String
  userId   String
  votedAt  DateTime   @default(now())

  option   VoteOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  user     User       @relation("VoteBallots", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([optionId, userId])  // 선택지당 1표
  @@index([optionId])
  @@index([userId])
  @@map("vote_ballots")
}
```

---

## 구현 상태

### ✅ 완료
- [x] 투표 목록 조회 (`GET /groups/:groupId/votes`)
- [x] 투표 상세 조회 (`GET /groups/:groupId/votes/:voteId`)
- [x] 투표 생성 (`POST /groups/:groupId/votes`)
- [x] 투표 삭제 (`DELETE /groups/:groupId/votes/:voteId`)
- [x] 투표 참여/변경 (`POST /groups/:groupId/votes/:voteId/ballots`)
- [x] 투표 취소 (`DELETE /groups/:groupId/votes/:voteId/ballots`)
- [x] 그룹 멤버십 검증
- [x] 마감 시각 검증
- [x] 익명 투표 지원
- [x] 복수 선택 지원

---

## API 엔드포인트

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/votes/:groupId` | 투표 목록 조회 | JWT, 그룹 멤버 |
| GET | `/votes/:groupId/:voteId` | 투표 상세 조회 | JWT, 그룹 멤버 |
| POST | `/votes/:groupId` | 투표 생성 | JWT, 그룹 멤버 |
| DELETE | `/votes/:groupId/:voteId` | 투표 삭제 | JWT, 작성자 또는 그룹 OWNER |
| POST | `/votes/:groupId/:voteId/ballots` | 투표 참여/변경 | JWT, 그룹 멤버 |
| DELETE | `/votes/:groupId/:voteId/ballots` | 투표 취소 | JWT, 그룹 멤버 |

### GET /votes/:groupId

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `status` | `ALL \| ONGOING \| CLOSED` | ❌ | `ALL` | 투표 상태 필터 |
| `page` | number | ❌ | 1 | 페이지 번호 |
| `limit` | number | ❌ | 20 | 페이지 크기 |

**Response:**
```json
{
  "items": [ /* VoteDto[] */ ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### POST /votes/:groupId

**Request Body:**
```json
{
  "title": "저녁 메뉴 투표",
  "description": "오늘 저녁 뭐 먹을까요?",
  "isMultiple": false,
  "isAnonymous": false,
  "endsAt": "2026-03-25T23:59:00.000Z",
  "options": ["치킨", "피자", "삼겹살"]
}
```

### POST /votes/:groupId/:voteId/ballots

**Request Body:**
```json
{
  "optionIds": ["option-uuid-1"]
}
```

> 복수 선택 투표라면 `optionIds`에 여러 ID를 전달합니다. 기존 선택이 있으면 전체 교체됩니다.

---

## 비즈니스 규칙

- 마감된 투표(`endsAt <= now`)는 참여/변경/취소 불가
- 단일 선택 투표(`isMultiple: false`)에 optionIds 2개 이상 전달 시 400 오류
- 익명 투표(`isAnonymous: true`)는 응답의 `voters` 배열이 항상 빈 배열
- 투표 변경은 기존 선택 전체 삭제 후 재등록 방식
- 삭제 권한: 작성자이거나, 그룹 OWNER 역할(`name === 'OWNER'`)인 경우

---

**Last Updated**: 2026-03-18
