# 06. 일정 관리 (Schedule Management)

> **상태**: ⬜ 시작 안함
> **우선순위**: Medium
> **담당 Phase**: Phase 4

---

## 📋 개요

개인 및 그룹 일정을 관리하고 공유하는 시스템입니다. 반복 일정, 알림 기능을 지원합니다.

---

## ⬜ 일정 등록

### 일정 정보

- 제목, 시작 시간, 종료 시간
- 장소
- 설명/메모
- 색상 태그

### 반복 일정

- 당일 일정
- 매일/매주/매월/매년 반복
- 특정 요일 반복 (예: 매주 월, 수, 금)

---

## ⬜ 공유 설정

### 공유 대상

- 본인만 보기 (Private)
- 그룹 전체 공유
- 특정 멤버 선택 공유

### 권한 설정

- 조회만 가능
- 수정 가능

---

## ⬜ 알람 기능

### 알림 시간 설정

- 당일 오전 (기상 시간)
- 1시간 전
- 30분 전
- 사용자 정의 시간

### 알림 방법

- 푸시 알림
- 이메일 알림

---

## 🗄️ 데이터베이스 스키마 (예상)

```prisma
model Schedule {
  id            String            @id @default(uuid())
  groupId       String?
  userId        String
  title         String
  description   String?
  location      String?
  startAt       DateTime
  endAt         DateTime?
  color         String?
  isRecurring   Boolean           @default(false)
  recurrenceRule String?
  visibility    ScheduleVisibility @default(PRIVATE)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  group         Group?            @relation(fields: [groupId], references: [id])
  user          User              @relation(fields: [userId], references: [id])
  participants  ScheduleParticipant[]
  reminders     ScheduleReminder[]
}

enum ScheduleVisibility {
  PRIVATE
  GROUP
  SELECTED
}

model ScheduleParticipant {
  id          String   @id @default(uuid())
  scheduleId  String
  userId      String
  canEdit     Boolean  @default(false)

  schedule    Schedule @relation(fields: [scheduleId], references: [id])
  user        User     @relation(fields: [userId], references: [id])

  @@unique([scheduleId, userId])
}

model ScheduleReminder {
  id          String   @id @default(uuid())
  scheduleId  String
  userId      String
  reminderAt  DateTime
  isSent      Boolean  @default(false)
  createdAt   DateTime @default(now())

  schedule    Schedule @relation(fields: [scheduleId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 📝 API 엔드포인트 (예상)

| Method | Endpoint                              | 설명        | 권한                  |
| ------ | ------------------------------------- | ----------- | --------------------- |
| POST   | `/schedules`                          | 일정 생성   | JWT                   |
| GET    | `/schedules`                          | 일정 목록   | JWT                   |
| GET    | `/schedules/:id`                      | 일정 상세   | JWT                   |
| PATCH  | `/schedules/:id`                      | 일정 수정   | JWT, Owner or CanEdit |
| DELETE | `/schedules/:id`                      | 일정 삭제   | JWT, Owner            |
| POST   | `/schedules/:id/participants`         | 참여자 추가 | JWT, Owner            |
| DELETE | `/schedules/:id/participants/:userId` | 참여자 제거 | JWT, Owner            |
| POST   | `/schedules/:id/reminders`            | 알림 설정   | JWT                   |

---

**Last Updated**: 2025-12-04
