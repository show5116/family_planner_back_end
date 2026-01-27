# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 일정 및 할일

**Base Path:** `/tasks`

### GET `tasks/categories`

**요약:** 카테고리 목록 조회

**Query Parameters:**

- `groupId` (`string`) - Optional

**Responses:**

#### 200 - 카테고리 목록 조회 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string | null)
  "emoji": "💼", // 이모지 (string | null)
  "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### POST `tasks/categories`

**요약:** 카테고리 생성

**Request Body:**

```json
{
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string?)
  "emoji": "💼", // 이모지 (string?)
  "color": "#3B82F6", // 색상 코드 (HEX) (string?)
  "groupId": "uuid" // 그룹 ID (그룹 카테고리 생성 시) (string?)
}
```

**Responses:**

#### 201 - 카테고리 생성 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string | null)
  "emoji": "💼", // 이모지 (string | null)
  "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `tasks/categories/:id`

**요약:** 카테고리 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "업무", // 카테고리 이름 (string?)
  "description": "업무 관련 일정", // 설명 (string?)
  "emoji": "💼", // 이모지 (string?)
  "color": "#3B82F6" // 색상 코드 (HEX) (string?)
}
```

**Responses:**

#### 200 - 카테고리 수정 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string | null)
  "emoji": "💼", // 이모지 (string | null)
  "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 카테고리를 찾을 수 없음

#### 403 - 본인 작성 카테고리만 수정 가능

---

### DELETE `tasks/categories/:id`

**요약:** 카테고리 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 카테고리 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 카테고리를 찾을 수 없음

#### 403 - 연결된 Task가 있으면 삭제 불가

---

### GET `tasks`

**요약:** Task 목록 조회 (캘린더/할일 뷰)

**Query Parameters:**

- `view` (`'calendar' | 'todo'`) (Optional): 뷰 타입
- `groupId` (`string`) (Optional): 그룹 ID
- `categoryId` (`string`) (Optional): 카테고리 ID
- `type` (`TaskType`) (Optional): Task 타입
- `priority` (`TaskPriority`) (Optional): 우선순위
- `isCompleted` (`boolean`) (Optional): 완료 여부
- `startDate` (`string`) (Optional): 시작 날짜
- `endDate` (`string`) (Optional): 종료 날짜
- `page` (`number`) (Optional): 페이지
- `limit` (`number`) (Optional): 페이지 크기

**Responses:**

#### 200 - Task 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "groupId": "uuid", // 그룹 ID (string | null)
      "title": "회의 참석", // 제목 (string)
      "description": "분기 결산 회의", // 설명 (string | null)
      "location": null, // 장소 (string | null)
      "type": null, // Task 타입 (TaskType)
      "priority": null, // 우선순위 (TaskPriority)
      "category": {
        "id": "uuid",
        "userId": "uuid",
        "groupId": "uuid",
        "name": "업무",
        "description": "업무 관련 일정",
        "emoji": "💼",
        "color": "#3B82F6",
        "createdAt": "2025-12-30T00:00:00Z",
        "updatedAt": "2025-12-30T00:00:00Z"
      }, // 카테고리 (CategoryDto)
      "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
      "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
      "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
      "isCompleted": false, // 완료 여부 (boolean)
      "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
      "recurring": {
        "id": "uuid",
        "ruleType": "WEEKLY",
        "ruleConfig": { "daysOfWeek": [1, 3, 5] },
        "generationType": "AUTO_SCHEDULER",
        "isActive": true
      }, // 반복 정보 (RecurringDto | null)
      "participants": {
        "id": "uuid",
        "taskId": "uuid",
        "userId": "uuid",
        "user": "<ParticipantUserDto>",
        "createdAt": "2025-01-01T00:00:00Z"
      }, // 참여자 목록 (TaskParticipantDto[]?)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // TaskDto[]
  "meta": {
    "page": 1, // 현재 페이지 (number)
    "limit": 20, // 페이지당 항목 수 (number)
    "total": 42, // 전체 항목 수 (number)
    "totalPages": 3 // 전체 페이지 수 (number)
  } // PaginationMetaDto
}
```

---

### GET `tasks/:id`

**요약:** Task 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - Task 상세 조회 성공

```json
{
  "reminders": [
    {
      "id": "uuid", // ID (string)
      "reminderType": "BEFORE_START", // 알림 타입 (string)
      "offsetMinutes": 0, // 오프셋 (분) (number)
      "sentAt": "2025-01-01T00:00:00Z" // 발송 시간 (Date | null)
    }
  ], // 알림 목록 (TaskReminderResponseDto[])
  "histories": [
    {
      "id": "uuid", // ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "action": null, // 변경 유형 (TaskHistoryAction)
      "changes": null, // 변경 내용 (any | null)
      "createdAt": "2025-01-01T00:00:00Z" // 변경 시간 (Date)
    }
  ] // 변경 이력 (TaskHistoryDto[])
}
```

#### 404 - Task를 찾을 수 없음

#### 403 - 그룹 Task는 그룹 멤버만 조회 가능

---

### POST `tasks`

**요약:** Task 생성

**Request Body:**

```json
{
  "title": "회의 참석", // Task 제목 (string)
  "description": "분기 결산 회의", // 상세 설명 (string?)
  "location": "본사 2층 회의실", // 장소 (string?)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority?)
  "categoryId": "uuid", // 카테고리 ID (string)
  "groupId": "uuid", // 그룹 ID (그룹 Task 생성 시) (string?)
  "scheduledAt": "2025-12-30T09:00:00Z", // 수행 시작 날짜 (string?)
  "dueAt": "2025-12-30T18:00:00Z", // 마감 날짜 (string?)
  "recurring": {
    "ruleType": null, // 반복 타입 (RecurringRuleType)
    "ruleConfig": { "daysOfWeek": [1, 3, 5] }, // 반복 설정 (Record<string, any>)
    "generationType": null // 생성 방식 (RecurringGenerationType)
  }, // 반복 규칙 (RecurringRuleDto?)
  "reminders": [
    {
      "reminderType": null, // 알림 타입 (TaskReminderType)
      "offsetMinutes": 0 // 오프셋 (분, 음수 가능) (number)
    }
  ], // 알림 목록 (TaskReminderDto[]?)
  "participantIds": ["uuid-1", "uuid-2"] // 참여자 ID 목록 (그룹 Task에서만 사용 가능) (string[]?)
}
```

**Responses:**

#### 201 - Task 생성 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "title": "회의 참석", // 제목 (string)
  "description": "분기 결산 회의", // 설명 (string | null)
  "location": null, // 장소 (string | null)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority)
  "category": {
    "id": "uuid", // ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "groupId": "uuid", // 그룹 ID (string | null)
    "name": "업무", // 카테고리 이름 (string)
    "description": "업무 관련 일정", // 설명 (string | null)
    "emoji": "💼", // 이모지 (string | null)
    "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
    "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
  }, // 카테고리 (CategoryDto)
  "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
  "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
  "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
  "isCompleted": false, // 완료 여부 (boolean)
  "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
  "recurring": {
    "id": "uuid", // ID (string)
    "ruleType": "WEEKLY", // 반복 타입 (string)
    "ruleConfig": { "daysOfWeek": [1, 3, 5] }, // 반복 설정 (Record<string, any>)
    "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
    "isActive": true // 활성화 여부 (boolean)
  }, // 반복 정보 (RecurringDto | null)
  "participants": [
    {
      "id": "uuid", // 참여자 ID (string)
      "taskId": "uuid", // Task ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "user": {
        "id": "uuid",
        "name": "홍길동",
        "profileImageKey": "profile/uuid.jpg"
      }, // 참여자 정보 (ParticipantUserDto)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 참여자 목록 (TaskParticipantDto[]?)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `tasks/:id`

**요약:** Task 수정

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `updateScope` (`'current' | 'future'`) - Optional

**Request Body:**

```json
{
  "title": "회의 참석", // Task 제목 (string?)
  "description": "분기 결산 회의", // 상세 설명 (string?)
  "location": "본사 2층 회의실", // 장소 (string?)
  "type": null, // Task 타입 (TaskType?)
  "priority": null, // 우선순위 (TaskPriority?)
  "scheduledAt": "2025-12-30T09:00:00Z", // 수행 시작 날짜 (string?)
  "dueAt": "2025-12-30T18:00:00Z", // 마감 날짜 (string?)
  "participantIds": ["uuid-1", "uuid-2"] // 참여자 ID 목록 (그룹 Task에서만 사용 가능) (string[]?)
}
```

**Responses:**

#### 200 - Task 수정 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "title": "회의 참석", // 제목 (string)
  "description": "분기 결산 회의", // 설명 (string | null)
  "location": null, // 장소 (string | null)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority)
  "category": {
    "id": "uuid", // ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "groupId": "uuid", // 그룹 ID (string | null)
    "name": "업무", // 카테고리 이름 (string)
    "description": "업무 관련 일정", // 설명 (string | null)
    "emoji": "💼", // 이모지 (string | null)
    "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
    "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
  }, // 카테고리 (CategoryDto)
  "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
  "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
  "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
  "isCompleted": false, // 완료 여부 (boolean)
  "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
  "recurring": {
    "id": "uuid", // ID (string)
    "ruleType": "WEEKLY", // 반복 타입 (string)
    "ruleConfig": { "daysOfWeek": [1, 3, 5] }, // 반복 설정 (Record<string, any>)
    "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
    "isActive": true // 활성화 여부 (boolean)
  }, // 반복 정보 (RecurringDto | null)
  "participants": [
    {
      "id": "uuid", // 참여자 ID (string)
      "taskId": "uuid", // Task ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "user": {
        "id": "uuid",
        "name": "홍길동",
        "profileImageKey": "profile/uuid.jpg"
      }, // 참여자 정보 (ParticipantUserDto)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 참여자 목록 (TaskParticipantDto[]?)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - Task를 찾을 수 없음

#### 403 - 본인 작성 Task만 수정 가능

---

### PATCH `tasks/:id/complete`

**요약:** Task 완료/미완료 처리

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "isCompleted": true // 완료 여부 (boolean)
}
```

**Responses:**

#### 200 - Task 완료 처리 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "title": "회의 참석", // 제목 (string)
  "description": "분기 결산 회의", // 설명 (string | null)
  "location": null, // 장소 (string | null)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority)
  "category": {
    "id": "uuid", // ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "groupId": "uuid", // 그룹 ID (string | null)
    "name": "업무", // 카테고리 이름 (string)
    "description": "업무 관련 일정", // 설명 (string | null)
    "emoji": "💼", // 이모지 (string | null)
    "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
    "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
  }, // 카테고리 (CategoryDto)
  "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
  "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
  "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
  "isCompleted": false, // 완료 여부 (boolean)
  "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
  "recurring": {
    "id": "uuid", // ID (string)
    "ruleType": "WEEKLY", // 반복 타입 (string)
    "ruleConfig": { "daysOfWeek": [1, 3, 5] }, // 반복 설정 (Record<string, any>)
    "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
    "isActive": true // 활성화 여부 (boolean)
  }, // 반복 정보 (RecurringDto | null)
  "participants": [
    {
      "id": "uuid", // 참여자 ID (string)
      "taskId": "uuid", // Task ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "user": {
        "id": "uuid",
        "name": "홍길동",
        "profileImageKey": "profile/uuid.jpg"
      }, // 참여자 정보 (ParticipantUserDto)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 참여자 목록 (TaskParticipantDto[]?)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - Task를 찾을 수 없음

---

### DELETE `tasks/:id`

**요약:** Task 삭제

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `deleteScope` (`'current' | 'future' | 'all'`) - Optional

**Responses:**

#### 200 - Task 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - Task를 찾을 수 없음

#### 403 - 본인 작성 Task만 삭제 가능

---

### PATCH `tasks/recurrings/:id/pause`

**요약:** 반복 일정 일시정지/재개

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 반복 일정 상태 변경 성공

```json
{
  "id": "uuid", // ID (string)
  "ruleType": "WEEKLY", // 반복 타입 (string)
  "ruleConfig": { "daysOfWeek": [1, 3, 5] }, // 반복 설정 (Record<string, any>)
  "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
  "isActive": true // 활성화 여부 (boolean)
}
```

#### 404 - 반복 규칙을 찾을 수 없음

#### 403 - 본인 작성 반복 규칙만 변경 가능

---

### POST `tasks/recurrings/:id/skip`

**요약:** 반복 일정 건너뛰기

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "skipDate": "2025-12-30", // 건너뛸 날짜 (string)
  "reason": "공휴일" // 건너뛰는 이유 (string?)
}
```

**Responses:**

#### 201 - 반복 일정 건너뛰기 성공

```json
{
  "id": "uuid", // ID (string)
  "recurringId": "uuid", // 반복 규칙 ID (string)
  "skipDate": "2025-12-30", // 건너뛸 날짜 (Date)
  "reason": null, // 건너뛰는 이유 (string | null)
  "createdBy": "uuid", // 생성자 ID (string)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
}
```

#### 404 - 반복 규칙을 찾을 수 없음

#### 403 - 본인 작성 반복 규칙만 건너뛰기 가능

---
