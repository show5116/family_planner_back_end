# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 루틴

**Base Path:** `/routines`

### POST `routines`

**요약:** 루틴 생성

**Request Body:**

```json
{
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": "🧘", // 이모지 (string?)
  "color": "#6366F1", // 색상 (HEX) (string?)
  "frequencyType": null, // 반복 타입 (1차: WEEKLY_COUNT만 지원) (RoutineFrequencyType?)
  "targetCount": 3, // 주 목표 횟수 (frequencyType=WEEKLY_COUNT일 때 필수) (number?)
  "startDate": "2026-07-01", // 시작일 (YYYY-MM-DD) (string)
  "endDate": "", // 종료일 (YYYY-MM-DD, 없으면 무기한) (string?)
  "routineGroupId": "" // 소속시킬 루틴 그룹 ID (없으면 독립 습관) (string?)
}
```

**Responses:**

#### 201 - 루틴 생성 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "targetCount": null, // 주 목표 횟수 (number | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "isActive": false, // 활성 여부 (boolean)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 오늘 체크 여부 (boolean)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines`

**요약:** 내 루틴 목록 조회

**Query Parameters:**

- `isActive` (`boolean`) (Optional): 활성 루틴만 조회
- `routineGroupId` (`string`) (Optional): 특정 루틴 그룹 소속만 조회

**Responses:**

#### 200 - 루틴 목록 조회 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "targetCount": null, // 주 목표 횟수 (number | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "isActive": false, // 활성 여부 (boolean)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 오늘 체크 여부 (boolean)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines/stats/summary`

**요약:** 대시보드 위젯용 루틴 요약 (오늘 체크 현황 + 스트릭)

**Responses:**

#### 200 - 루틴 요약 조회 성공

```json
{
  "routines": [
    {
      "routineId": "", // 루틴 ID (string)
      "title": "", // 루틴 제목 (string)
      "emoji": null, // 이모지 (string | null)
      "checkedToday": false, // 오늘 체크 여부 (boolean)
      "currentStreakDays": 0, // 현재 연속 체크 일수 (number)
      "thisWeekProgress": {
        "checked": 0,
        "target": 0
      } // 이번 주 진행 상황 (ThisWeekProgressDto)
    }
  ] // 루틴별 오늘/스트릭 요약 (RoutineSummaryItemDto[])
}
```

---

### GET `routines/badges`

**요약:** 전체 배지 카탈로그 조회 (활성 배지만)

**Responses:**

#### 200 - 배지 카탈로그 조회 성공

```json
{
  "id": "", // 배지 ID (string)
  "code": "STREAK_DAYS_7", // 배지 코드 (string)
  "title": "7일 연속 달성", // 배지 제목 (string)
  "description": null, // 배지 설명 (string | null)
  "iconEmoji": null, // 아이콘 이모지 (string | null)
  "criteriaType": null, // 판정 기준 타입 (BadgeCriteriaType)
  "criteriaValue": 7 // 판정 기준값 (number)
}
```

---

### POST `routines/routine-groups`

**요약:** 루틴 그룹 생성 (여러 습관을 묶는 그룹)

**Request Body:**

```json
{
  "title": "아침 루틴", // 그룹 제목 (string)
  "emoji": "🌅", // 이모지 (string?)
  "color": "#6366F1" // 색상 (HEX) (string?)
}
```

**Responses:**

#### 201 - 루틴 그룹 생성 성공

```json
{
  "id": "", // 그룹 ID (string)
  "title": "아침 루틴", // 그룹 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "todayProgress": {
    "checked": 0, // 오늘 체크 완료 개수 (number)
    "total": 0 // 오늘 기준 활성 습관 총 개수 (number)
  }, // 오늘 진행 상황 (RoutineGroupProgressDto)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines/routine-groups`

**요약:** 내 루틴 그룹 목록 조회 (그룹별 오늘 진행률 포함)

**Responses:**

#### 200 - 루틴 그룹 목록 조회 성공

```json
{
  "id": "", // 그룹 ID (string)
  "title": "아침 루틴", // 그룹 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "todayProgress": {
    "checked": 0, // 오늘 체크 완료 개수 (number)
    "total": 0 // 오늘 기준 활성 습관 총 개수 (number)
  }, // 오늘 진행 상황 (RoutineGroupProgressDto)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### PATCH `routines/routine-groups/sort-order`

**요약:** 루틴 그룹 순서 일괄 변경

**Request Body:**

```json
{
  "items": [
    {
      "id": "", // 그룹 ID (string)
      "sortOrder": 0 // 정렬 순서 (number)
    }
  ] // 그룹 순서 목록 (RoutineGroupSortOrderItemDto[])
}
```

**Responses:**

#### 200 - 순서 변경 성공

```json
{
  "id": "", // 그룹 ID (string)
  "title": "아침 루틴", // 그룹 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "todayProgress": {
    "checked": 0, // 오늘 체크 완료 개수 (number)
    "total": 0 // 오늘 기준 활성 습관 총 개수 (number)
  }, // 오늘 진행 상황 (RoutineGroupProgressDto)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines/routine-groups/:id`

**요약:** 루틴 그룹 상세 조회 (소속 습관 목록 + 오늘 진행률)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 그룹 상세 조회 성공

```json
{
  "routines": [
    {
      "id": "uuid-1234", // 루틴 ID (string)
      "title": "아침 스트레칭", // 루틴 제목 (string)
      "emoji": null, // 이모지 (string | null)
      "color": null, // 색상 (string | null)
      "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
      "targetCount": null, // 주 목표 횟수 (number | null)
      "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
      "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
      "isActive": false, // 활성 여부 (boolean)
      "sortOrder": 0, // 정렬 순서 (number)
      "checkedToday": false, // 오늘 체크 여부 (boolean)
      "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ] // 소속 습관 목록 (RoutineDto[])
}
```

#### 404 - 루틴 그룹을 찾을 수 없습니다

#### 403 - 본인의 루틴 그룹만 조회할 수 있습니다

---

### PATCH `routines/routine-groups/:id`

**요약:** 루틴 그룹 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 루틴 그룹 수정 성공

```json
{
  "id": "", // 그룹 ID (string)
  "title": "아침 루틴", // 그룹 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "todayProgress": {
    "checked": 0, // 오늘 체크 완료 개수 (number)
    "total": 0 // 오늘 기준 활성 습관 총 개수 (number)
  }, // 오늘 진행 상황 (RoutineGroupProgressDto)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴 그룹을 찾을 수 없습니다

#### 403 - 본인의 루틴 그룹만 수정할 수 있습니다

---

### DELETE `routines/routine-groups/:id`

**요약:** 루틴 그룹 삭제 (soft delete, 소속 습관은 그룹 소속만 해제되고 유지)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 그룹 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 루틴 그룹을 찾을 수 없습니다

#### 403 - 본인의 루틴 그룹만 삭제할 수 있습니다

---

### GET `routines/me/badges`

**요약:** 내가 전체 루틴에서 획득한 통산 배지 목록 조회

**Responses:**

#### 200 - 내 배지 목록 조회 성공

```json
{
  "id": "", // 획득 기록 ID (string)
  "badgeId": "", // 배지 ID (string)
  "badge": {
    "id": "", // 배지 ID (string)
    "code": "STREAK_DAYS_7", // 배지 코드 (string)
    "title": "7일 연속 달성", // 배지 제목 (string)
    "description": null, // 배지 설명 (string | null)
    "iconEmoji": null, // 아이콘 이모지 (string | null)
    "criteriaType": null, // 판정 기준 타입 (BadgeCriteriaType)
    "criteriaValue": 7 // 판정 기준값 (number)
  }, // 배지 정보 (RoutineBadgeDto)
  "routineId": null, // 획득 기준이 된 루틴 ID (string | null)
  "routineTitle": null, // 획득 기준이 된 루틴 제목 (string | null)
  "earnedAt": "2025-01-01T00:00:00Z" // 획득 일시 (Date)
}
```

---

### GET `routines/groups/:groupId/members`

**요약:** 그룹에 공유된 멤버별 루틴 + 오늘/이번주 달성 현황 조회

**Path Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 그룹원 루틴 조회 성공

```json
{
  "userId": "", // 사용자 ID (string)
  "userName": "", // 사용자 이름 (string)
  "routines": [
    {
      "id": "uuid-1234", // 루틴 ID (string)
      "title": "아침 스트레칭", // 루틴 제목 (string)
      "emoji": null, // 이모지 (string | null)
      "color": null, // 색상 (string | null)
      "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
      "targetCount": null, // 주 목표 횟수 (number | null)
      "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
      "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
      "isActive": false, // 활성 여부 (boolean)
      "sortOrder": 0, // 정렬 순서 (number)
      "checkedToday": false, // 오늘 체크 여부 (boolean)
      "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ] // 공유된 루틴 목록 (RoutineDto[])
}
```

#### 403 - 그룹 멤버가 아닙니다

---

### GET `routines/groups/:groupId/leaderboard`

**요약:** 그룹 랭킹보드 (공유된 루틴 기준 체크 횟수/달성률 순위)

**Path Parameters:**

- `groupId` (`string`)

**Query Parameters:**

- `period` (`LeaderboardPeriod`): 집계 기간
- `metric` (`LeaderboardMetric`): 정렬 기준

**Responses:**

#### 200 - 랭킹보드 조회 성공

```json
{
  "groupId": "", // 그룹 ID (string)
  "period": "", // 집계 기간 (string)
  "metric": "", // 정렬 기준 (string)
  "rankings": [
    {
      "rank": 0, // 순위 (number)
      "userId": "", // 사용자 ID (string)
      "userName": "", // 사용자 이름 (string)
      "checkCount": 0, // 기간 내 체크 횟수 (number)
      "achievementRate": 0 // 기간 내 평균 달성률 (%) (number)
    }
  ] // 순위 목록 (LeaderboardEntryDto[])
}
```

#### 403 - 그룹 멤버가 아닙니다

---

### GET `routines/groups/:groupId/members/:userId`

**요약:** 특정 그룹원의 공유 루틴 상세 조회

**Path Parameters:**

- `groupId` (`string`)
- `userId` (`string`)

**Responses:**

#### 200 - 그룹원 루틴 상세 조회 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "targetCount": null, // 주 목표 횟수 (number | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "isActive": false, // 활성 여부 (boolean)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 오늘 체크 여부 (boolean)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 403 - 그룹 멤버가 아닙니다

---

### PATCH `routines/sort-order`

**요약:** 루틴 순서 일괄 변경

**Request Body:**

```json
{
  "items": [
    {
      "id": "", // 루틴 ID (string)
      "sortOrder": 0 // 정렬 순서 (number)
    }
  ] // 루틴 순서 목록 (RoutineSortOrderItemDto[])
}
```

**Responses:**

#### 200 - 순서 변경 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "targetCount": null, // 주 목표 횟수 (number | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "isActive": false, // 활성 여부 (boolean)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 오늘 체크 여부 (boolean)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines/:id`

**요약:** 루틴 상세 조회 (본인 또는 공유 그룹원)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 상세 조회 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "targetCount": null, // 주 목표 횟수 (number | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "isActive": false, // 활성 여부 (boolean)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 오늘 체크 여부 (boolean)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 루틴에 접근할 권한이 없습니다

---

### PATCH `routines/:id`

**요약:** 루틴 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "isActive": false, // 활성 여부 (boolean?)
  "routineGroupId": null // 소속시킬 루틴 그룹 ID (null 전달 시 그룹 소속 해제) (string | null?)
}
```

**Responses:**

#### 200 - 루틴 수정 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "targetCount": null, // 주 목표 횟수 (number | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "isActive": false, // 활성 여부 (boolean)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 오늘 체크 여부 (boolean)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 수정할 수 있습니다

---

### DELETE `routines/:id`

**요약:** 루틴 삭제 (soft delete, 체크 기록은 보존)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 삭제할 수 있습니다

---

### POST `routines/:id/check`

**요약:** 루틴 체크 (날짜 미지정 시 오늘)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "date": "", // 체크할 날짜 (YYYY-MM-DD, 미지정 시 오늘) (string?)
  "note": "" // 메모 (string?)
}
```

**Responses:**

#### 201 - 체크 성공

```json
{
  "id": "", // 로그 ID (string)
  "routineId": "", // 루틴 ID (string)
  "checkedDate": "2025-01-01T00:00:00Z", // 체크한 날짜 (Date)
  "note": null, // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "newlyEarnedBadges": [
    {
      "id": "", // 획득 기록 ID (string)
      "badgeId": "", // 배지 ID (string)
      "badge": {
        "id": "",
        "code": "STREAK_DAYS_7",
        "title": "7일 연속 달성",
        "description": null,
        "iconEmoji": null,
        "criteriaType": null,
        "criteriaValue": 7
      }, // 배지 정보 (RoutineBadgeDto)
      "routineId": null, // 획득 기준이 된 루틴 ID (string | null)
      "routineTitle": null, // 획득 기준이 된 루틴 제목 (string | null)
      "earnedAt": "2025-01-01T00:00:00Z" // 획득 일시 (Date)
    }
  ] // 이번 체크로 새로 획득한 배지 목록 (UserRoutineBadgeDto[])
}
```

#### 404 - 루틴을 찾을 수 없습니다

---

### DELETE `routines/:id/check`

**요약:** 루틴 체크 취소 (날짜 미지정 시 오늘)

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `date` (`string`) - Optional

**Responses:**

#### 200 - 체크 취소 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 체크 기록을 찾을 수 없습니다

---

### POST `routines/:id/shares`

**요약:** 그룹에 루틴 공유

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "groupId": "" // 공유할 그룹 ID (string)
}
```

**Responses:**

#### 201 - 공유 성공

```json
{
  "id": "", // 공유 ID (string)
  "routineId": "", // 루틴 ID (string)
  "groupId": "", // 그룹 ID (string)
  "groupName": "", // 그룹 이름 (string)
  "createdAt": "2025-01-01T00:00:00Z" // 공유 생성일 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 공유할 수 있습니다

---

### DELETE `routines/:id/shares/:groupId`

**요약:** 그룹 공유 해제

**Path Parameters:**

- `id` (`string`)
- `groupId` (`string`)

**Responses:**

#### 200 - 공유 해제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 공유 정보를 찾을 수 없습니다

---

### GET `routines/:id/shares`

**요약:** 루틴이 공유된 그룹 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 공유 그룹 목록 조회 성공

```json
{
  "id": "", // 공유 ID (string)
  "routineId": "", // 루틴 ID (string)
  "groupId": "", // 그룹 ID (string)
  "groupName": "", // 그룹 이름 (string)
  "createdAt": "2025-01-01T00:00:00Z" // 공유 생성일 (Date)
}
```

#### 403 - 본인의 루틴만 조회할 수 있습니다

---

### GET `routines/:id/badges`

**요약:** 특정 루틴에서 획득한 배지 목록 조회 (본인 또는 공유 그룹원)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴별 배지 조회 성공

```json
{
  "id": "", // 획득 기록 ID (string)
  "badgeId": "", // 배지 ID (string)
  "badge": {
    "id": "", // 배지 ID (string)
    "code": "STREAK_DAYS_7", // 배지 코드 (string)
    "title": "7일 연속 달성", // 배지 제목 (string)
    "description": null, // 배지 설명 (string | null)
    "iconEmoji": null, // 아이콘 이모지 (string | null)
    "criteriaType": null, // 판정 기준 타입 (BadgeCriteriaType)
    "criteriaValue": 7 // 판정 기준값 (number)
  }, // 배지 정보 (RoutineBadgeDto)
  "routineId": null, // 획득 기준이 된 루틴 ID (string | null)
  "routineTitle": null, // 획득 기준이 된 루틴 제목 (string | null)
  "earnedAt": "2025-01-01T00:00:00Z" // 획득 일시 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 루틴에 접근할 권한이 없습니다

---

### GET `routines/:id/stats/heatmap`

**요약:** 루틴 달력 히트맵 (날짜별 달성 여부)

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `from` (`string`): 조회 시작일 (YYYY-MM-DD)
- `to` (`string`): 조회 종료일 (YYYY-MM-DD)

**Responses:**

#### 200 - 히트맵 조회 성공

```json
{
  "routineId": "", // 루틴 ID (string)
  "from": "", // 조회 시작일 (string)
  "to": "", // 조회 종료일 (string)
  "checkedDates": ["2026-01-02", "2026-01-03"] // 체크된 날짜 목록 (YYYY-MM-DD) (string[])
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 루틴에 접근할 권한이 없습니다

---

### GET `routines/:id/stats/streak`

**요약:** 루틴 스트릭 조회 (현재/최장, 주 단위 + 일 단위)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 스트릭 조회 성공

```json
{
  "routineId": "", // 루틴 ID (string)
  "currentStreakWeeks": 0, // 현재 연속 달성 주 수 (목표 달성 기준) (number)
  "longestStreakWeeks": 0, // 최장 연속 달성 주 수 (number)
  "currentStreakDays": 0, // 현재 연속 체크 일수 (number)
  "longestStreakDays": 0, // 최장 연속 체크 일수 (number)
  "thisWeekProgress": {
    "checked": 0, // 이번 주 체크 횟수 (number)
    "target": 0 // 이번 주 목표 횟수 (number)
  } // 이번 주 진행 상황 (ThisWeekProgressDto)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 루틴에 접근할 권한이 없습니다

---

### GET `routines/:id/stats/rate`

**요약:** 루틴 기간별 달성률 조회

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `period` (`RoutineRatePeriod`): 기간 단위
- `from` (`string`) (Optional): period=custom일 때 시작일 (YYYY-MM-DD)
- `to` (`string`) (Optional): period=custom일 때 종료일 (YYYY-MM-DD)

**Responses:**

#### 200 - 달성률 조회 성공

```json
{
  "routineId": "", // 루틴 ID (string)
  "period": "", // 기간 단위 (string)
  "from": "", // 조회 시작일 (string)
  "to": "", // 조회 종료일 (string)
  "targetCount": 0, // 주 목표 횟수 (number)
  "totalChecked": 0, // 기간 내 실제 체크 횟수 (number)
  "expectedCount": 0, // 기간 내 기대 체크 횟수 (완전한 주 기준) (number)
  "achievementRate": 76 // 달성률 (%) (number)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 루틴에 접근할 권한이 없습니다

---
