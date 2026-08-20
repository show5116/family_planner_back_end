# 20. 루틴 관리 (Routine Management)

> **상태**: ✅ 완료 (1차)
> **Phase**: Phase 6

---

## 개요

습관(루틴)을 등록하고 매일 체크하며, 스트릭·달성률·달력 히트맵으로 관리하는 시스템입니다. 기존 Task의 반복 일정(`Recurring`, 스케줄러 기반 인스턴스 생성) 방식과는 완전히 독립된 모듈로, 체크 로그만 저장하고 통계는 조회 시점에 실시간 계산합니다. 개인 루틴을 그룹에 공유하면 그룹원끼리 달성 현황을 서로 확인하고 랭킹으로 비교할 수 있으며, 연속 달성/누적 체크 마일스톤을 배지로 영구 기록합니다.

---

## 핵심 개념

- **루틴 1개 = 습관 1개**: Task처럼 하위 체크리스트 항목을 두지 않는 심플한 구조. 여러 습관을 묶어서 관리하고 싶으면 `RoutineGroup`(아래 참고)을 사용.
- **반복 주기(2단계 구조)**: `frequencyType: DAILY | WEEKLY | MONTHLY` + `WEEKLY`일 때만 `weeklyMode: COUNT_ONLY | FIXED_DAYS` 부가 지정.
  - `DAILY`: 매일 반복, `targetCount`/`weeklyMode`/`targetDays` 없음
  - `WEEKLY` + `COUNT_ONLY`: 요일 무관 주 N회(`targetCount` 1~7)
  - `WEEKLY` + `FIXED_DAYS`: 특정 요일 지정(`targetDays: number[]`, 0=일요일~6=토요일 — `src/task`의 `Recurring.daysOfWeek`와 동일 컨벤션)
  - `MONTHLY`: 요일/날짜 무관 월 N회(`targetCount` 1~31)
- **스케줄러 없음**: 매일 인스턴스를 미리 생성하지 않고, 체크한 날짜만 `RoutineLog`에 기록. 스트릭/달성률은 조회 시점에 실시간 계산.
- **주 계산 기준**: 월요일 시작 ISO 주. 미래 날짜 체크는 차단.
- **타임존**: "오늘"/"이번 주"/"이번 달" 계산은 항상 KST(Asia/Seoul) 기준(`src/common/utils/date-kst.util.ts`의 `todayInKst()`). 서버가 UTC로 실행되므로 `new Date()`의 UTC getter를 직접 쓰지 말고 반드시 이 함수를 통해 "오늘 날짜"를 구할 것.
- **기록 타입(고정)**: 루틴 생성 시 `recordType`을 하나로 고정(체크마다 바꿀 수 없음). `BOOLEAN`(단순 체크, 기본값) / `TEXT`(텍스트) / `TIME`(시각 "HH:mm") / `NUMERIC`(수치). 체크 시 `recordType`과 일치하는 값 필드만 허용.
- **상태(ACTIVE/PAUSED/ENDED)**: `isActive` 불리언 대신 `status` enum으로 통합. `PAUSED`/`ENDED` 상태의 루틴은 체크 불가(400). `ENDED`는 기존 soft delete(`deletedAt`)와 동일 — 데이터는 보존되고 목록에서만 제외. `PAUSED` 기간은 `RoutinePause` 이력 테이블에 별도 기록되며, 스트릭 계산에서 "결석"이 아니라 통째로 건너뛰는 구간으로 취급(재개 후에도 스트릭이 끊기지 않음).
- **카테고리(개인 커스텀, 다중 선택)**: 사용자가 직접 만드는 태그(`RoutineCategory`, 예: "규칙적인 삶", "운동", "건강"). 카테고리 자체는 `RoutineGroup`과 동일한 개인 소유/soft delete 패턴이지만, 루틴과의 연결은 `RoutineShare`(루틴↔가족그룹)와 동일한 N:M 조인 테이블(`RoutineCategoryLink`) 방식 — 한 루틴에 여러 카테고리를 자유롭게 태그처럼 붙일 수 있음. 가족 그룹 공유와는 무관.
- **그룹 공유(N:M)**: 하나의 루틴을 여러 그룹에 동시 공유 가능. 공유된 그룹의 멤버는 서로의 루틴과 달성 현황을 조회 가능(수정 권한 공유는 없음, 체크는 본인만).
- **삭제 정책**: 루틴 종료(soft delete) 시 `RoutineLog`는 보존(통계/이력 보존 목적).
- **배지**: 체크 직후 동기적으로 판정(스트릭/누적 체크 기준). 한 번 획득한 배지는 체크 취소로도 회수되지 않음. `MONTHLY` 루틴은 월-스트릭이 `STREAK_WEEKS` 배지 기준 슬롯에 매핑됨(주 개념이 없으므로).
- **랭킹보드**: 그룹에 공유된 루틴만 집계 대상(비공유 루틴은 익명으로도 포함하지 않음 — 공유하지 않았다는 의사표시 존중).
- **루틴 그룹**: 여러 습관을 "아침 루틴"처럼 하나의 컨테이너로 묶는 얇은 레이어(`RoutineGroup`). 습관은 최대 1개 그룹에만 소속되며, 그룹 밖에서도 독립적으로 조회/체크 가능. 체크/배지/스트릭/공유는 전부 개별 습관 단위 그대로 유지 — 그룹은 "오늘 3/5 완료" 같은 진행률 뷰만 제공.

---

## 주요 기능

### 루틴 등록/관리
- 제목, 이모지, 색상, 메모(`memo`), 중요도(`importance`: LOW/MEDIUM/HIGH), 시간대 분류(`timeFilter`: MORNING/AFTERNOON/EVENING, 분류용 — 알림 시각과는 무관), 카테고리(`categoryIds`, 생성 시 초기 연결용 배열), 기록 타입(`recordType`), 반복 타입(`frequencyType`/`weeklyMode`/`targetCount`/`targetDays`), 시작일/종료일
- 목록 조회 시 정렬 순서(`sortOrder`) 및 체크 여부(`checkedToday`) + 실제 기록값(`checkedLog`) 포함
- 순서 일괄 변경 (`PATCH /routines/sort-order`)
- `GET /routines`는 `status`/`routineGroupId`/`categoryId`(카테고리 하나를 기준으로 필터, 여러 카테고리 중 하나만 있어도 매칭)/`date`(YYYY-MM-DD, 미지정 시 오늘 — `checkedToday`/`checkedLog`의 조회 기준일) 쿼리로 필터링 가능
- `checkedLog`는 조회 기준일에 체크한 기록의 실제 값(`note`/`textValue`/`numericValue`/`timeValue`)을 담은 객체 — 미체크 시 `null`, BOOLEAN 루틴은 체크했어도 값 필드가 전부 `null`인 객체. "체크했다"는 사실뿐 아니라 몇 시에/몇 개를 기록했는지까지 목록에서 바로 확인 가능

### 상태 관리 (일시정지/종료)
- `PATCH /routines/:id/pause`: 일시정지. `RoutinePause{routineId, pausedFrom}` 이력 생성 + `status: PAUSED`. 이미 일시정지 중이면 409, 종료된 루틴이면 400
- `PATCH /routines/:id/resume`: 재개. 열린 `RoutinePause`를 `pausedTo`로 마감 + `status: ACTIVE`. 일시정지 상태가 아니면 409
- `DELETE /routines/:id`: 종료(soft delete). `status: ENDED` + `deletedAt` 설정, 체크 기록은 보존. 열려있던 일시정지도 함께 마감
- `PAUSED`/`ENDED` 상태에서는 체크(`POST /routines/:id/check`) 시도 시 400
- 일시정지 기간은 스트릭 계산에서 완전히 제외(끊기지 않음) — `RoutineBadgeService`/`RoutineStatsService` 모두 `RoutinePause` 이력을 조회해 제외 구간으로 반영

### 체크/체크취소
- 날짜 미지정 시 오늘 기준으로 체크 (`POST /routines/:id/check`)
- 하루 1건만 허용 (중복 체크 시 409), 미래 날짜 체크 시 400
- 체크 시 `recordType`에 맞는 값만 허용: `BOOLEAN`은 값 없이 체크만, `TEXT`는 `textValue`, `NUMERIC`은 `numericValue`, `TIME`은 `timeValue`("HH:mm") — 불일치 시 400
- 체크 취소는 하드 삭제 (`DELETE /routines/:id/check`)

### 루틴 카테고리
- 사용자가 직접 만드는 개인 커스텀 태그(`RoutineCategory`). CRUD + 순서 일괄 변경 (`/routines/categories/*`)
- 루틴과 카테고리는 N:M(`RoutineCategoryLink` 조인 테이블, `RoutineShare`와 동일 패턴) — 한 루틴에 여러 카테고리를 동시에 붙일 수 있음
- 루틴별 카테고리 연결 관리는 전용 엔드포인트로: `POST /routines/:id/categories`(연결 추가), `DELETE /routines/:id/categories/:categoryId`(연결 해제), `GET /routines/:id/categories`(연결 목록 조회)
- 루틴 생성 시 `categoryIds` 배열로 초기 연결 가능. 수정 시 `categoryIds` 배열을 전달하면 전체 교체(빈 배열 `[]` 전달 시 전체 해제), 미전달 시 기존 연결 유지 — 개별 추가/삭제는 위 전용 엔드포인트로 하고, 전체를 한 번에 바꾸고 싶을 때만 `categoryIds`를 사용
- 카테고리 삭제(soft delete)는 해당 카테고리의 조인 행만 제거 — 여러 카테고리가 달린 루틴은 삭제된 카테고리만 빠지고 나머지 카테고리는 그대로 유지(가족 그룹 공유 `Category`와 무관한 순수 개인 소유 태그)

### 그룹 공유
- 루틴 소유자가 자신이 속한 그룹에 공유 추가/해제 (`RoutineShare`, N:M)
- 공유된 그룹의 멤버는 그룹원별 루틴 목록과 오늘/이번 주 진행 상황을 조회 가능
- 향후 랭킹/경쟁 기능은 `RoutineLog` + `RoutineShare` 조인만으로 스키마 변경 없이 확장 가능하도록 설계

### 통계
- **달력 히트맵**: 기간 내 체크된 날짜 목록 (최대 1년)
- **스트릭**: `frequencyType`에 따라 계산 방식이 분기됨
  - `DAILY`, `WEEKLY/COUNT_ONLY`: 기존과 동일(주 단위 목표 달성 연속 주 수 + 일 단위 연속 체크일)
  - `WEEKLY/FIXED_DAYS`: 스케줄된 요일만 평가 대상(비스케줄 요일은 "미스"로 세지 않음), 주 단위 목표는 `targetDays.length`
  - `MONTHLY`: 월 단위 연속 달성 개월 수(`currentStreakWeeks`/`longestStreakWeeks` 필드에 월-스트릭 값이 담겨 응답됨), 일 단위 스트릭은 매일 스케줄 기준으로 별도 계산
  - 모든 경우에 `RoutinePause` 이력이 "제외 구간"으로 반영되어 일시정지 기간은 스트릭을 끊지 않음
- **기간별 달성률**: `week`/`month`/`custom` 기준. `MONTHLY` 루틴은 월 단위로, 그 외는 주(월~일) 단위로 기대 체크 횟수 대비 실제 체크 횟수(%) 계산. 진행 중인 기간(이번 주/이번 달 등)도 포함해 부분 조회에도 값이 나옴
- **대시보드 요약**: 전체 `ACTIVE` 루틴의 오늘 체크 여부 + 현재 스트릭 + 이번 주/이번 달 진행 상황을 한 번에 조회 (위젯용). `thisWeekProgress`/`thisMonthProgress` 둘 다 응답에 포함되며, `frequencyType=MONTHLY` 루틴은 `thisMonthProgress`만 값이 있고 `thisWeekProgress`는 `null`, 그 외(DAILY/WEEKLY)는 반대로 `thisWeekProgress`만 값이 있고 `thisMonthProgress`는 `null` — 개별 루틴마다 `GET /:id/stats/rate?period=month`를 호출하는 N+1 없이 월간 목표 루틴의 이번 달 진행률까지 한 번에 조회 가능
- **전체 개요(overview)**: `GET /routines/stats/overview?period=week|month` — 전체 루틴을 대상으로 기간 내 총 체크/기대 횟수, 합산 달성률(`totalChecked/totalExpected`), 날짜별 체크 현황 히트맵을 한 번에 반환. `대시보드 요약`과 달리 집계 대상은 `ACTIVE`+`PAUSED`(둘 다 포함, `ENDED`만 제외) — 사용자가 관리 중인 일시정지 습관도 개요에는 포함시키되 개별 요약 위젯(`stats/summary`)과는 의도적으로 다른 필터를 쓴다는 점에 주의. heatmap의 각 날짜 `totalCount`는 그날 실제로 활성 상태였던(시작일 이후, 종료일 이전, 일시정지 아님) 루틴 수로, 날짜마다 다를 수 있다. `totalExpected`/`achievementRate`는 개별 루틴의 `stats/rate`와 동일한 주/월 버킷 방식을 각 루틴의 `startDate`/`endDate`로 클리핑한 뒤 합산한 값이라, 개별 루틴 화면과 전체 개요 화면의 숫자가 일관된다. `period=week`일 때만 `routineBreakdown`(루틴별 `title`/`emoji`/`targetCount`/`checkedDates`)이 함께 내려가 습관별 주간 체크 그리드를 그릴 수 있음(`month`일 때는 필드 자체가 응답에서 생략됨) — `checkedDates`는 `stats/heatmap`과 동일한 포맷의 날짜 문자열 배열이고, `targetCount`는 달성/미달성 판정을 프론트에서 `checkedDates.length`와 비교해 계산할 수 있도록 제공하는 참고값(`WEEKLY/FIXED_DAYS`는 `targetDays.length`, 그 외는 `targetCount ?? 7`, `MONTHLY` 루틴은 주간 목표 개념이 없어 `null`). 과거/미래 주·달 탐색을 위해 `from`(YYYY-MM-DD, 옵션)을 추가로 받을 수 있음 — `from`만 주면 그 날짜가 속한 주(월~일)/달(1일~말일)로 서버가 스냅해서 계산하고, `from`+`to`를 함께 주면 스냅 없이 그 범위를 그대로 사용한다. 둘 다 생략하면 기존과 동일하게 오늘 기준 이번 주/이번 달. 상한(`to`)이 오늘보다 미래로 계산되는 클램핑은 **이번 주/이번 달을 조회할 때만** 적용(진행 중인 기간의 "아직 지나지 않은 날"은 집계 대상에서 제외하려는 의도) — `from`으로 다음 주/다음 달처럼 완전히 미래인 기간을 명시적으로 조회하면 클램핑 없이 그 기간 전체(월~일, 1일~말일)를 그대로 계산하며, `totalChecked=0`/`heatmap`의 `checkedCount`도 전부 0으로 자연스럽게 나옴(아직 아무도 체크할 수 없는 기간이므로)

### 일일 목표 (daily goal)
습관이 많을수록 "그날 대상 전부 체크해야 100%" 구조에서는 달성률이 역설적으로 낮아지는 문제를 완화하기 위해, 사용자가 "하루에 몇 개 하면 성공인지"를 직접 정하는 개념. 사용자 전체에 걸쳐 단일 설정(그룹별 없음), 저장/계산은 전부 개수(count) 기준(비율 자동 환산 없음).

- **설정**: `GET/PATCH /routines/settings` — `dailyGoalMode: ALL | COUNT`(기본 `ALL`), `COUNT`일 때만 `dailyGoalCount`(1 이상). `COUNT`인데 `dailyGoalCount`가 없거나 0 이하면 400. `dailyGoalCount`가 현재 습관 총 개수보다 커도 허용(검증 안 함). `ALL`로 바꿀 때 `dailyGoalCount`를 생략하면 기존 값을 유지해서, 다시 `COUNT`로 되돌릴 때 이전 값이 복원됨.
- **변경 이력 보존**: `RoutineSetting`(현재 값 캐시)과 별개로 `RoutineSettingHistory`(`userId`+`effectiveFrom` 유닛)가 시점별 원장 역할. `PATCH` 호출 시 오늘 날짜로 history row를 upsert하고, 특정 날짜의 유효 설정은 "`effectiveFrom <= 그 날짜`인 것 중 가장 최근 row"로 판정. 즉 **과거 통계를 조회하면 그 시점에 실제 유효했던 목표로 판정**되며(소급 재판정 안 함), 목표를 자주 바꿔도 지난주 통계 숫자가 뒤늦게 달라지지 않음.
- **`GET /routines/stats/overview` 확장**: `heatmap[].goalAchieved`(그날 목표 달성 여부, 그날 대상 습관이 0개면 `null`)와, 응답 최상위에 `dailyGoalMode`/`dailyGoalCount`(조회 기간 마지막 날 기준 유효 설정)/`goalAchievedDays`/`goalTotalDays`/`goalAchievementRate` 추가. `goalTotalDays`는 대상 습관이 0개였던 날을 제외한 집계 대상 일수 — 진행 중인 기간(이번 주/이번 달)은 자연히 오늘까지의 경과 일수만 포함됨(기존 `to` 클램핑과 동일한 이유). `ALL` 모드인 날은 "그날 대상 습관 전부 체크"가 목표.
- **`GET /routines/stats/daily-streak`(신규)**: 일일 목표 기준 전체 연속 달성 스트릭. `currentStreakDays`/`longestStreakDays`/`todayAchieved`/`todayCheckedCount`/`todayTargetCount`와, 목표 조정 제안용 `recent14Days`(최근 14일 `achievedDays`/`exceededDays`/`totalDays`/`averageCheckedCount`) 포함. **오늘이 아직 미달성이어도 스트릭을 끊지 않고 어제까지의 값을 유지**(자정이 지나야 끊김). 대상 습관이 0개였던 날은 스트릭을 끊지 않고 건너뜀. 스트릭 계산은 `RoutineSettingHistory` 최초 생성일부터 시작(그 이전은 아직 목표 개념이 없던 기간이라 감사 대상에서 제외) — `ALL` 모드만 써온 사용자도(한 번도 `COUNT`로 바꾼 적 없어도 `PATCH`를 호출한 적이 있다면) 동일하게 전체 스트릭 조회 가능. `RoutineSettingHistory`가 아예 없는 사용자(설정을 한 번도 변경한 적 없음)는 모든 값이 0/빈 값으로 응답(에러 아님).

### 배지
- 체크(`POST /routines/:id/check`) 성공 직후 `RoutineBadgeService.evaluateAndAward()`가 동기적으로 판정, 응답의 `newlyEarnedBadges`에 신규 획득 배지 포함
- 판정 기준 3종: `STREAK_DAYS`(연속 체크일), `STREAK_WEEKS`(연속 주간 목표 달성), `TOTAL_CHECKS`(누적 체크 횟수) — 카탈로그 9종 시드값은 아래 참고
- 배지 평가 실패는 체크 자체를 막지 않음(에러 격리), 체크 취소 시에도 이미 획득한 배지는 회수하지 않음
- 배지 획득 시 `ROUTINE_STREAK_MILESTONE` 알림 자동 발송

### 루틴 그룹
- 여러 습관을 하나의 컨테이너(`RoutineGroup`)로 묶어 "아침 루틴"처럼 관리. 습관은 최대 1개 그룹에만 소속(선택적 FK), 그룹 밖에서도 독립 조회/체크 가능
- 그룹 CRUD + 순서 일괄 변경 (`/routines/routine-groups/*`)
- 그룹 목록/상세 조회 시 오늘 기준 진행률(`todayProgress: { checked, total }`) 포함 — 그룹 내 활성 습관 대비 오늘 체크 완료 수
- 그룹 삭제는 soft delete, 소속 습관은 삭제되지 않고 `groupId`만 `null`로 해제(습관 자체와 `RoutineLog` 이력은 그대로 유지)
- 습관 생성/수정 시 `routineGroupId`로 소속 지정/변경 가능, 수정 시 `null` 전달로 소속 해제 가능
- 체크/체크취소/배지/스트릭/공유는 전부 기존 개별 루틴 로직 그대로 — 그룹은 진행률 집계 뷰만 추가하는 얇은 레이어(1차는 그룹 단위 배지/스트릭/랭킹보드 없음)

### 그룹 랭킹보드
- `GET /routines/groups/:groupId/leaderboard?period=week|month&metric=checkCount|achievementRate`
- 집계 대상은 해당 그룹에 `RoutineShare`로 공유된 루틴만, 소유자 단위로 그룹핑
- 응답에 `checkCount`, `achievementRate`를 항상 함께 포함(정렬 기준만 `metric`으로 결정, 프런트가 재조회 없이 전환 가능)

### 알림/리마인더
- `NotificationCategory.ROUTINE` 신설, `PUT /notifications/settings`에서 `routineReminderHour`(0~23시, 기본 21시)로 개인화된 리마인드 시각 설정 (WEATHER의 `weatherAlertHour`와 동일 패턴)
- 트리거 3종:
  - `ROUTINE_DAILY_REMINDER`: 설정 시각에 오늘 미체크 루틴이 있으면 발송 (매 정시 크론 + 시각 필터링). `status: ACTIVE` 루틴만 대상(PAUSED/ENDED 제외), `WEEKLY/FIXED_DAYS` 루틴은 오늘이 스케줄된 요일이 아니면 집계에서 제외
  - `ROUTINE_STREAK_MILESTONE`: 배지 획득 시점에 발송
  - `ROUTINE_WEEKLY_SUMMARY`: 매주 일요일 20시(KST), 이번 주 평균 달성률 요약 발송. `MONTHLY` 루틴은 주 단위 달성률 개념이 맞지 않아 평균 계산에서 제외
- `timeFilter`(오전/오후/저녁)는 분류용으로만 사용되며 리마인더 발송 시각에는 영향을 주지 않음(단일 `routineReminderHour` 시각 유지)
- 그룹원 간 미체크 알림(사회적 압박 알림)은 1차 범위 제외

---

## 데이터베이스

```prisma
model Routine {
  id            String               @id @default(uuid())
  userId        String
  groupId       String?
  title         String               @db.VarChar(100)
  emoji         String?              @db.VarChar(10)
  color         String?              @db.VarChar(7)
  memo          String?              @db.VarChar(500)
  importance    RoutineImportance    @default(MEDIUM)
  timeFilter    RoutineTimeFilter?
  frequencyType RoutineFrequencyType @default(WEEKLY)
  weeklyMode    RoutineWeeklyMode?   // frequencyType=WEEKLY일 때만 사용
  targetCount   Int?                 // WEEKLY/COUNT_ONLY: 주 N회, MONTHLY: 월 N회
  targetDays    Json?                // WEEKLY/FIXED_DAYS: number[] (0=일~6=토)
  recordType    RoutineRecordType    @default(BOOLEAN)
  status        RoutineStatus        @default(ACTIVE)
  startDate     DateTime             @db.Date
  endDate       DateTime?            @db.Date
  sortOrder     Int                  @default(0)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  deletedAt     DateTime?

  user          User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  group         RoutineGroup?         @relation(fields: [groupId], references: [id], onDelete: SetNull)
  logs          RoutineLog[]
  shares        RoutineShare[]
  badges        UserRoutineBadge[]
  pauses        RoutinePause[]
  categoryLinks RoutineCategoryLink[]

  @@index([userId, status])
  @@index([userId, sortOrder])
  @@index([deletedAt])
  @@index([groupId])
  @@map("routines")
}

model RoutineCategory {
  id        String    @id @default(uuid())
  userId    String
  title     String    @db.VarChar(50)
  emoji     String?   @db.VarChar(10)
  color     String?   @db.VarChar(7)
  sortOrder Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  user         User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  routineLinks RoutineCategoryLink[]

  @@index([userId, deletedAt])
  @@map("routine_categories")
}

// 루틴 ↔ 카테고리 (N:M, RoutineShare와 동일한 조인 테이블 패턴)
model RoutineCategoryLink {
  id         String   @id @default(uuid())
  routineId  String
  categoryId String
  createdAt  DateTime @default(now())

  routine  Routine         @relation(fields: [routineId], references: [id], onDelete: Cascade)
  category RoutineCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([routineId, categoryId])
  @@index([categoryId])
  @@map("routine_category_links")
}

// 일시정지 이력 (재일시정지 가능하므로 단일 컬럼이 아닌 이력 테이블)
model RoutinePause {
  id         String    @id @default(uuid())
  routineId  String
  pausedFrom DateTime  @db.Date
  pausedTo   DateTime? @db.Date   // null = 아직 재개 안 함(현재 일시정지 중)
  createdAt  DateTime  @default(now())

  routine Routine @relation(fields: [routineId], references: [id], onDelete: Cascade)

  @@index([routineId, pausedFrom])
  @@map("routine_pauses")
}

model RoutineLog {
  id           String   @id @default(uuid())
  routineId    String
  userId       String              // 비정규화: 그룹 조회 시 join 최소화
  checkedDate  DateTime @db.Date   // 하루 1건
  note         String?  @db.VarChar(200)
  textValue    String?  @db.VarChar(500)   // recordType=TEXT
  numericValue Decimal? @db.Decimal(10, 2) // recordType=NUMERIC
  timeValue    String?  @db.VarChar(5)     // recordType=TIME, "HH:mm"
  createdAt    DateTime @default(now())

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
  DAILY
  WEEKLY
  MONTHLY
}

enum RoutineWeeklyMode {
  COUNT_ONLY   // 요일 무관 주 N회
  FIXED_DAYS   // 특정 요일 지정
}

enum RoutineImportance {
  LOW
  MEDIUM
  HIGH
}

enum RoutineTimeFilter {
  MORNING
  AFTERNOON
  EVENING
}

enum RoutineRecordType {
  BOOLEAN   // 단순 체크 (기본값)
  TEXT
  TIME      // "HH:mm" 시각
  NUMERIC
}

enum RoutineStatus {
  ACTIVE
  PAUSED
  ENDED     // 기존 soft delete와 동일 의미, deletedAt과 함께 설정됨
}

model RoutineBadge {
  id            String            @id @default(uuid())
  code          String            @unique @db.VarChar(50)
  title         String            @db.VarChar(100)
  description   String?           @db.VarChar(200)
  iconEmoji     String?           @db.VarChar(10)
  criteriaType  BadgeCriteriaType
  criteriaValue Int
  sortOrder     Int               @default(0)
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  userBadges UserRoutineBadge[]

  @@index([criteriaType])
  @@index([isActive, sortOrder])
  @@map("routine_badges")
}

model UserRoutineBadge {
  id        String   @id @default(uuid())
  userId    String
  badgeId   String
  routineId String?
  earnedAt  DateTime @default(now())

  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge   RoutineBadge @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  routine Routine?     @relation(fields: [routineId], references: [id], onDelete: Cascade)

  @@unique([userId, badgeId, routineId])
  @@index([userId])
  @@index([badgeId])
  @@index([routineId])
  @@map("user_routine_badges")
}

enum BadgeCriteriaType {
  STREAK_DAYS
  STREAK_WEEKS
  TOTAL_CHECKS
}

model RoutineGroup {
  id        String    @id @default(uuid())
  userId    String
  title     String    @db.VarChar(100)
  emoji     String?   @db.VarChar(10)
  color     String?   @db.VarChar(7)
  sortOrder Int       @default(0)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  routines Routine[]

  @@index([userId, deletedAt])
  @@map("routine_groups")
}
```

`Routine`에는 선택적 FK `groupId String?` + `group RoutineGroup? @relation(..., onDelete: SetNull)`가 추가되어 있음 — 그룹 삭제 시 소속 습관은 유지되고 `groupId`만 `null`로 해제됨. 기존 `RoutineShare.groupId`(가족 `Group` 참조)와 필드명이 겹치지만 참조 모델이 달라 문제없고, DTO/컨트롤러 레벨에서는 `routineGroupId`로 구분해 혼동을 방지함.

### 배지 카탈로그 (9종 시드)

| code | criteriaType | criteriaValue | title | iconEmoji |
|---|---|---|---|---|
| STREAK_DAYS_7 | STREAK_DAYS | 7 | 7일 연속 달성 | 🔥 |
| STREAK_DAYS_30 | STREAK_DAYS | 30 | 30일 연속 달성 | 🔥 |
| STREAK_DAYS_100 | STREAK_DAYS | 100 | 100일 연속 달성 | 🏆 |
| STREAK_WEEKS_4 | STREAK_WEEKS | 4 | 4주 연속 목표 달성 | ⭐ |
| STREAK_WEEKS_12 | STREAK_WEEKS | 12 | 12주 연속 목표 달성 | 🌟 |
| STREAK_WEEKS_52 | STREAK_WEEKS | 52 | 1년 연속 목표 달성 | 👑 |
| TOTAL_CHECKS_50 | TOTAL_CHECKS | 50 | 누적 50회 체크 | ✅ |
| TOTAL_CHECKS_200 | TOTAL_CHECKS | 200 | 누적 200회 체크 | 💯 |
| TOTAL_CHECKS_500 | TOTAL_CHECKS | 500 | 누적 500회 체크 | 💎 |

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
- [x] 배지 시스템 (카탈로그 9종, 체크 시 동기 판정, 체크 응답에 신규 획득 포함)
- [x] 그룹 랭킹보드 (공유 루틴 기준 체크 횟수/달성률 순위)
- [x] 알림/리마인더 (일일 미체크 리마인드, 배지 획득 알림, 주간 요약)
- [x] 루틴 그룹 (`RoutineGroup`) — 여러 습관 묶음 관리, 진행률 조회, 개별 습관 소속 지정/해제
- [x] 반복 주기 재설계 — `DAILY`/`WEEKLY`(COUNT_ONLY/FIXED_DAYS)/`MONTHLY` 전 종류 실제 구현 및 스트릭/달성률 연동
- [x] 기록 타입 (`BOOLEAN`/`TEXT`/`TIME`/`NUMERIC`) — 루틴 생성 시 고정, 체크 시 타입별 값 검증
- [x] 상태 관리 (`ACTIVE`/`PAUSED`/`ENDED`) — 일시정지 이력(`RoutinePause`) 기반 스트릭 유지
- [x] 루틴 카테고리 (`RoutineCategory`) — 개인 커스텀 태그, CRUD
- [x] 루틴-카테고리 N:M 연결 (`RoutineCategoryLink`) — 한 루틴에 여러 카테고리 태그, 추가/해제/전체교체 지원
- [x] 중요도/메모/시간대 분류 필드 추가

### ⬜ 향후 고려
- [ ] 그룹원 간 미체크 알림(사회적 압박 vs 동기부여, 옵트인 필요)
- [ ] 랭킹보드 동순위 처리 정책
- [ ] 시간대 분류(`timeFilter`)와 리마인더 시각 연동
- [ ] 그룹/카테고리 단위 배지·스트릭·랭킹보드 확장

---

## API 엔드포인트

### 루틴 기본

| Method | Endpoint               | 설명                          | 권한       |
| ------ | ---------------------- | ----------------------------- | ---------- |
| POST   | `/routines`             | 루틴 생성                     | JWT        |
| GET    | `/routines`             | 내 루틴 목록 (status/routineGroupId/categoryId/date 필터, checkedLog 포함) | JWT |
| GET    | `/routines/:id`         | 루틴 상세 (본인 또는 공유 그룹원) | JWT     |
| PATCH  | `/routines/:id`         | 루틴 수정                     | JWT, Owner |
| DELETE | `/routines/:id`         | 루틴 종료 (soft delete)       | JWT, Owner |
| PATCH  | `/routines/:id/pause`   | 루틴 일시정지                 | JWT, Owner |
| PATCH  | `/routines/:id/resume`  | 루틴 재개                     | JWT, Owner |
| PATCH  | `/routines/sort-order`  | 순서 일괄 변경                | JWT        |

### 루틴 카테고리

| Method | Endpoint                          | 설명                                 | 권한       |
| ------ | ----------------------------------- | ------------------------------------ | ---------- |
| POST   | `/routines/categories`              | 카테고리 생성                        | JWT        |
| GET    | `/routines/categories`              | 내 카테고리 목록                     | JWT        |
| PATCH  | `/routines/categories/sort-order`   | 카테고리 순서 일괄 변경              | JWT        |
| GET    | `/routines/categories/:id`          | 카테고리 상세 (소속 습관 목록 포함)  | JWT, Owner |
| PATCH  | `/routines/categories/:id`          | 카테고리 수정                        | JWT, Owner |
| DELETE | `/routines/categories/:id`          | 카테고리 삭제 (soft delete, 습관은 소속만 해제) | JWT, Owner |

### 루틴 그룹

| Method | Endpoint                              | 설명                                 | 권한       |
| ------ | -------------------------------------- | ------------------------------------ | ---------- |
| POST   | `/routines/routine-groups`             | 그룹 생성                            | JWT        |
| GET    | `/routines/routine-groups`             | 내 그룹 목록 (진행률 포함)           | JWT        |
| PATCH  | `/routines/routine-groups/sort-order`  | 그룹 순서 일괄 변경                  | JWT        |
| GET    | `/routines/routine-groups/:id`         | 그룹 상세 (소속 습관 목록 + 진행률)  | JWT, Owner |
| PATCH  | `/routines/routine-groups/:id`         | 그룹 수정 (제목/이모지/색상)         | JWT, Owner |
| DELETE | `/routines/routine-groups/:id`         | 그룹 삭제 (soft delete, 습관은 소속만 해제) | JWT, Owner |

> `/routines/groups/:groupId/*`(가족 그룹 공유)와 네임스페이스가 겹치지 않도록 루틴 그룹은 `/routines/routine-groups`를 별도로 사용.

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
| GET    | `/routines/groups/:groupId/leaderboard?period=&metric=` | 그룹 랭킹보드 | JWT, Member |

### 루틴-카테고리 연결

| Method | Endpoint                                | 설명                       | 권한       |
| ------ | ---------------------------------------- | -------------------------- | ---------- |
| POST   | `/routines/:id/categories`               | 카테고리 연결 추가         | JWT, Owner |
| DELETE | `/routines/:id/categories/:categoryId`   | 카테고리 연결 해제         | JWT, Owner |
| GET    | `/routines/:id/categories`               | 연결된 카테고리 목록       | JWT, Owner |

### 통계

| Method | Endpoint                             | 설명                              | 권한        |
| ------ | -------------------------------------- | --------------------------------- | ----------- |
| GET    | `/routines/:id/stats/heatmap?from=&to=` | 날짜별 달성 여부 (최대 1년)       | JWT, Access |
| GET    | `/routines/:id/stats/streak`           | 현재/최장 스트릭 (주/일 단위)     | JWT, Access |
| GET    | `/routines/:id/stats/rate?period=`     | 기간별 달성률                     | JWT, Access |
| GET    | `/routines/stats/summary`              | 대시보드 위젯용 전체 루틴 요약    | JWT         |
| GET    | `/routines/stats/overview?period=`     | 전체 루틴 개요 (달성률 + 날짜별 히트맵 + 일일 목표) | JWT     |
| GET    | `/routines/stats/daily-streak`         | 일일 목표 기준 전체 연속 달성 스트릭 | JWT       |
| GET    | `/routines/settings`                   | 루틴 일일 목표 설정 조회          | JWT         |
| PATCH  | `/routines/settings`                   | 루틴 일일 목표 설정 변경          | JWT         |

### 배지

| Method | Endpoint                | 설명                              | 권한        |
| ------ | ------------------------ | --------------------------------- | ----------- |
| GET    | `/routines/badges`       | 전체 배지 카탈로그 (활성만)       | JWT         |
| GET    | `/routines/:id/badges`   | 특정 루틴에서 획득한 배지         | JWT, Access |
| GET    | `/routines/me/badges`    | 내 전체 통산 배지                 | JWT         |

---

## 구현 파일

```
src/routine/
  dto/
    create-routine.dto.ts             — memo/importance/timeFilter/categoryIds/recordType/frequencyType/weeklyMode/targetCount/targetDays 등 전체 필드
    update-routine.dto.ts             — routineGroupId?: string | null (해제용 오버라이드), categoryIds?: string[] (전체 교체용), isActive 제거(status는 pause/resume/end 전용 엔드포인트로만 전환)
    routine-query.dto.ts              — status/routineGroupId/categoryId/date 필터
    check-routine.dto.ts              — textValue/numericValue/timeValue (recordType별 값)
    create-routine-share.dto.ts
    create-routine-category-link.dto.ts — { categoryId } (루틴-카테고리 개별 연결용)
    reorder-routine.dto.ts
    create-routine-group.dto.ts
    update-routine-group.dto.ts
    reorder-routine-group.dto.ts
    create-routine-category.dto.ts
    update-routine-category.dto.ts
    reorder-routine-category.dto.ts
    routine-stats-query.dto.ts       — HeatmapQueryDto, RateQueryDto
    routine-leaderboard-query.dto.ts  — LeaderboardQueryDto
    routine-leaderboard-response.dto.ts — LeaderboardResponseDto, LeaderboardEntryDto
    routine-badge-response.dto.ts    — RoutineBadgeDto, UserRoutineBadgeDto
    routine-response.dto.ts          — RoutineDto(+memo/importance/timeFilter/categoryIds/recordType/status/weeklyMode/targetDays/checkedLog), RoutineCheckedLogDto(조회 기준일 기록값), RoutineLogDto(+textValue/numericValue/timeValue), RoutineShareDto, RoutineCategoryLinkDto, RoutineMemberSummaryDto
    routine-group-response.dto.ts    — RoutineGroupDto(+todayProgress), RoutineGroupDetailDto(+routines)
    routine-category-response.dto.ts — RoutineCategoryDto, RoutineCategoryDetailDto(+routines)
    routine-stats-response.dto.ts    — HeatmapResponseDto, StreakResponseDto, RateResponseDto, RoutineSummaryDto
  enums/
    index.ts                        — RoutineFrequencyType, RoutineWeeklyMode, RoutineImportance, RoutineTimeFilter, RoutineRecordType, RoutineStatus, BadgeCriteriaType re-export
  utils/
    routine-stats.util.ts            — 주/월 단위 스트릭·달성률 순수 함수, 일시정지 구간 인지 day-streak, FIXED_DAYS 스케줄 판정
  routine.controller.ts
  routine.service.ts                 — CRUD, pause/resume/end, 체크/체크취소(배지 판정 연동, 기록타입 검증), 그룹 공유 관리, 카테고리 연결 관리(addCategory/removeCategory/findCategories)
  routine-group.service.ts           — 루틴 그룹 CRUD, 오늘 진행률 계산
  routine-category.service.ts        — 루틴 카테고리 CRUD (개인 커스텀 태그, 루틴과의 연결 자체는 routine.service.ts가 담당)
  routine-stats.service.ts           — 히트맵/스트릭/달성률/요약 (frequencyType별 분기, 일시정지 구간 반영)
  routine-badge.service.ts           — 배지 카탈로그 조회, evaluateAndAward() (frequencyType별 스트릭 분기)
  routine-leaderboard.service.ts     — 그룹 랭킹보드 집계
  routine-reminder.scheduler.ts      — 일일 리마인더 + 주간 요약 크론 (status/FIXED_DAYS/MONTHLY 인지)
  routine.module.ts

src/common/utils/
  date-kst.util.ts                   — todayInKst(), thisMonthStartInKst(), parseDateOnly() (KST 기준 날짜 계산, 프로젝트 공용)
```

**Last Updated**: 2026-08-11
