# 06. 일정 및 할일 통합 관리 (Tasks Management)

> **상태**: ✅ 완료
> **Phase**: Phase 3

---

## 개요

일정(캘린더)과 할일(TODO)을 하나의 통합 시스템으로 관리합니다. 반복 일정, 알림, 카테고리 관리, 변경 이력 추적 기능을 제공합니다.

---

## 핵심 개념

- **하나의 Tasks 테이블**로 일정과 할일 통합 관리
- **Type 구분**:
  - `CALENDAR_ONLY`: 오직 일정 (캘린더 전용, 생일/기념일 등)
  - `TODO_LINKED`: 일정 + 할일 연동 (캘린더 + 할일 모두 표시)
  - `TODO_ONLY`: 오직 할일 (캘린더 미표시, 완료 체크 가능)
- **Status 구분**: `PENDING` / `IN_PROGRESS` / `COMPLETED` / `HOLD` / `DROP` / `FAILED`
- **이중 날짜 관리**:
  - `scheduled_at`: 수행 시작 날짜 (할일 목록 표시 시작)
  - `due_at`: 마감 날짜 (D-Day 계산 기준)
- **참여자 기능**: 그룹 Task에서 그룹 멤버를 참여자로 지정 가능
- **반복 일정**: 스케줄러 자동 생성 (매일 0시, 미래 3개월 분량)
- **알림 시스템**: 시작 전/마감 전 알림, 참여자 지정 시 알림
- **변경 이력**: 모든 변경사항 자동 기록
- **기념일 연동**: 그룹 기념일을 등록하고, Task에 `기념일 + N일/N년` 형태로 날짜 자동 계산

---

## 기념일 관리

그룹 단위로 기념일(연애 시작일, 결혼기념일 등)을 등록하고 경과일을 확인합니다.

- **목록** (`GET /tasks/anniversaries?groupId=...`): 그룹 기념일 목록 + 오늘 기준 경과일(`daysSince`) 반환
- **단건 조회** (`GET /tasks/anniversaries/:id`): 단건 조회 + `daysSince`
- **생성** (`POST /tasks/anniversaries`): 제목, 날짜, 이모지 등록
- **수정** (`PUT /tasks/anniversaries/:id`): 날짜 변경 시 연동된 모든 Task의 `scheduledAt` 자동 재계산
- **삭제** (`DELETE /tasks/anniversaries/:id`): 연동 Task의 `anniversaryId`는 자동으로 `null` 처리 (Task 자체는 유지)

### 기념일 연동 Task
Task 생성/수정 시 `anniversaryId + offsetDays + offsetType` 세 필드를 함께 전달하면 `scheduledAt`이 자동 계산됩니다.

| offsetType | 예시                                         |
| ---------- | -------------------------------------------- |
| `DAYS`     | `offsetDays=100` → 기념일 + 100일째 날       |
| `YEARS`    | `offsetDays=1` → 기념일로부터 정확히 1년 후  |

기념일 날짜가 수정되면 해당 기념일에 연동된 모든 Task의 `scheduledAt`이 일괄 재계산됩니다.

---

## 카테고리 관리

- **목록** (`GET /tasks/categories`): 개인 + 그룹 카테고리 조회, 그룹 ID 필터링
- **생성** (`POST /tasks/categories`): 이름, 설명, 이모지, 색상 입력, 그룹 카테고리 생성 시 권한 확인
- **수정** (`PUT /tasks/categories/:id`): 본인 카테고리만 수정
- **삭제** (`DELETE /tasks/categories/:id`): 연결된 Task 있으면 삭제 불가

---

## Task 관리

### 목록 조회 (`GET /tasks`)
- 캘린더 뷰 vs 할일 뷰 구분
  - `view=calendar`: CALENDAR_ONLY + TODO_LINKED 표시 (TODO_ONLY 제외)
  - `view=todo`: TODO_LINKED + TODO_ONLY 표시 (CALENDAR_ONLY 제외)
- 그룹, 카테고리, 타입, 우선순위, 완료 여부, 날짜 범위 필터링
- D-Day 계산 (`daysUntilDue`)
- 정렬: 캘린더(scheduledAt ASC), 할일(status ASC → priority DESC → dueAt ASC)

### 상세 조회 (`GET /tasks/:id`)
- 알림 목록 + 변경 이력 + 참여자 목록 포함
- 그룹 Task는 그룹 멤버만 조회 가능

### 생성 (`POST /tasks`)
- 제목, 타입 필수 (카테고리는 선택)
- 타입: `CALENDAR_ONLY` / `TODO_LINKED` / `TODO_ONLY`
- 반복 일정 설정 가능 (`recurring` 객체)
- 알림 설정 가능 (`reminders` 배열)
- 참여자 지정 가능 (`participantIds` 배열, 그룹 Task에서만)
- TaskHistory 자동 생성 (action=CREATE)
- 그룹 Task 생성 시 멤버에게 알림
- 참여자 지정 시 참여자에게 별도 알림

### 수정 (`PUT /tasks/:id`)
- 본인 Task만 수정
- 반복 Task인 경우 `updateScope` 필수:
  - `current`: 현재 Task만
  - `future`: 현재 + 미래 모든 반복 Task
- 참여자 변경 가능 (`participantIds` 배열, 그룹 Task에서만)
- 새로 추가된 참여자에게만 알림 발송
- TaskHistory 자동 생성 (action=UPDATE)

### 상태 변경 (`PATCH /tasks/:id/status`)
- `status` 필드로 상태 전환: `PENDING` / `IN_PROGRESS` / `COMPLETED` / `HOLD` / `DROP` / `FAILED`
- TaskHistory 자동 생성 (action=COMPLETE)

### 삭제 (`DELETE /tasks/:id`)
- Soft Delete (`deletedAt` 설정)
- 반복 Task인 경우 `deleteScope` 필수:
  - `current`: 현재만
  - `future`: 현재 + 미래
  - `all`: 과거 + 현재 + 미래

---

## 반복 일정 관리

- **일시정지/재개** (`PATCH /tasks/recurrings/:id/pause`): `isActive` 토글, 일시정지 시 스케줄러가 새 Task 생성 안함
- **건너뛰기** (`POST /tasks/recurrings/:id/skip`): 특정 날짜 건너뛰기, TaskSkip 레코드 생성, 그룹 반복 일정인 경우 멤버에게 알림

---

## 데이터베이스

### Categories
- userId, groupId (null이면 개인 카테고리)
- name, description, emoji, color

### Tasks
- userId, groupId, categoryId, recurringId
- anniversaryId (null이면 기념일 미연동), offsetDays, offsetType (DAYS/YEARS)
- title, description, location
- type (CALENDAR_ONLY, TODO_LINKED, TODO_ONLY)
- status (PENDING, IN_PROGRESS, COMPLETED, HOLD, DROP, FAILED)
- priority (LOW, MEDIUM, HIGH, URGENT)
- scheduledAt (anniversaryId + offsetDays + offsetType로 자동 계산), dueAt
- deletedAt (Soft Delete)
- participants (TaskParticipant 관계)

### TaskParticipants
- taskId, userId
- createdAt
- 그룹 멤버만 참여자로 지정 가능
- Task 삭제 시 Cascade 삭제

### Recurrings
- ruleType (DAILY, WEEKLY, MONTHLY, YEARLY)
- ruleConfig (JSON): 반복 규칙 상세 설정
  - `interval`: 반복 간격 (1 = 매번, 2 = 격주/격월 등)
  - `endType`: 종료 조건 (NEVER, DATE, COUNT)
  - `endDate`: 종료 날짜 (endType이 DATE인 경우)
  - `count`: 반복 횟수 (endType이 COUNT인 경우)
  - `generatedCount`: 현재까지 생성된 횟수 (내부 추적용)
  - `daysOfWeek`: 요일 목록 (WEEKLY, 0=일~6=토)
  - `monthlyType`: MONTHLY 반복 타입 (dayOfMonth/weekOfMonth)
  - `dayOfMonth`: 날짜 (1-31)
  - `weekOfMonth`: 주차 (1-5, 5는 마지막 주)
  - `dayOfWeek`: 요일 (0-6)
  - `month`: 월 (1-12, YEARLY)
- generationType (AUTO_SCHEDULER, AFTER_COMPLETION)
- lastGeneratedAt, isActive

### TaskReminders
- taskId, userId
- reminderType (BEFORE_START, BEFORE_DUE)
- offsetMinutes, sentAt

### TaskSkips
- recurringId, skipDate, reason, createdBy

### TaskHistories
- taskId, userId
- action (CREATE, UPDATE, DELETE, COMPLETE, SKIP)
- changes (JSON, before/after)

### Anniversaries
- groupId
- title, date (DATE), emoji
- isActive
- tasks (연동된 Task 목록, SetNull on delete)

---

## 구현 상태

### ✅ 완료
- [x] 데이터베이스 스키마 (6개 Enum + 7개 테이블)
- [x] 카테고리 CRUD (개인/그룹 카테고리)
- [x] Task CRUD (생성, 조회, 수정, 삭제)
- [x] Task 타입 구분 (CALENDAR_ONLY, TODO_LINKED, TODO_ONLY)
- [x] 이중 날짜 관리 (scheduledAt, dueAt)
- [x] D-Day 계산 (daysUntilDue)
- [x] 우선순위 설정 (LOW, MEDIUM, HIGH, URGENT)
- [x] 상태 변경 (PENDING / IN_PROGRESS / COMPLETED / HOLD / DROP / FAILED)
- [x] 캘린더 뷰 vs 할일 뷰 필터링
- [x] 그룹/카테고리/타입/우선순위 필터
- [x] 날짜 범위 필터
- [x] 정렬 (캘린더: scheduledAt ASC, 할일: 완료여부/우선순위/마감일)
- [x] 반복 일정 일시정지/재개
- [x] 반복 일정 건너뛰기
- [x] 알림 시스템 연동 (그룹 Task 생성/건너뛰기 시)
- [x] 변경 이력 추적 (TaskHistory)
- [x] Soft Delete (deletedAt)
- [x] 스케줄러 (매일 0시 자동 실행)
- [x] 공휴일 조회 (`GET /tasks/holidays`, year/month 파라미터)
- [x] 휴면 사용자 필터링
- [x] 참여자 기능 (그룹 Task에서 멤버 지정)
- [x] 참여자 지정/변경 시 알림 발송
- [x] 반복 일정 자동 생성 로직 (`generateRecurringTasks`)
- [x] AFTER_COMPLETION 타입 (Task 완료 시 다음 Task 자동 생성)
- [x] 반복 간격 설정 (격주, 3주마다 등)
- [x] 반복 종료 조건 (계속 반복, 날짜 지정, 횟수 지정)
- [x] 기념일 CRUD (그룹 단위, 경과일 자동 계산)
- [x] 기념일 연동 Task (offsetDays/offsetType → scheduledAt 자동 계산)
- [x] 기념일 날짜 변경 시 연동 Task scheduledAt 일괄 재계산
- [x] 기념일 삭제 시 연동 Task anniversaryId SetNull 처리

### ⬜ TODO / 향후 고려
- [ ] 단위 테스트
- [ ] E2E 테스트
- [ ] Task 첨부파일
- [ ] Task 댓글 기능
- [ ] Task 체크리스트 (서브 Task)
- [ ] Task 통계 (완료율, 카테고리별 통계)
- [ ] Task 검색 기능
- [ ] Task 템플릿
- [ ] 알림 전송 로직 최적화

---

## API 엔드포인트

| Method | Endpoint                           | 설명                    | Guard |
| ------ | ---------------------------------- | ----------------------- | ----- |
| GET    | `/tasks/holidays`                  | 공휴일 목록 조회        | JWT   |
| GET    | `/tasks/categories`                | 카테고리 목록 조회      | JWT   |
| POST   | `/tasks/categories`                | 카테고리 생성           | JWT   |
| PUT    | `/tasks/categories/:id`            | 카테고리 수정           | JWT   |
| DELETE | `/tasks/categories/:id`            | 카테고리 삭제           | JWT   |
| GET    | `/tasks`                           | Task 목록 조회          | JWT   |
| GET    | `/tasks/:id`                       | Task 상세 조회          | JWT   |
| POST   | `/tasks`                           | Task 생성               | JWT   |
| PUT    | `/tasks/:id`                       | Task 수정               | JWT   |
| PATCH  | `/tasks/:id/status`                | Task 상태 변경          | JWT   |
| DELETE | `/tasks/:id`                       | Task 삭제               | JWT   |
| PATCH  | `/tasks/recurrings/:id/pause`      | 반복 일정 일시정지/재개 | JWT   |
| POST   | `/tasks/recurrings/:id/skip`       | 반복 일정 건너뛰기      | JWT   |
| GET    | `/tasks/anniversaries`             | 기념일 목록 조회        | JWT   |
| GET    | `/tasks/anniversaries/:id`         | 기념일 단건 조회        | JWT   |
| POST   | `/tasks/anniversaries`             | 기념일 생성             | JWT   |
| PUT    | `/tasks/anniversaries/:id`         | 기념일 수정             | JWT   |
| DELETE | `/tasks/anniversaries/:id`         | 기념일 삭제             | JWT   |

### 공휴일 쿼리 파라미터
| 파라미터 | 필수 | 설명              |
| -------- | ---- | ----------------- |
| `year`   | ✅   | 연도 (2000~2100)  |
| `month`  | ✅   | 월 (1~12)         |

### 기념일 목록 쿼리 파라미터
| 파라미터  | 필수 | 설명      |
| --------- | ---- | --------- |
| `groupId` | ✅   | 그룹 ID   |

### Task 기념일 연동 필드 (생성/수정 시)
| 필드          | 설명                                                        |
| ------------- | ----------------------------------------------------------- |
| `anniversaryId` | 연동할 기념일 ID (null 전달 시 연동 해제)                 |
| `offsetDays`  | 기념일로부터 오프셋 값 (offsetType에 따라 일 또는 연 단위) |
| `offsetType`  | `DAYS` (일 기준) 또는 `YEARS` (연 기준)                    |

- 세 필드 모두 전달 시 `scheduledAt`이 자동 계산됩니다
- 예: `anniversaryId=X, offsetDays=100, offsetType=DAYS` → 기념일 + 100일째 날
- 예: `anniversaryId=X, offsetDays=1, offsetType=YEARS` → 기념일 1주년

---

## 구현 파일

```
src/task/
  dto/
    create-category.dto.ts
    update-category.dto.ts
    category-response.dto.ts
    create-task.dto.ts
    update-task.dto.ts
    query-tasks.dto.ts
    complete-task.dto.ts
    skip-recurring.dto.ts
    participant-response.dto.ts
    task-response.dto.ts
    holiday-query.dto.ts
    holiday-response.dto.ts
    common-response.dto.ts
    create-anniversary.dto.ts
    update-anniversary.dto.ts
    anniversary-response.dto.ts
    index.ts
  enums/
    task-type.enum.ts
    task-status.enum.ts              — PENDING / IN_PROGRESS / COMPLETED / HOLD / DROP / FAILED
    task-priority.enum.ts
    task-reminder-type.enum.ts
    task-history-action.enum.ts
    recurring-rule-type.enum.ts
    recurring-generation-type.enum.ts
    anniversary-offset-type.enum.ts  — DAYS / YEARS
    index.ts
  interfaces/
    recurring-rule-config.interface.ts
    index.ts
  builders/
    task-query.builder.ts
    index.ts
  events/
    task.events.ts
    index.ts
  listeners/
    task-history.listener.ts
    task-notification.listener.ts
    index.ts
  task.controller.ts
  task.service.ts
  category.service.ts
  recurring.service.ts
  holiday.service.ts
  anniversary.service.ts
  task-scheduler.service.ts
  recurring-date.util.ts
  task.module.ts
```

**Last Updated**: 2026-06-20
