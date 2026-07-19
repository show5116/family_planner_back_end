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
  "memo": "", // 루틴 메모 (체크별 note와 별개로, 루틴 자체에 대한 설명) (string?)
  "importance": null, // 중요도 (RoutineImportance?)
  "timeFilter": null, // 시간대 분류 (오전/오후/저녁, 알림과는 무관한 분류용) (RoutineTimeFilter?)
  "categoryIds": "<String>", // 초기 연결할 루틴 카테고리 ID 목록 (없으면 미분류) (string[]?)
  "recordType": null, // 기록 방식 (BOOLEAN=단순 체크, TEXT=텍스트, TIME=시각(HH:mm), NUMERIC=수치). 루틴 생성 시 고정되며 체크마다 바꿀 수 없음 (RoutineRecordType?)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType?)
  "weeklyMode": null, // 주 반복 세부 방식 (frequencyType=WEEKLY일 때 필수). COUNT_ONLY=요일 무관 주 N회, FIXED_DAYS=특정 요일 지정 (RoutineWeeklyMode?)
  "targetCount": 3, // 목표 횟수. WEEKLY+COUNT_ONLY=주 목표 횟수(1~7), MONTHLY=월 목표 횟수(1~31) (number?)
  "targetDays": [1, 3, 5], // 반복 요일 목록 (frequencyType=WEEKLY, weeklyMode=FIXED_DAYS일 때 필수, 0=일요일~6=토요일) (number[]?)
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
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines`

**요약:** 내 루틴 목록 조회

**Query Parameters:**

- `status` (`RoutineStatus`) (Optional): 상태 필터 (ACTIVE/PAUSED만 의미 있음, ENDED는 항상 목록에서 제외됨)
- `routineGroupId` (`string`) (Optional): 특정 루틴 그룹 소속만 조회
- `categoryId` (`string`) (Optional): 특정 루틴 카테고리 소속만 조회
- `date` (`string`) (Optional): 체크 여부/기록값 조회 기준 날짜 (YYYY-MM-DD, 미지정 시 오늘)

**Responses:**

#### 200 - 루틴 목록 조회 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
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

### POST `routines/categories`

**요약:** 루틴 카테고리 생성 (사용자 커스텀 태그)

**Request Body:**

```json
{
  "title": "규칙적인 삶", // 카테고리 제목 (string)
  "emoji": "📅", // 이모지 (string?)
  "color": "#22C55E" // 색상 (HEX) (string?)
}
```

**Responses:**

#### 201 - 루틴 카테고리 생성 성공

```json
{
  "id": "", // 카테고리 ID (string)
  "title": "규칙적인 삶", // 카테고리 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines/categories`

**요약:** 내 루틴 카테고리 목록 조회

**Responses:**

#### 200 - 루틴 카테고리 목록 조회 성공

```json
{
  "id": "", // 카테고리 ID (string)
  "title": "규칙적인 삶", // 카테고리 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### PATCH `routines/categories/sort-order`

**요약:** 루틴 카테고리 순서 일괄 변경

**Request Body:**

```json
{
  "items": [
    {
      "id": "", // 카테고리 ID (string)
      "sortOrder": 0 // 정렬 순서 (number)
    }
  ] // 카테고리 순서 목록 (RoutineCategorySortOrderItemDto[])
}
```

**Responses:**

#### 200 - 순서 변경 성공

```json
{
  "id": "", // 카테고리 ID (string)
  "title": "규칙적인 삶", // 카테고리 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `routines/categories/:id`

**요약:** 루틴 카테고리 상세 조회 (소속 습관 목록 포함)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 카테고리 상세 조회 성공

```json
{
  "routines": [
    {
      "id": "uuid-1234", // 루틴 ID (string)
      "title": "아침 스트레칭", // 루틴 제목 (string)
      "emoji": null, // 이모지 (string | null)
      "color": null, // 색상 (string | null)
      "memo": null, // 루틴 메모 (string | null)
      "importance": null, // 중요도 (RoutineImportance)
      "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
      "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
      "recordType": null, // 기록 방식 (RoutineRecordType)
      "status": null, // 상태 (RoutineStatus)
      "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
      "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
      "targetCount": null, // 목표 횟수 (주/월) (number | null)
      "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
      "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
      "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
      "sortOrder": 0, // 정렬 순서 (number)
      "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
      "checkedLog": {
        "note": null,
        "textValue": null,
        "numericValue": null,
        "timeValue": null
      }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
      "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ] // 소속 습관 목록 (RoutineDto[])
}
```

#### 404 - 루틴 카테고리를 찾을 수 없습니다

#### 403 - 본인의 카테고리만 조회할 수 있습니다

---

### PATCH `routines/categories/:id`

**요약:** 루틴 카테고리 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 루틴 카테고리 수정 성공

```json
{
  "id": "", // 카테고리 ID (string)
  "title": "규칙적인 삶", // 카테고리 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴 카테고리를 찾을 수 없습니다

#### 403 - 본인의 카테고리만 수정할 수 있습니다

---

### DELETE `routines/categories/:id`

**요약:** 루틴 카테고리 삭제 (soft delete, 소속 습관은 카테고리만 해제)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 카테고리 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 루틴 카테고리를 찾을 수 없습니다

#### 403 - 본인의 카테고리만 삭제할 수 있습니다

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
      "memo": null, // 루틴 메모 (string | null)
      "importance": null, // 중요도 (RoutineImportance)
      "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
      "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
      "recordType": null, // 기록 방식 (RoutineRecordType)
      "status": null, // 상태 (RoutineStatus)
      "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
      "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
      "targetCount": null, // 목표 횟수 (주/월) (number | null)
      "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
      "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
      "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
      "sortOrder": 0, // 정렬 순서 (number)
      "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
      "checkedLog": {
        "note": null,
        "textValue": null,
        "numericValue": null,
        "timeValue": null
      }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
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
      "memo": null, // 루틴 메모 (string | null)
      "importance": null, // 중요도 (RoutineImportance)
      "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
      "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
      "recordType": null, // 기록 방식 (RoutineRecordType)
      "status": null, // 상태 (RoutineStatus)
      "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
      "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
      "targetCount": null, // 목표 횟수 (주/월) (number | null)
      "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
      "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
      "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
      "sortOrder": 0, // 정렬 순서 (number)
      "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
      "checkedLog": {
        "note": null,
        "textValue": null,
        "numericValue": null,
        "timeValue": null
      }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
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
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
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
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
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
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
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
  "routineGroupId": null, // 소속시킬 루틴 그룹 ID (null 전달 시 그룹 소속 해제) (string | null?)
  "categoryIds": "<String>" // 전체 카테고리 목록을 이 배열로 교체 (빈 배열 [] 전달 시 전체 해제). 미전달 시 기존 연결 유지 (string[]?)
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
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 수정할 수 있습니다

---

### DELETE `routines/:id`

**요약:** 루틴 종료 (soft delete, 체크 기록은 보존)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 루틴 종료 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 종료할 수 있습니다

---

### PATCH `routines/:id/pause`

**요약:** 루틴 일시정지 (체크 불가, 스트릭은 끊기지 않음)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 일시정지 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 일시정지할 수 있습니다

---

### PATCH `routines/:id/resume`

**요약:** 루틴 재개

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 재개 성공

```json
{
  "id": "uuid-1234", // 루틴 ID (string)
  "title": "아침 스트레칭", // 루틴 제목 (string)
  "emoji": null, // 이모지 (string | null)
  "color": null, // 색상 (string | null)
  "memo": null, // 루틴 메모 (string | null)
  "importance": null, // 중요도 (RoutineImportance)
  "timeFilter": null, // 시간대 분류 (RoutineTimeFilter | null)
  "categoryIds": "<String>", // 소속 루틴 카테고리 ID 목록 (string[])
  "recordType": null, // 기록 방식 (RoutineRecordType)
  "status": null, // 상태 (RoutineStatus)
  "frequencyType": null, // 반복 타입 (RoutineFrequencyType)
  "weeklyMode": null, // 주 반복 세부 방식 (RoutineWeeklyMode | null)
  "targetCount": null, // 목표 횟수 (주/월) (number | null)
  "targetDays": "<Number>", // 반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용) (number[] | null)
  "startDate": "2025-01-01T00:00:00Z", // 시작일 (Date)
  "endDate": "2025-01-01T00:00:00Z", // 종료일 (Date | null)
  "sortOrder": 0, // 정렬 순서 (number)
  "checkedToday": false, // 조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부 (boolean)
  "checkedLog": {
    "note": null, // 메모 (string | null)
    "textValue": null, // 텍스트 기록 값 (string | null)
    "numericValue": null, // 수치 기록 값 (number | null)
    "timeValue": null // 시각 기록 값 (HH:mm) (string | null)
  }, // 조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체) (RoutineCheckedLogDto | null)
  "routineGroupId": null, // 소속 루틴 그룹 ID (string | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 루틴을 찾을 수 없습니다

#### 403 - 본인의 루틴만 재개할 수 있습니다

---

### POST `routines/:id/check`

**요약:** 루틴 체크 (날짜 미지정 시 오늘)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "date": "", // 체크할 날짜 (YYYY-MM-DD, 미지정 시 오늘) (string?)
  "note": "", // 메모 (string?)
  "textValue": "", // 텍스트 기록 값 (recordType=TEXT인 루틴만 사용) (string?)
  "numericValue": 0, // 수치 기록 값 (recordType=NUMERIC인 루틴만 사용) (number?)
  "timeValue": "07:30" // 시각 기록 값 "HH:mm" (recordType=TIME인 루틴만 사용) (string?)
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
  "textValue": null, // 텍스트 기록 값 (string | null)
  "numericValue": null, // 수치 기록 값 (number | null)
  "timeValue": null, // 시각 기록 값 (HH:mm) (string | null)
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

### POST `routines/:id/categories`

**요약:** 루틴에 카테고리 연결

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "categoryId": "" // 연결할 카테고리 ID (string)
}
```

**Responses:**

#### 201 - 연결 성공

```json
{
  "id": "", // 연결 ID (string)
  "routineId": "", // 루틴 ID (string)
  "categoryId": "", // 카테고리 ID (string)
  "categoryTitle": "", // 카테고리 제목 (string)
  "createdAt": "2025-01-01T00:00:00Z" // 연결 생성일 (Date)
}
```

#### 404 - 루틴 또는 카테고리를 찾을 수 없습니다

#### 403 - 본인의 루틴만 카테고리를 연결할 수 있습니다

---

### DELETE `routines/:id/categories/:categoryId`

**요약:** 루틴에서 카테고리 연결 해제

**Path Parameters:**

- `id` (`string`)
- `categoryId` (`string`)

**Responses:**

#### 200 - 연결 해제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 연결 정보를 찾을 수 없습니다

---

### GET `routines/:id/categories`

**요약:** 루틴에 연결된 카테고리 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 연결된 카테고리 목록 조회 성공

```json
{
  "id": "", // 연결 ID (string)
  "routineId": "", // 루틴 ID (string)
  "categoryId": "", // 카테고리 ID (string)
  "categoryTitle": "", // 카테고리 제목 (string)
  "createdAt": "2025-01-01T00:00:00Z" // 연결 생성일 (Date)
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
