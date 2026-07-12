# 20. 루틴 관리 (Routine Management)

> **상태**: ✅ 완료 (1차)
> **Phase**: Phase 6

---

## 개요

습관(루틴)을 등록하고 매일 체크하며, 스트릭·달성률·달력 히트맵으로 관리하는 시스템입니다. 기존 Task의 반복 일정(`Recurring`, 스케줄러 기반 인스턴스 생성) 방식과는 완전히 독립된 모듈로, 체크 로그만 저장하고 통계는 조회 시점에 실시간 계산합니다. 개인 루틴을 그룹에 공유하면 그룹원끼리 달성 현황을 서로 확인할 수 있습니다.

---

## 핵심 개념

- **루틴 1개 = 습관 1개**: Task처럼 하위 체크리스트 항목을 두지 않는 심플한 구조.
- **반복 주기**: 1차는 `WEEKLY_COUNT`(주 N회, 요일 무관)만 지원. `frequencyType`/`targetDays` 필드로 향후 `DAILY`, `DAYS_OF_WEEK` 확장 여지를 마련해 둠.
- **스케줄러 없음**: 매일 인스턴스를 미리 생성하지 않고, 체크한 날짜만 `RoutineLog`에 기록. 스트릭/달성률은 조회 시점에 실시간 계산.
- **주 계산 기준**: 월요일 시작 ISO 주. 미래 날짜 체크는 차단.
- **그룹 공유(N:M)**: 하나의 루틴을 여러 그룹에 동시 공유 가능. 공유된 그룹의 멤버는 서로의 루틴과 달성 현황을 조회 가능(수정 권한 공유는 없음, 체크는 본인만).
- **삭제 정책**: 루틴 soft delete 시 `RoutineLog`는 보존(통계/이력 보존 목적).

---

## 주요 기능

### 루틴 등록/관리
- 제목, 이모지, 색상, 반복 타입(`frequencyType`), 주 목표 횟수(`targetCount`), 시작일/종료일
- 목록 조회 시 정렬 순서(`sortOrder`) 및 오늘 체크 여부(`checkedToday`) 포함
- 순서 일괄 변경 (`PATCH /routines/sort-order`)

### 체크/체크취소
- 날짜 미지정 시 오늘 기준으로 체크 (`POST /routines/:id/check`)
- 하루 1건만 허용 (중복 체크 시 409), 미래 날짜 체크 시 400
- 체크 취소는 하드 삭제 (`DELETE /routines/:id/check`)

### 그룹 공유
- 루틴 소유자가 자신이 속한 그룹에 공유 추가/해제 (`RoutineShare`, N:M)
- 공유된 그룹의 멤버는 그룹원별 루틴 목록과 오늘/이번 주 진행 상황을 조회 가능
- 향후 랭킹/경쟁 기능은 `RoutineLog` + `RoutineShare` 조인만으로 스키마 변경 없이 확장 가능하도록 설계

### 통계
- **달력 히트맵**: 기간 내 체크된 날짜 목록 (최대 1년)
- **스트릭**: 주 단위(목표 달성 연속 주 수) + 일 단위(연속 체크일) 병행 제공, 이번 주 진행 상황 포함
- **기간별 달성률**: `week`/`month`/`custom` 기준, 기간과 겹치는 주(월~일) 단위로 기대 체크 횟수(주당 targetCount) 대비 실제 체크 횟수(%) 계산. 진행 중인 주(이번 주 등)도 포함해 부분 기간 조회에도 값이 나옴
- **대시보드 요약**: 전체 활성 루틴의 오늘 체크 여부 + 현재 스트릭 + 이번 주 진행 상황을 한 번에 조회 (위젯용)

---

## 데이터베이스

```prisma
model Routine {
  id            String               @id @default(uuid())
  userId        String
  title         String               @db.VarChar(100)
  emoji         String?              @db.VarChar(10)
  color         String?              @db.VarChar(7)
  frequencyType RoutineFrequencyType @default(WEEKLY_COUNT)
  targetCount   Int?                 // WEEKLY_COUNT: 주 N회 목표
  targetDays    Json?                // DAYS_OF_WEEK 확장용 (1차 미사용)
  startDate     DateTime             @db.Date
  endDate       DateTime?            @db.Date
  isActive      Boolean              @default(true)
  sortOrder     Int                  @default(0)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  deletedAt     DateTime?

  user   User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs   RoutineLog[]
  shares RoutineShare[]

  @@index([userId, isActive])
  @@index([userId, sortOrder])
  @@index([deletedAt])
  @@map("routines")
}

model RoutineLog {
  id          String   @id @default(uuid())
  routineId   String
  userId      String              // 비정규화: 그룹 조회 시 join 최소화
  checkedDate DateTime @db.Date   // 하루 1건
  note        String?  @db.VarChar(200)
  createdAt   DateTime @default(now())

  routine Routine @relation(fields: [routineId], references: [id], onDelete: Cascade)

  @@unique([routineId, checkedDate])
  @@index([routineId, checkedDate])
  @@index([userId, checkedDate])
  @@map("routine_logs")
}

// 루틴 ↔ 그룹 공유 (N:M)
model RoutineShare {
  id        String   @id @default(uuid())
  routineId String
  groupId   String
  createdAt DateTime @default(now())

  routine Routine @relation(fields: [routineId], references: [id], onDelete: Cascade)
  group   Group   @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([routineId, groupId])
  @@index([groupId])
  @@map("routine_shares")
}

enum RoutineFrequencyType {
  WEEKLY_COUNT   // 주 N회, 요일 무관 (1차 구현 대상)
  DAILY          // 매일 (향후)
  DAYS_OF_WEEK   // 특정 요일 지정 (향후, targetDays 사용)
}
```

---

## 구현 상태

### ✅ 완료
- [x] 루틴 CRUD (생성, 목록, 상세, 수정, 삭제)
- [x] 순서 일괄 변경
- [x] 체크/체크취소 (하루 1건, 미래 날짜 차단)
- [x] 그룹 공유 추가/해제/목록 조회 (N:M)
- [x] 그룹원 루틴 조회 (멤버별 목록, 특정 멤버 상세)
- [x] 통계: 달력 히트맵
- [x] 통계: 스트릭 (주 단위 + 일 단위 병행)
- [x] 통계: 기간별 달성률 (week/month/custom)
- [x] 대시보드 위젯용 요약 API

### ⬜ 향후 고려
- [ ] `DAILY`, `DAYS_OF_WEEK` 반복 타입 지원
- [ ] 그룹 내 랭킹/경쟁(리더보드) API
- [ ] 이번 주 마감 임박 알림 (스케줄러 기반, 1차 구현 범위 아님)

---

## API 엔드포인트

### 루틴 기본

| Method | Endpoint               | 설명                          | 권한       |
| ------ | ---------------------- | ----------------------------- | ---------- |
| POST   | `/routines`             | 루틴 생성                     | JWT        |
| GET    | `/routines`             | 내 루틴 목록                  | JWT        |
| GET    | `/routines/:id`         | 루틴 상세 (본인 또는 공유 그룹원) | JWT     |
| PATCH  | `/routines/:id`         | 루틴 수정                     | JWT, Owner |
| DELETE | `/routines/:id`         | 루틴 삭제 (soft delete)       | JWT, Owner |
| PATCH  | `/routines/sort-order`  | 순서 일괄 변경                | JWT        |

### 체크

| Method | Endpoint                       | 설명                             | 권한       |
| ------ | ------------------------------- | -------------------------------- | ---------- |
| POST   | `/routines/:id/check`           | 체크 (date 미지정 시 오늘)       | JWT, Owner |
| DELETE | `/routines/:id/check?date=`     | 체크 취소 (date 미지정 시 오늘)  | JWT, Owner |

### 그룹 공유

| Method | Endpoint                                | 설명                       | 권한       |
| ------ | ---------------------------------------- | -------------------------- | ---------- |
| POST   | `/routines/:id/shares`                   | 그룹에 공유 추가           | JWT, Owner |
| DELETE | `/routines/:id/shares/:groupId`          | 그룹 공유 해제             | JWT, Owner |
| GET    | `/routines/:id/shares`                   | 공유된 그룹 목록           | JWT, Owner |
| GET    | `/routines/groups/:groupId/members`      | 그룹원별 공유 루틴 + 현황  | JWT, Member |
| GET    | `/routines/groups/:groupId/members/:userId` | 특정 그룹원 공유 루틴 상세 | JWT, Member |

### 통계

| Method | Endpoint                             | 설명                              | 권한        |
| ------ | -------------------------------------- | --------------------------------- | ----------- |
| GET    | `/routines/:id/stats/heatmap?from=&to=` | 날짜별 달성 여부 (최대 1년)       | JWT, Access |
| GET    | `/routines/:id/stats/streak`           | 현재/최장 스트릭 (주/일 단위)     | JWT, Access |
| GET    | `/routines/:id/stats/rate?period=`     | 기간별 달성률                     | JWT, Access |
| GET    | `/routines/stats/summary`              | 대시보드 위젯용 전체 루틴 요약    | JWT         |

---

## 구현 파일

```
src/routine/
  dto/
    create-routine.dto.ts
    update-routine.dto.ts
    routine-query.dto.ts
    check-routine.dto.ts
    create-routine-share.dto.ts
    reorder-routine.dto.ts
    routine-stats-query.dto.ts       — HeatmapQueryDto, RateQueryDto
    routine-response.dto.ts          — RoutineDto, RoutineLogDto, RoutineShareDto, RoutineMemberSummaryDto
    routine-stats-response.dto.ts    — HeatmapResponseDto, StreakResponseDto, RateResponseDto, RoutineSummaryDto
  enums/
    index.ts                        — RoutineFrequencyType re-export
  utils/
    routine-stats.util.ts            — 주차 계산, 스트릭/달성률 순수 함수
  routine.controller.ts
  routine.service.ts                 — CRUD, 체크/체크취소, 공유 관리
  routine-stats.service.ts           — 히트맵/스트릭/달성률/요약
  routine.module.ts
```

**Last Updated**: 2026-07-10
