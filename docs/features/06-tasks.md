# 06. 일정 및 할일 통합 관리 (Tasks Management)

> **상태**: 🟨 진행 중 (핵심 기능 완료, 반복 일정 로직 TODO)
> **Phase**: Phase 3

---

## 개요

일정(캘린더)과 할일(TODO)을 하나의 통합 시스템으로 관리합니다. 반복 일정, 알림, 카테고리 관리, 변경 이력 추적 기능을 제공합니다.

---

## 핵심 개념

- **하나의 Tasks 테이블**로 일정과 할일 통합 관리
- **Type 구분**: CALENDAR_ONLY (캘린더 전용) vs TODO_LINKED (할일 연동)
- **이중 날짜 관리**:
  - `scheduled_at`: 수행 시작 날짜 (할일 목록 표시 시작)
  - `due_at`: 마감 날짜 (D-Day 계산 기준)
- **반복 일정**: 스케줄러 자동 생성 (매일 0시, 미래 3개월 분량)
- **알림 시스템**: 시작 전/마감 전 알림
- **변경 이력**: 모든 변경사항 자동 기록

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
- 그룹, 카테고리, 타입, 우선순위, 완료 여부, 날짜 범위 필터링
- D-Day 계산 (`daysUntilDue`)
- 정렬: 캘린더(scheduledAt ASC), 할일(isCompleted ASC → priority DESC → dueAt ASC)

### 상세 조회 (`GET /tasks/:id`)
- 알림 목록 + 변경 이력 포함
- 그룹 Task는 그룹 멤버만 조회 가능

### 생성 (`POST /tasks`)
- 제목, 타입, 카테고리 필수
- 반복 일정 설정 가능 (`recurring` 객체)
- 알림 설정 가능 (`reminders` 배열)
- TaskHistory 자동 생성 (action=CREATE)
- 그룹 Task 생성 시 멤버에게 알림

### 수정 (`PUT /tasks/:id`)
- 본인 Task만 수정
- 반복 Task인 경우 `updateScope` 필수:
  - `current`: 현재 Task만
  - `future`: 현재 + 미래 모든 반복 Task
- TaskHistory 자동 생성 (action=UPDATE)

### 완료/미완료 (`PATCH /tasks/:id/complete`)
- `isCompleted` true 설정 시 `completedAt` 기록
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
- title, description, location
- type (CALENDAR_ONLY, TODO_LINKED)
- priority (LOW, MEDIUM, HIGH, URGENT)
- scheduledAt, dueAt
- isCompleted, completedAt
- deletedAt (Soft Delete)

### Recurrings
- ruleType (DAILY, WEEKLY, MONTHLY, YEARLY)
- ruleConfig (요일, 날짜 등 JSON)
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

---

## 구현 상태

### ✅ 완료
- [x] 데이터베이스 스키마 (6개 Enum + 6개 테이블)
- [x] 카테고리 CRUD (개인/그룹 카테고리)
- [x] Task CRUD (생성, 조회, 수정, 삭제)
- [x] Task 타입 구분 (CALENDAR_ONLY, TODO_LINKED)
- [x] 이중 날짜 관리 (scheduledAt, dueAt)
- [x] D-Day 계산 (daysUntilDue)
- [x] 우선순위 설정 (LOW, MEDIUM, HIGH, URGENT)
- [x] 완료/미완료 처리
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
- [x] 휴면 사용자 필터링

### 🟨 진행 중
- [ ] 반복 일정 자동 생성 로직 (`generateRecurringTasks`)
- [ ] AFTER_COMPLETION 타입 (Task 완료 시 다음 Task 자동 생성)

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

## 구현 완료 요약 (2025-12-30)

- 데이터베이스: 6개 Enum + 6개 테이블 설계 및 마이그레이션
- 카테고리 관리: 개인/그룹 카테고리 CRUD
- Task 관리: 캘린더/할일 뷰, D-Day 계산, 권한 관리, 변경 이력
- 반복 일정: 일시정지, 건너뛰기
- 스케줄러: 매일 0시 자동 실행, 휴면 사용자 필터링
- 알림 연동: 그룹 Task 생성/건너뛰기 시 자동 알림

### TODO
- `TaskService.generateRecurringTasks()`: 반복 날짜 계산 로직
- AFTER_COMPLETION 타입: Task 완료 시 다음 Task 자동 생성
- 단위 테스트 및 E2E 테스트

---

**작성일**: 2025-12-29
**구현 완료**: 2025-12-30
