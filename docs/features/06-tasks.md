# 06. 일정 및 할일 통합 관리 (Tasks Management)

> **상태**: 🟨 진행 중 (핵심 기능 구현 완료, 반복 일정 로직 TODO)
> **우선순위**: Medium
> **담당 Phase**: Phase 3
> **구현 시작**: 2025-12-30
> **핵심 구현 완료**: 2025-12-30

---

## 📋 개요

일정(캘린더)과 할일(TODO)을 하나의 통합 시스템으로 관리합니다. Tasks 테이블 하나로 캘린더 전용 일정과 할일 연동 일정을 모두 처리하며, 반복 일정, 알림, 카테고리 관리 등의 기능을 제공합니다.

---

## 🎯 핵심 개념

### 통합 관리 구조

- **하나의 Tasks 테이블**로 일정과 할일을 통합 관리
- **Type 구분**: 캘린더 전용 vs 할일 연동
- **수행날짜 & 마감날짜** 이중 관리
  - `scheduled_at`: 수행 시작 날짜 (이 날짜부터 할일 목록에 표시)
  - `due_at`: 마감 날짜 (D-Day 표시, 지나면 음수로 표시)

### 주요 특징

1. **카테고리 시스템**
   - 사용자별/그룹별 카테고리 생성
   - 이모지 지원으로 시각적 구분
   - 카테고리별 색상 관리

2. **반복 일정 시스템**
   - 매일, 매주 특정 요일, 매달 특정 날짜 등 유연한 반복 규칙
   - 스케줄러를 통한 자동 생성 (매일 0시, 미래 3개월 분량)
   - 휴면 방지: 30일 이내 로그인 사용자만 대상
   - 건너뛰기, 일시정지 기능
   - 수정 시 "이번만" vs "미래 전체" 선택

3. **알림 시스템**
   - 시작 전 알림 (scheduled_at 기준)
   - 마감 전 알림 (due_at 기준)
   - NotificationService와 연동

4. **변경 이력 추적**
   - 모든 변경사항 기록
   - 누가, 언제, 무엇을 변경했는지 추적

---

## ✅ 카테고리 관리

### 카테고리 목록 조회 (`GET /tasks/categories`)

- ✅ JWT 인증
- ✅ 개인 카테고리 + 소속 그룹 카테고리 모두 조회
- ✅ 그룹 ID 필터링 지원 (groupId query param)

**Query Params**:
- `groupId`: 그룹 ID (optional, 지정 시 그룹 카테고리만 조회)

**관련 파일**:
- [src/task/task.controller.ts](../../src/task/task.controller.ts) ✅
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### 카테고리 생성 (`POST /tasks/categories`)

- ✅ JWT 인증
- ✅ 이름(필수), 설명, 이모지, 색상 코드 입력
- ✅ groupId 지정 시 그룹 카테고리로 생성
- ✅ 그룹 카테고리 생성 시 그룹 멤버 권한 확인

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### 카테고리 수정/삭제

- ✅ **수정** (`PUT /tasks/categories/:id`): 본인 작성 카테고리만 수정 가능
- ✅ **삭제** (`DELETE /tasks/categories/:id`): 연결된 Task가 있으면 삭제 불가 (안전성)

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

## ✅ Task 관리

### Task 목록 조회 (`GET /tasks`)

- ✅ JWT 인증
- ✅ 캘린더 뷰 vs 할일 뷰 구분 (view query param)
- ✅ 그룹, 카테고리, 타입, 우선순위, 완료 여부, 날짜 범위 필터링
- ✅ D-Day 계산 (daysUntilDue 필드)
- ✅ 카테고리 정보 포함 (이모지, 색상)
- ✅ 반복 정보 포함 (있는 경우)

**Query Params**:
- `groupId`: 그룹 ID (optional)
- `categoryId`: 카테고리 ID (optional)
- `type`: TaskType (optional)
- `priority`: TaskPriority (optional)
- `isCompleted`: boolean (optional)
- `startDate`: 시작 날짜 (optional, YYYY-MM-DD)
- `endDate`: 종료 날짜 (optional, YYYY-MM-DD)
- `view`: 'calendar' | 'todo' (default: 'calendar')

**정렬 규칙**:
- `view=calendar`: scheduledAt ASC
- `view=todo`: isCompleted ASC → priority DESC → dueAt ASC

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) (예정)

---

### Task 상세 조회 (`GET /tasks/:id`)

- ✅ JWT 인증
- ✅ Task 상세 정보 + 알림 목록 + 변경 이력
- ✅ 그룹 Task는 그룹 멤버만 조회 가능

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### Task 생성 (`POST /tasks`)

- ✅ JWT 인증
- ✅ 제목, 타입, 카테고리 필수 입력
- ✅ 우선순위 기본값: MEDIUM
- ✅ 반복 일정 설정 가능 (recurring 객체)
- ✅ 알림 설정 가능 (reminders 배열)
- ✅ TaskHistory 자동 생성 (action=CREATE)
- ✅ 그룹 Task 생성 시 그룹 멤버에게 알림

**부가 동작**:
- 반복 설정이 있으면 Recurring 레코드 생성
- 그룹 Task인 경우 그룹 멤버에게 알림 발송

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### Task 수정 (`PUT /tasks/:id`)

- ✅ 본인 작성 Task만 수정 가능
- ✅ 반복 Task인 경우 updateScope 필수
  - `current`: 현재 Task만 수정
  - `future`: 현재 + 미래의 모든 반복 Task 수정
- ✅ TaskHistory 자동 생성 (action=UPDATE, changes 기록)

**Query Params**:
- `updateScope`: 'current' | 'future' (반복 Task인 경우 필수)

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### Task 완료/미완료 (`PATCH /tasks/:id/complete`)

- ✅ JWT 인증
- ✅ isCompleted true 설정 시 completedAt 자동 기록
- ✅ TaskHistory 자동 생성 (action=COMPLETE)
- 🟨 반복 유형이 AFTER_COMPLETION인 경우 다음 Task 자동 생성 (TODO)

**부가 동작**:
- 완료 후 생성 타입 반복 일정은 다음 Task 자동 생성 (향후 구현 필요)

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### Task 삭제 (`DELETE /tasks/:id`)

- ✅ 본인 작성 Task만 삭제 가능
- ✅ Soft Delete (deletedAt 설정)
- ✅ 반복 Task인 경우 deleteScope 필수
  - `current`: 현재 Task만 삭제
  - `future`: 현재 + 미래의 모든 반복 Task 삭제
  - `all`: 과거 + 현재 + 미래 모든 반복 Task 삭제

**Query Params**:
- `deleteScope`: 'current' | 'future' | 'all' (반복 Task인 경우)

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

## 🟨 반복 일정 관리

### 반복 일정 일시정지/재개 (`PATCH /tasks/recurrings/:id/pause`)

- ✅ 본인 작성 반복 규칙만 변경 가능
- ✅ isActive 토글 (true ↔ false)
- ✅ 일시정지 시 스케줄러가 새 Task 생성하지 않음

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) ✅

---

### 반복 일정 건너뛰기 (`POST /tasks/recurrings/:id/skip`)

- ✅ 본인 작성 반복 규칙만 변경 가능
- ✅ 특정 날짜 건너뛰기 (skipDate)
- ✅ 건너뛰는 이유 기록 가능
- ✅ TaskSkip 레코드 생성
- ✅ 그룹 반복 일정인 경우 그룹 멤버에게 알림

**부가 동작**:
- 그룹 반복 일정인 경우 그룹 멤버에게 알림 발송

**관련 파일**:
- [src/task/task.service.ts](../../src/task/task.service.ts) (예정)

---

## 📦 데이터베이스 스키마

### Categories (카테고리)

| 컬럼        | 타입          | 설명                              | 제약조건     |
| ----------- | ------------- | --------------------------------- | ------------ |
| id          | String (UUID) | 기본 키                           | PK           |
| userId      | String        | 사용자 ID                         | FK, NOT NULL |
| groupId     | String        | 그룹 ID (그룹 카테고리인 경우)    | FK, Nullable |
| name        | String        | 카테고리 이름                     | NOT NULL     |
| description | String        | 설명                              | Nullable     |
| emoji       | String        | 이모지                            | Nullable     |
| color       | String        | 색상 코드 (hex)                   | Nullable     |
| createdAt   | DateTime      | 생성 시간                         | AUTO         |
| updatedAt   | DateTime      | 수정 시간                         | AUTO         |

**인덱스**: `userId, groupId` (사용자별/그룹별 조회)

**규칙**:
- `groupId`가 null이면 개인 카테고리, 값이 있으면 그룹 카테고리
- 그룹 카테고리는 해당 그룹 멤버 모두 사용 가능

---

### Tasks (일정/할일)

| 컬럼         | 타입          | 설명                                      | 제약조건      |
| ------------ | ------------- | ----------------------------------------- | ------------- |
| id           | String (UUID) | 기본 키                                   | PK            |
| userId       | String        | 작성자 ID                                 | FK, NOT NULL  |
| groupId      | String        | 그룹 ID (그룹 일정인 경우)                | FK, Nullable  |
| categoryId   | String        | 카테고리 ID                               | FK, NOT NULL  |
| recurringId  | String        | 반복 규칙 ID (반복 일정인 경우)           | FK, Nullable  |
| title        | String        | 제목                                      | NOT NULL      |
| description  | Text          | 상세 설명/메모                            | Nullable      |
| location     | String        | 장소                                      | Nullable      |
| type         | Enum          | 타입 (CALENDAR_ONLY, TODO_LINKED)         | NOT NULL      |
| priority     | Enum          | 중요도 (LOW, MEDIUM, HIGH, URGENT)        | DEFAULT MEDIUM|
| scheduledAt  | DateTime      | 수행 시작 날짜 (할일 표시 시작 시점)      | Nullable      |
| dueAt        | DateTime      | 마감 날짜 (D-Day 계산 기준)               | Nullable      |
| isCompleted  | Boolean       | 완료 여부                                 | DEFAULT false |
| completedAt  | DateTime      | 완료 시간                                 | Nullable      |
| createdAt    | DateTime      | 생성 시간                                 | AUTO          |
| updatedAt    | DateTime      | 수정 시간                                 | AUTO          |
| deletedAt    | DateTime      | 삭제 시간 (Soft Delete)                   | Nullable      |

**인덱스**:
- `userId, scheduledAt` (개인 일정 조회)
- `groupId, scheduledAt` (그룹 일정 조회)
- `categoryId` (카테고리별 필터)
- `recurringId` (반복 그룹 조회)

---

### Recurrings (반복 규칙)

| 컬럼            | 타입          | 설명                                            | 제약조건     |
| --------------- | ------------- | ----------------------------------------------- | ------------ |
| id              | String (UUID) | 기본 키                                         | PK           |
| userId          | String        | 작성자 ID                                       | FK, NOT NULL |
| groupId         | String        | 그룹 ID                                         | FK, Nullable |
| ruleType        | Enum          | 반복 유형 (DAILY, WEEKLY, MONTHLY, YEARLY)      | NOT NULL     |
| ruleConfig      | Json          | 반복 설정 (요일, 날짜 등)                       | NOT NULL     |
| generationType  | Enum          | 생성 방식 (AUTO_SCHEDULER, AFTER_COMPLETION)    | NOT NULL     |
| lastGeneratedAt | DateTime      | 마지막 생성 시간                                | Nullable     |
| isActive        | Boolean       | 활성화 여부 (일시정지)                          | DEFAULT true |
| createdAt       | DateTime      | 생성 시간                                       | AUTO         |
| updatedAt       | DateTime      | 수정 시간                                       | AUTO         |

**ruleConfig 예시**:
```json
// 매주 월, 수, 금
{
  "daysOfWeek": [1, 3, 5]
}

// 매달 10일, 20일
{
  "daysOfMonth": [10, 20]
}

// 매년 1월 1일
{
  "month": 1,
  "day": 1
}
```

**generationType**:
- `AUTO_SCHEDULER`: 스케줄러가 자동으로 미래 3개월 분량 생성
- `AFTER_COMPLETION`: 이전 Task 완료 후 다음 Task 생성

---

### TaskReminders (알림)

| 컬럼          | 타입          | 설명                                   | 제약조건     |
| ------------- | ------------- | -------------------------------------- | ------------ |
| id            | String (UUID) | 기본 키                                | PK           |
| taskId        | String        | Task ID                                | FK, NOT NULL |
| userId        | String        | 알림 받을 사용자 ID                    | FK, NOT NULL |
| reminderType  | Enum          | 알림 유형 (BEFORE_START, BEFORE_DUE)   | NOT NULL     |
| offsetMinutes | Int           | 알림 시간 오프셋 (분 단위, 음수 가능)  | NOT NULL     |
| sentAt        | DateTime      | 발송 시간                              | Nullable     |
| createdAt     | DateTime      | 생성 시간                              | AUTO         |

**예시**:
- 시작 1시간 전: `reminderType=BEFORE_START, offsetMinutes=-60`
- 마감 30분 전: `reminderType=BEFORE_DUE, offsetMinutes=-30`

---

### TaskSkips (반복 건너뛰기)

| 컬럼        | 타입          | 설명                     | 제약조건      |
| ----------- | ------------- | ------------------------ | ------------ |
| id          | String (UUID) | 기본 키                  | PK           |
| recurringId | String        | 반복 규칙 ID             | FK, NOT NULL |
| skipDate    | DateTime      | 건너뛸 날짜              | NOT NULL     |
| reason      | String        | 건너뛰는 이유            | Nullable     |
| createdBy   | String        | 건너뛰기 설정한 사용자 ID| FK, NOT NULL |
| createdAt   | DateTime      | 생성 시간                | AUTO         |

---

### TaskHistories (변경 이력)

| 컬럼        | 타입          | 설명                        | 제약조건     |
| ----------- | ------------- | --------------------------- | ------------ |
| id          | String (UUID) | 기본 키                     | PK           |
| taskId      | String        | Task ID                     | FK, NOT NULL |
| userId      | String        | 변경한 사용자 ID            | FK, NOT NULL |
| action      | Enum          | 변경 유형 (CREATE, UPDATE, DELETE, COMPLETE, SKIP) | NOT NULL |
| changes     | Json          | 변경 내용 (before/after)    | Nullable     |
| createdAt   | DateTime      | 변경 시간                   | AUTO         |

**changes 예시**:
```json
{
  "before": {
    "title": "회의",
    "priority": "MEDIUM"
  },
  "after": {
    "title": "중요 회의",
    "priority": "HIGH"
  }
}
```

---

## 📊 Enum 정의

### TaskType

```typescript
export enum TaskType {
  CALENDAR_ONLY = 'CALENDAR_ONLY', // 캘린더 전용 (생일, 기념일 등)
  TODO_LINKED = 'TODO_LINKED', // 할일 연동 (완료 체크 가능)
}
```

### TaskPriority

```typescript
export enum TaskPriority {
  LOW = 'LOW', // 낮음
  MEDIUM = 'MEDIUM', // 보통
  HIGH = 'HIGH', // 높음
  URGENT = 'URGENT', // 긴급
}
```

### RecurringRuleType

```typescript
export enum RecurringRuleType {
  DAILY = 'DAILY', // 매일
  WEEKLY = 'WEEKLY', // 매주
  MONTHLY = 'MONTHLY', // 매달
  YEARLY = 'YEARLY', // 매년
}
```

### RecurringGenerationType

```typescript
export enum RecurringGenerationType {
  AUTO_SCHEDULER = 'AUTO_SCHEDULER', // 스케줄러 자동 생성
  AFTER_COMPLETION = 'AFTER_COMPLETION', // 완료 후 생성
}
```

### TaskReminderType

```typescript
export enum TaskReminderType {
  BEFORE_START = 'BEFORE_START', // 시작 전
  BEFORE_DUE = 'BEFORE_DUE', // 마감 전
}
```

### TaskHistoryAction

```typescript
export enum TaskHistoryAction {
  CREATE = 'CREATE', // 생성
  UPDATE = 'UPDATE', // 수정
  DELETE = 'DELETE', // 삭제
  COMPLETE = 'COMPLETE', // 완료
  SKIP = 'SKIP', // 건너뛰기
}
```

---

## 🔐 권한 정의

### 필요한 Permission 추가

| PermissionCode   | 설명                 | 기본 역할 |
| ---------------- | -------------------- | --------- |
| READ_TASK        | Task 조회            | 모든 멤버 |
| CREATE_TASK      | Task 작성            | 모든 멤버 |
| UPDATE_TASK      | Task 수정            | 작성자    |
| DELETE_TASK      | Task 삭제            | 작성자    |
| MANAGE_CATEGORY  | 카테고리 관리        | 모든 멤버 |

---

## 🛠️ 핵심 비즈니스 로직

### D-Day 계산

```typescript
function calculateDaysUntilDue(dueAt: Date | null): number | null {
  if (!dueAt) return null;

  const now = new Date();
  const due = new Date(dueAt);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays; // 양수: 남은 일수, 음수: 지난 일수
}
```

### 반복 일정 자동 생성 스케줄러

**TaskSchedulerService**:
- `@Cron('0 0 * * *')`: 매일 0시 실행
- 활성화된 AUTO_SCHEDULER 타입 반복 규칙 조회
- 휴면 방지: 30일 이내 로그인 사용자 확인
- 미래 3개월 분량 생성
- 건너뛰기 설정 확인 후 생성

**관련 파일**:
- [src/task/task-scheduler.service.ts](../../src/task/task-scheduler.service.ts) (예정)

---

## 🧪 테스트 시나리오

### 단위 테스트

- [ ] D-Day 계산 로직 (양수/음수/null)
- [ ] 반복 규칙 날짜 생성 (DAILY, WEEKLY, MONTHLY, YEARLY)
- [ ] 휴면 사용자 필터링
- [ ] 건너뛰기 날짜 제외 로직
- [ ] Task 완료 후 다음 Task 자동 생성 (AFTER_COMPLETION)
- [ ] 변경 이력 자동 기록

### E2E 테스트

- [ ] 캘린더 전용 일정 생성
- [ ] 할일 연동 일정 생성 + 완료 처리
- [ ] 반복 일정 생성 + 스케줄러 자동 생성 확인
- [ ] 반복 일정 건너뛰기 + 그룹 알림
- [ ] "이번만" vs "미래 전체" 수정

---

## 📝 API 엔드포인트

| Method | Endpoint                           | 설명                    | Guard |
| ------ | ---------------------------------- | ----------------------- | ----- |
| GET    | `/tasks/categories`                | 카테고리 목록 조회      | JWT   |
| POST   | `/tasks/categories`                | 카테고리 생성           | JWT   |
| PUT    | `/tasks/categories/:id`            | 카테고리 수정           | JWT   |
| DELETE | `/tasks/categories/:id`            | 카테고리 삭제           | JWT   |
| GET    | `/tasks`                           | Task 목록 조회          | JWT   |
| GET    | `/tasks/:id`                       | Task 상세 조회          | JWT   |
| POST   | `/tasks`                           | Task 생성               | JWT   |
| PUT    | `/tasks/:id`                       | Task 수정               | JWT   |
| PATCH  | `/tasks/:id/complete`              | Task 완료/미완료        | JWT   |
| DELETE | `/tasks/:id`                       | Task 삭제               | JWT   |
| PATCH  | `/tasks/recurrings/:id/pause`      | 반복 일정 일시정지/재개 | JWT   |
| POST   | `/tasks/recurrings/:id/skip`       | 반복 일정 건너뛰기      | JWT   |

---

## 🚀 향후 개선 사항

- [ ] 구글 캘린더 연동 (OAuth2)
- [ ] 위치 정보 자동완성 (Google Maps API / Naver Maps API)
- [ ] Task 템플릿 기능
- [ ] 서브 Task (체크리스트)
- [ ] Task 공유 시 권한 설정 (조회만 vs 수정 가능)
- [ ] Task 댓글 기능
- [ ] 월간/주간 통계 (완료율, 카테고리별 분포)

---

## 📝 구현 체크리스트

- [x] Prisma 스키마 작성 (Categories, Tasks, Recurrings, TaskReminders, TaskSkips, TaskHistories)
- [x] Enum 정의 (TaskType, TaskPriority, RecurringRuleType 등)
- [x] Permission 추가 (READ_TASK, CREATE_TASK 등)
- [x] TaskModule 생성
- [x] TaskService 구현
  - [x] 카테고리 CRUD
  - [x] Task CRUD
  - [x] D-Day 계산
  - [x] 완료 처리
  - [x] 반복 일정 관리 (일시정지, 건너뛰기)
  - [x] 건너뛰기 처리
  - [x] 변경 이력 자동 기록
  - [ ] 반복 일정 자동 생성 로직 (generateRecurringTasks - TODO)
- [x] TaskSchedulerService 구현 (스케줄러)
- [x] TaskController 구현
- [x] DTO 작성
- [x] Swagger 문서화
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성
- [x] 데이터베이스 마이그레이션

---

## 🎉 구현 완료 요약

### 완료된 핵심 기능 (2025-12-30)
1. **데이터베이스**: 6개 Enum + 6개 테이블 설계 및 마이그레이션 완료
2. **카테고리 관리**: 개인/그룹 카테고리 CRUD 완전 구현
3. **Task 관리**: 캘린더/할일 뷰, D-Day 계산, 권한 관리, 변경 이력 완전 구현
4. **반복 일정**: 일시정지, 건너뛰기 구현
5. **스케줄러**: 매일 0시 자동 실행, 휴면 사용자 필터링
6. **알림 연동**: 그룹 Task 생성/건너뛰기 시 자동 알림

### TODO (향후 구현 필요)
- `TaskService.generateRecurringTasks()`: 반복 날짜 계산 로직 (DAILY, WEEKLY, MONTHLY, YEARLY)
- AFTER_COMPLETION 타입: Task 완료 시 다음 Task 자동 생성
- 단위 테스트 및 E2E 테스트

### 생성된 파일 (23개)
- Prisma 스키마: 1개 (수정)
- Enum: 7개 (src/task/enums/*.ts)
- DTO: 11개 (src/task/dto/*.ts)
- Core: 4개 (task.module.ts, task.service.ts, task.controller.ts, task-scheduler.service.ts)

**자세한 구현 내역**: [TASK_PROGRESS.md](../../TASK_PROGRESS.md)

---

**작성일**: 2025-12-29
**구현 완료**: 2025-12-30
