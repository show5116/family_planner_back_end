# 07. ToDoList 관리 (ToDo Management)

> **상태**: ⬜ 시작 안함
> **우선순위**: Medium
> **담당 Phase**: Phase 4

---

## 📋 개요

개인 및 그룹의 할 일을 관리하고 칸반 보드 형식으로 상태를 추적하는 시스템입니다.

---

## ⬜ ToDo 등록

### ToDo 정보
- 할 일 내용
- 완료 예정일
- 우선순위 (높음/보통/낮음)
- 설명/메모
- 태그

---

## ⬜ 공유 설정

### 공유 대상
- 본인만 보기
- 그룹 전체 공유
- 특정 멤버 선택 공유

### 담당자 설정
- 담당자 지정
- 여러 명 담당 가능

---

## ⬜ Kanban Board

### 상태 관리
- **등록** (Backlog): 새로 등록된 할 일
- **진행 중** (In Progress): 작업 중인 할 일
- **완료** (Done): 완료된 할 일
- **보류** (Hold): 일시 중단된 할 일
- **Drop**: 취소된 할 일

### 드래그 앤 드롭
- 상태 간 이동
- 우선순위 변경

---

## 🗄️ 데이터베이스 스키마 (예상)

```prisma
model Todo {
  id          String        @id @default(uuid())
  groupId     String?
  userId      String
  title       String
  description String?
  dueDate     DateTime?
  priority    TodoPriority  @default(MEDIUM)
  status      TodoStatus    @default(BACKLOG)
  order       Int           @default(0)
  visibility  TodoVisibility @default(PRIVATE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  group       Group?        @relation(fields: [groupId], references: [id])
  user        User          @relation(fields: [userId], references: [id])
  assignees   TodoAssignee[]
  tags        TodoTag[]
}

enum TodoPriority {
  HIGH
  MEDIUM
  LOW
}

enum TodoStatus {
  BACKLOG
  IN_PROGRESS
  DONE
  HOLD
  DROP
}

enum TodoVisibility {
  PRIVATE
  GROUP
  SELECTED
}

model TodoAssignee {
  id      String @id @default(uuid())
  todoId  String
  userId  String

  todo    Todo   @relation(fields: [todoId], references: [id])
  user    User   @relation(fields: [userId], references: [id])

  @@unique([todoId, userId])
}

model TodoTag {
  id      String @id @default(uuid())
  todoId  String
  name    String
  color   String?

  todo    Todo   @relation(fields: [todoId], references: [id])
}
```

---

## 📝 API 엔드포인트 (예상)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/todos` | ToDo 생성 | JWT |
| GET | `/todos` | ToDo 목록 | JWT |
| GET | `/todos/:id` | ToDo 상세 | JWT |
| PATCH | `/todos/:id` | ToDo 수정 | JWT, Owner or Assignee |
| DELETE | `/todos/:id` | ToDo 삭제 | JWT, Owner |
| PATCH | `/todos/:id/status` | 상태 변경 | JWT, Owner or Assignee |
| PATCH | `/todos/:id/order` | 순서 변경 | JWT, Owner or Assignee |
| POST | `/todos/:id/assignees` | 담당자 추가 | JWT, Owner |
| DELETE | `/todos/:id/assignees/:userId` | 담당자 제거 | JWT, Owner |
| POST | `/todos/:id/tags` | 태그 추가 | JWT, Owner |

---

**Last Updated**: 2025-12-04
