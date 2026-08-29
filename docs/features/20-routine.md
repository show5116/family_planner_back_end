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
- **카테고리(개인 커스텀, 다중 선택)**: 사용자가 직접 만드는 태그(`RoutineCategory`, 예: "규칙적인 삶", "운동", "건강"). 카테고리 자체는 `RoutineGroup`과 동일한 개인 소유/soft delete 패턴이지만, 루틴과의 연결은 N:M 조인 테이블(`RoutineCategoryLink`) 방식 — 한 루틴에 여러 카테고리를 자유롭게 태그처럼 붙일 수 있음. 가족 그룹 공유와는 무관.
- **사용자 단위 공유 (5차)**: 습관 단위(`RoutineShare`, 습관×그룹)가 아니라 **사용자×가족그룹**(`RoutineGroupShare`) 단위로 공유한다. 특정 가족 그룹에 공유를 설정하면 그 사용자의 습관이 (비공개로 표시한 것만 빼고) 전부 그룹원에게 보인다. 자세한 내용은 "사용자 단위 공유" 절 참고.
- **삭제 정책**: 루틴 종료(soft delete) 시 `RoutineLog`는 보존(통계/이력 보존 목적).
- **배지(3차부터 일일 목표 기준, 유저 단위)**: 습관 개별이 아니라 사용자의 일일 목표 달성 여부를 기준으로 판정. 체크 직후 동기적으로 판정하며, 한 번 획득한 배지는 체크 취소로도 회수되지 않음. 자세한 내용은 "배지" 절 참고.
- **랭킹보드(5차부터 일일 목표 기준)**: 공유 그룹에 속한 사용자의 비공개 아닌 습관만 집계 대상. "공유한 습관 수"가 아니라 일일 목표 달성률/연속일수로 비교하므로 습관 개수가 서로 달라도 공정하게 비교된다.
- **그룹 챌린지(6차, 기간제 공동 목표)**: 그룹원이 자유 참가하는 기간제 이벤트(`RoutineChallenge`). 랭킹보드가 "항상 켜져 있는 비교"라면 챌린지는 "이번엔 이걸 걸고 겨루자"는 일회성 이벤트로 성격이 다르며 병존한다. 자세한 내용은 "그룹 챌린지" 절 참고.
- **루틴 그룹**: 여러 습관을 "아침 루틴"처럼 하나의 컨테이너로 묶는 얇은 레이어(`RoutineGroup`). 습관은 최대 1개 그룹에만 소속되며, 그룹 밖에서도 독립적으로 조회/체크 가능. 체크/스트릭/공유는 전부 개별 습관 단위 그대로 유지 — 그룹은 "오늘 3/5 완료" 같은 진행률 뷰만 제공.

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
- 루틴과 카테고리는 N:M(`RoutineCategoryLink` 조인 테이블) — 한 루틴에 여러 카테고리를 동시에 붙일 수 있음
- 루틴별 카테고리 연결 관리는 전용 엔드포인트로: `POST /routines/:id/categories`(연결 추가), `DELETE /routines/:id/categories/:categoryId`(연결 해제), `GET /routines/:id/categories`(연결 목록 조회)
- 루틴 생성 시 `categoryIds` 배열로 초기 연결 가능. 수정 시 `categoryIds` 배열을 전달하면 전체 교체(빈 배열 `[]` 전달 시 전체 해제), 미전달 시 기존 연결 유지 — 개별 추가/삭제는 위 전용 엔드포인트로 하고, 전체를 한 번에 바꾸고 싶을 때만 `categoryIds`를 사용
- 카테고리 삭제(soft delete)는 해당 카테고리의 조인 행만 제거 — 여러 카테고리가 달린 루틴은 삭제된 카테고리만 빠지고 나머지 카테고리는 그대로 유지(가족 그룹 공유 `Category`와 무관한 순수 개인 소유 태그)

### 사용자 단위 공유 (5차)

1·2차의 `RoutineShare`(습관×가족그룹)는 습관을 하나 추가할 때마다 공유 대상을 매번 지정해야 하고, 공유 상태가 목록에서 보이지 않으며, 랭킹보드가 "공유한 습관 수"에 좌우되는 문제가 있었다. 5차부터 **"그룹을 정하면 전부 공유, 민감한 것만 숨김"** 방식으로 전환했다.

> **개념 구분**: `Routine.groupId`(→ `RoutineGroup`)는 개인 소유 습관 폴더로 이번 변경과 무관하다. 아래의 "가족 그룹"은 `RoutineGroupShare.groupId`(→ `Group`, 구성원이 여러 명인 가족/household 그룹)를 가리키며 이름이 비슷하니 혼동하지 않도록 주의.

- **`RoutineGroupShare`(사용자×가족그룹)**: `GET/PUT /routines/share-groups`로 관리. `GET`은 내 루틴을 공유 중인 가족 그룹 목록(`{groupId, groupName, createdAt}[]`)을 반환. `PUT`은 `{ groupIds: string[] }`로 공유 그룹 목록을 통째로 교체(개별 추가/삭제 API는 없음 — 빈 배열이면 전체 해제, 본인이 속하지 않은 그룹 ID를 넣으면 403). 특정 가족 그룹에 공유를 설정하면 그 사용자의 **모든 습관**이 (비공개로 표시한 것만 빼고) 그룹원에게 보인다.
- **`Routine.isPrivate`**: 습관별로 그룹원에게 숨길지 정하는 단일 플래그(그룹마다 다르게 둘 수 없음 — 어느 그룹에든 동일하게 적용). `POST /routines`/`PATCH /routines/:id`에서 설정 가능, 생략 시 `false`(공개). `isPrivate=true`인 습관은 그룹원 조회(`GET groups/:groupId/members`, `.../members/:userId`)와 랭킹보드 집계에서 완전히 제외된다 — "숨긴 게 있다"는 사실 자체도 노출하지 않음(빈 자리를 남기지 않고 그냥 목록에서 빠짐). 본인이 직접 조회할 때(`GET /routines`, `GET /routines/:id` 등)는 비공개 여부와 무관하게 항상 보인다.
- **본인 대상 집계와는 독립된 축**: `isPrivate`은 본인의 일일 목표 집계(`overview`/`daily-streak`/배지 판정 등)에 전혀 영향을 주지 않는다. 비공개 습관도 `includeInDailyGoal=true`면 본인의 목표 달성 여부에는 그대로 반영된다 — "남에게 안 보일 뿐 내 목표에는 들어간다."
- **접근 차단은 통계 API까지 일관 적용**: 그룹원이 `findRoutineWithAccess`(통계 API들이 공용으로 쓰는 접근 게이트)를 통해 다른 사람의 루틴에 접근할 때, 소유자가 요청자와 같은 가족 그룹을 공유하지 않거나 그 습관이 `isPrivate=true`면 차단(403)된다. `GET /:id/stats/heatmap`, `/:id/stats/streak`, `/:id/stats/rate` 등도 동일하게 적용 — `routineId`를 직접 알고 있어도 비공개 습관을 우회 조회할 수 없다.
- **마이그레이션(5차 배포 시 1회)**: 기존 `RoutineShare` 데이터는 "습관을 1개라도 A그룹에 공유했던 사용자는 A그룹 전체에 `RoutineGroupShare`를 생성"하는 의사 보존 방식으로 전환했다(중복은 자동 제거). 공유 그룹을 해제하면 그 즉시 그룹원에게 안 보이며 과거 기록도 조회 불가(별도 이력 보존 없음).

### 통계
- **달력 히트맵**: 기간 내 체크된 날짜 목록 (최대 1년)
- **스트릭**: `frequencyType`에 따라 계산 방식이 분기됨
  - `DAILY`, `WEEKLY/COUNT_ONLY`: 기존과 동일(주 단위 목표 달성 연속 주 수 + 일 단위 연속 체크일), 응답의 `currentStreakWeeks`/`longestStreakWeeks`에 값이 들어가고 `currentStreakMonths`/`longestStreakMonths`는 `0`
  - `WEEKLY/FIXED_DAYS`: 스케줄된 요일만 평가 대상(비스케줄 요일은 "미스"로 세지 않음), 주 단위 목표는 `targetDays.length`
  - `MONTHLY`: 월 단위 연속 달성 개월 수(신규 `currentStreakMonths`/`longestStreakMonths` 필드에 월-스트릭 값이 담겨 응답됨), 일 단위 스트릭은 매일 스케줄 기준으로 별도 계산, `currentStreakWeeks`/`longestStreakWeeks`는 주 단위 개념이 없어 `0`
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
- **습관별 포함/제외(`includeInDailyGoal`, 2차 도입 → 4차에서 기본값 변경)**: 1차 구현은 "그날 대상 습관 수"를 `isRoutineActiveOnDate`(시작일 이후, 종료일 이전, 일시정지 아님)로만 정의해 반복 주기를 반영하지 못했다(주 3회 습관도 매일 분모에 포함). `Routine.includeInDailyGoal`로 사용자가 습관별로 일일 목표 집계 포함 여부를 직접 정한다. `PATCH /routines/:id`로 개별 변경 가능하며, `frequencyType`이 바뀌어도 `includeInDailyGoal`은 명시적으로 보내지 않는 한 자동으로 재조정되지 않는다. `PATCH /routines/daily-goal-inclusions`(`{ items: [{id, includeInDailyGoal}] }`)로 여러 습관을 한 번에 토글 가능(`PATCH /routines/sort-order`와 동일한 벌크 패턴). `includeInDailyGoal=false`인 습관은 `heatmap[].totalCount`/`goalAchieved`, `goalAchievedDays`/`goalTotalDays`/`goalAchievementRate`, `daily-streak`의 모든 필드 계산에서 제외된다(`dailyGoalMode=ALL`의 "그날 대상 전부"도 "포함 습관 전부"로 재해석). **주의**: 전체 통계 지표인 `totalChecked`/`totalExpected`/`achievementRate`(1차 이전부터 있던 필드)는 이 설정과 무관하게 기존 정의 그대로 모든 습관을 포함해 계산된다 — 일일 목표와 전체 통계는 서로 다른 축의 지표. `dailyGoalCount`가 포함 습관 수보다 커도 서버는 보정하지 않는다(설정값을 임의로 바꾸지 않는다는 원칙).
  - **4차: 기본값을 전부 `true`로 통일**. 2차는 "`frequencyType=DAILY`면 `true`, `WEEKLY`/`MONTHLY`는 `false`"였는데, 목표 모드 기본값(`ALL`)과 겹쳐 습관 대부분이 자동으로 일일 목표 집계에서 빠지는 문제가 있었다(예: 습관 8개 중 DAILY 1개뿐인 사용자는 목표가 자동으로 `1/1`이 되어 기능이 무의미해짐). `POST /routines`에서 `includeInDailyGoal`을 생략하면 `frequencyType`과 무관하게 항상 `true`. 이 변경은 프론트의 목표 개수 기본값 완화(80%→60%)와 세트로 적용된 것을 전제로 한다 — 포함만 늘리고 목표가 100%(`ALL` 모드)면 2차에서 우려했던 상황(주 N회 습관이 남은 날에 미체크로 남아 달성 불가)이 재현된다. 기존 데이터도 마이그레이션으로 `includeInDailyGoal=false`인 습관을 전부 `true`로 일괄 전환했다(출시 전이라 사용자가 설정 화면에서 직접 끈 것과 2차 기본값으로 자동으로 꺼진 것을 구분하지 않음 — 변경 이력을 추적하지 않기 때문).

### 배지 (3차부터 일일 목표 기준, 유저 단위)
1·2차의 습관 개별 배지(`STREAK_DAYS`/`STREAK_WEEKS`/`TOTAL_CHECKS`)는 습관 수에 비례해 배지가 쏟아지고 습관을 종료하면 맥락이 사라지는 문제가 있어, 3차부터 **일일 목표 달성 여부(유저 전체 단위)** 기준으로 완전히 교체했다. 배지는 "나의 성취", 습관별 연속 기록은 통계(`GET /:id/stats/streak`)가 담당하도록 역할을 분리했다. 출시 전(실사용자 데이터 없음)이라 기존 배지 카탈로그/획득 이력은 마이그레이션으로 전량 삭제 후 재시드했다.

- 체크(`POST /routines/:id/check`) 성공 직후 `RoutineBadgeService.evaluateAndAward(userId)`가 동기적으로 판정, 응답의 `newlyEarnedBadges`에 신규 획득 배지 포함. **판정 트리거는 체크 시점만**(`PATCH routines/settings`, `PATCH routines/daily-goal-inclusions`는 트리거하지 않음).
- 판정 데이터는 `GET routines/stats/daily-streak`와 동일한 계산(`computeDailyGoalStatus` + `computeDailyGoalAchievementSummary`, `src/routine/utils/routine-stats.util.ts`)을 재사용 — `includeInDailyGoal=false`인 습관은 판정에서도 자동 제외됨(2차 규칙 그대로 상속).
- 판정 기준 3종:
  - `GOAL_STREAK_DAYS`: 일일 목표 연속 달성 일수. 오늘 미달성이어도 어제까지의 연속을 유지(자정이 지나야 끊김), 대상 습관 0개인 날은 건너뜀.
  - `GOAL_TOTAL_DAYS`: 일일 목표 누적 달성 일수. `RoutineSettingHistory` 최초 생성일(일일 목표 기능 도입 시점)부터만 집계 — 그 이전은 소급하지 않음.
  - `GOAL_PERFECT_WEEK`: 월~일 7일 **전부**가 목표 달성인 주의 누적 횟수. 집계 대상 일수가 7일 미만인 주(도입 시점이 주 중간이거나 진행 중인 이번 주, 대상 습관 0개인 날이 낀 주)는 완벽한 주로 치지 않는다.
  - 카탈로그 12종 시드값은 아래 참고
- **판정 범위는 항상 전체 재계산**: `POST /check`가 과거 날짜(`date` 파라미터)를 체크해도, 체크된 날짜와 무관하게 `[RoutineSettingHistory 최초 생성일, 오늘]` 전체를 매번 다시 계산해서 판정한다 — 과거 누락분을 오늘 백필해서 지난 스트릭/완벽한 주가 뒤늦게 성립해도 정확히 반영됨.
- `RoutineSettingHistory`가 아예 없는 사용자(일일 목표 설정을 한 번도 변경한 적 없음)는 배지 판정 자체를 스킵(`[]` 반환, 체크는 정상 처리).
- 배지는 **유저당 배지 1개를 단 한 번만** 획득(`UserRoutineBadge`의 유니크 제약이 `(userId, badgeId)`) — 습관 단위였던 1·2차와 달리 `routineId` 컬럼 자체가 없음. `UserRoutineBadgeDto`에도 `routineId`/`routineTitle` 필드가 없다(루틴 무관). 이에 따라 `GET /routines/:id/badges`(루틴별 배지 조회) 엔드포인트는 3차에서 삭제됨.
- 배지 평가 실패는 체크 자체를 막지 않음(에러 격리), 체크 취소 시에도 이미 획득한 배지는 회수하지 않음
- 배지 획득 시 알림 자동 발송(`notifyBadgeEarned`, fire-and-forget)

### 루틴 그룹
- 여러 습관을 하나의 컨테이너(`RoutineGroup`)로 묶어 "아침 루틴"처럼 관리. 습관은 최대 1개 그룹에만 소속(선택적 FK), 그룹 밖에서도 독립 조회/체크 가능
- 그룹 CRUD + 순서 일괄 변경 (`/routines/routine-groups/*`)
- 그룹 목록/상세 조회 시 오늘 기준 진행률(`todayProgress: { checked, total }`) 포함 — 그룹 내 활성 습관 대비 오늘 체크 완료 수
- 그룹 삭제는 soft delete, 소속 습관은 삭제되지 않고 `groupId`만 `null`로 해제(습관 자체와 `RoutineLog` 이력은 그대로 유지)
- 습관 생성/수정 시 `routineGroupId`로 소속 지정/변경 가능, 수정 시 `null` 전달로 소속 해제 가능
- 체크/체크취소/배지/스트릭/공유는 전부 기존 개별 루틴 로직 그대로 — 그룹은 진행률 집계 뷰만 추가하는 얇은 레이어(1차는 그룹 단위 배지/스트릭/랭킹보드 없음)

### 그룹 랭킹보드 (5차부터 일일 목표 기준)
- `GET /routines/groups/:groupId/leaderboard?period=week|month&metric=goalAchievementRate|goalStreakDays`
- 집계 대상은 해당 가족 그룹에 공유 중인(`RoutineGroupShare`) 사용자들, `isPrivate=false`인 습관만 포함. 아직 일일 목표 개념을 도입한 적 없는 사용자(`RoutineSettingHistory` 없음)는 랭킹에서 제외.
- 응답에 `goalAchievedDays`(기간 내 목표 달성일 수)/`goalTotalDays`(집계 대상일 수)/`goalAchievementRate`(달성률 %)/`currentStreakDays`(현재 연속 달성일 수)를 항상 함께 포함(정렬 기준만 `metric`으로 결정). `currentStreakDays`는 기간(period)과 무관하게 오늘 기준 전체 스트릭.
- 계산은 `computeDailyGoalStatus`/`computeDailyGoalAchievementSummary`(`routine-stats.util.ts`, 유저 단위 순수 함수)를 그룹원별로 순차 호출해 얻음 — 4차 이전에는 "공유한 습관 수"에 좌우되던 `checkCount`/`achievementRate` 기준이었으나, 5차부터 습관 개수가 달라도 공정하게 비교되는 일일 목표 기준으로 전환.

### 그룹 챌린지 (6차: 기간제 공동 목표)

랭킹보드가 "항상 켜져 있는 비교"라면, 챌린지는 그룹원이 기간과 목표 횟수를 걸고 "이번엔 이걸 하자"고 겨루는 일회성 이벤트(`RoutineChallenge`). 랭킹보드와 별개로 병존한다.

- **자유 참가**: 초대 절차 없이 그룹 멤버 누구나 목록에서 보고 `POST /routines/challenges/:id/join`으로 참가. 참가 시 자신의 습관 중 하나를 연결해야 하며, 각 참가자가 서로 다른 습관으로 참가해도 무방(예: 아버지는 "아침 운동", 아들은 "헬스장 가기").
- **목표는 횟수만**: 챌린지 기간(`startDate`~`endDate`) 내 연결한 습관을 `targetCount`회 이상 체크하면 달성. `checkedCount`는 참가 시점과 무관하게 챌린지 시작일부터 전체 기간을 집계 — 중간에 참가해도 그 이전 기록이 그대로 반영되어 늦게 참가했다고 불리하지 않다.
- **비공개 습관은 연결 불가**: `isPrivate=true`인 습관으로 참가 시도 시 400. 본인 소유가 아닌 습관으로 참가 시도 시 403. "함께 겨룬다"는 취지에 맞지 않기 때문.
- **`status`는 저장하지 않고 계산**: `UPCOMING`/`ONGOING`/`ENDED`를 매 응답마다 `startDate`/`endDate`와 오늘(KST) 날짜로 계산(`computeChallengeStatus`, `routine-challenge.util.ts`). 상태 전환용 배치가 필요 없다. 종료일 당일까지는 `ONGOING`. 이미 `ENDED`인 챌린지에는 참가 불가(400).
- **만든 사람이 자동 참가되지는 않음**: 챌린지를 만든 뒤에도 별도로 `join`을 호출해 자신의 습관을 골라야 한다(생성 시점엔 어떤 습관으로 참가할지 알 수 없으므로).
- **재참가 시 습관 교체(upsert)**: 이미 참가 중인 상태에서 다시 `join`을 호출하면 409로 막지 않고 연결된 습관만 교체한다(`@@unique([challengeId, userId])` 기준 upsert) — 잘못 연결했거나 습관을 바꾸고 싶은 경우를 자연스럽게 지원.
- **수정/삭제는 만든 사람만**: `PATCH`/`DELETE /routines/challenges/:id`는 `createdBy === 요청자`가 아니면 403.
- **습관을 종료해도 참가 기록은 유지**: `RoutineService.end()`는 `deletedAt`만 설정하는 soft delete라 FK cascade가 발동하지 않으므로, 참가자가 습관을 종료해도 `RoutineChallengeParticipant` 행은 그대로 남고 그 시점까지의 체크 기록은 유효하게 집계된다.
- **엔드포인트**: `GET/POST /routines/groups/:groupId/challenges`(목록/생성), `GET/PATCH/DELETE /routines/challenges/:id`(상세/수정/삭제), `POST/DELETE /routines/challenges/:id/join`(참가/취소).

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
  isPrivate     Boolean              @default(false) // 5차: true면 공유 그룹의 다른 멤버에게 완전히 숨김
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
  deletedAt     DateTime?

  user          User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  group         RoutineGroup?         @relation(fields: [groupId], references: [id], onDelete: SetNull)
  logs          RoutineLog[]
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

// 루틴 ↔ 카테고리 (N:M 조인 테이블)
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

// 사용자 ↔ 가족그룹 공유 (5차, User×Group. Routine.groupId가 가리키는 RoutineGroup과는 다른 모델)
model RoutineGroupShare {
  id      String @id @default(uuid())
  userId  String
  groupId String

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, groupId])
  @@index([groupId])
  @@map("routine_group_shares")
}

// 그룹 챌린지 (기간제 공동 목표, 6차). status는 저장하지 않고 startDate/endDate + 오늘 날짜로 계산
model RoutineChallenge {
  id          String   @id @default(uuid())
  groupId     String
  createdBy   String

  title       String   @db.VarChar(50)
  description String?  @db.VarChar(200)

  startDate   DateTime @db.Date
  endDate     DateTime @db.Date

  targetCount Int      // 기간 내 목표 체크 횟수

  reward      String?  @db.VarChar(100)  // 내기·벌칙 자유 텍스트

  group        Group                          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator      User                           @relation("RoutineChallengeCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  participants RoutineChallengeParticipant[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([groupId])
  @@map("routine_challenges")
}

model RoutineChallengeParticipant {
  id          String @id @default(uuid())
  challengeId String
  userId      String
  routineId   String   // 연결한 자신의 습관. isPrivate=true는 연결 불가

  challenge RoutineChallenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  routine   Routine          @relation(fields: [routineId], references: [id], onDelete: Cascade)

  joinedAt DateTime @default(now())

  @@unique([challengeId, userId])
  @@index([challengeId])
  @@map("routine_challenge_participants")
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
  id       String   @id @default(uuid())
  userId   String
  badgeId  String
  earnedAt DateTime @default(now())

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge RoutineBadge @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@unique([userId, badgeId])
  @@index([userId])
  @@index([badgeId])
  @@map("user_routine_badges")
}

enum BadgeCriteriaType {
  GOAL_STREAK_DAYS
  GOAL_TOTAL_DAYS
  GOAL_PERFECT_WEEK
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

`Routine`에는 선택적 FK `groupId String?` + `group RoutineGroup? @relation(..., onDelete: SetNull)`가 추가되어 있음 — 그룹 삭제 시 소속 습관은 유지되고 `groupId`만 `null`로 해제됨. `RoutineGroupShare.groupId`(가족 `Group` 참조)와 필드명이 겹치지만 참조 모델이 달라 문제없고, DTO/컨트롤러 레벨에서는 `routineGroupId`로 구분해 혼동을 방지함.

### 배지 카탈로그 (12종 시드, 3차 이후)

| code | criteriaType | criteriaValue | title | iconEmoji |
|---|---|---|---|---|
| GOAL_STREAK_3 | GOAL_STREAK_DAYS | 3 | 3일 연속 달성 | 🌱 |
| GOAL_STREAK_7 | GOAL_STREAK_DAYS | 7 | 7일 연속 달성 | 🔥 |
| GOAL_STREAK_14 | GOAL_STREAK_DAYS | 14 | 2주 연속 달성 | 🔥 |
| GOAL_STREAK_30 | GOAL_STREAK_DAYS | 30 | 30일 연속 달성 | 🔥🔥 |
| GOAL_STREAK_100 | GOAL_STREAK_DAYS | 100 | 100일 연속 달성 | 🔥🔥🔥 |
| GOAL_TOTAL_10 | GOAL_TOTAL_DAYS | 10 | 누적 10일 달성 | ⭐ |
| GOAL_TOTAL_50 | GOAL_TOTAL_DAYS | 50 | 누적 50일 달성 | ⭐⭐ |
| GOAL_TOTAL_100 | GOAL_TOTAL_DAYS | 100 | 누적 100일 달성 | ⭐⭐⭐ |
| GOAL_TOTAL_365 | GOAL_TOTAL_DAYS | 365 | 누적 365일 달성 | 👑 |
| GOAL_PERFECT_WEEK_1 | GOAL_PERFECT_WEEK | 1 | 완벽한 한 주 | 🏆 |
| GOAL_PERFECT_WEEK_4 | GOAL_PERFECT_WEEK | 4 | 완벽한 4주 | 🏆🏆 |
| GOAL_PERFECT_WEEK_12 | GOAL_PERFECT_WEEK | 12 | 완벽한 12주 | 🏆🏆🏆 |

시드 스크립트: `scripts/seed-routine-badges.ts` (`code` 기준 upsert, 재실행해도 안전)

---

## 구현 상태

### ✅ 완료
- [x] 루틴 CRUD (생성, 목록, 상세, 수정, 삭제)
- [x] 순서 일괄 변경
- [x] 체크/체크취소 (하루 1건, 미래 날짜 차단)
- [x] 사용자 단위 공유 설정 조회/전체교체 (5차, `RoutineGroupShare`)
- [x] 그룹원 루틴 조회 (멤버별 목록, 특정 멤버 상세, 비공개 습관 제외)
- [x] 통계: 달력 히트맵
- [x] 통계: 스트릭 (주 단위 + 일 단위 병행)
- [x] 통계: 기간별 달성률 (week/month/custom)
- [x] 대시보드 위젯용 요약 API
- [x] 배지 시스템 (카탈로그 12종, 체크 시 동기 판정, 체크 응답에 신규 획득 포함)
- [x] 그룹 랭킹보드 (5차: 일일 목표 달성률/연속일수 기준 순위)
- [x] 알림/리마인더 (일일 미체크 리마인드, 배지 획득 알림, 주간 요약)
- [x] 루틴 그룹 (`RoutineGroup`) — 여러 습관 묶음 관리, 진행률 조회, 개별 습관 소속 지정/해제
- [x] 반복 주기 재설계 — `DAILY`/`WEEKLY`(COUNT_ONLY/FIXED_DAYS)/`MONTHLY` 전 종류 실제 구현 및 스트릭/달성률 연동
- [x] 기록 타입 (`BOOLEAN`/`TEXT`/`TIME`/`NUMERIC`) — 루틴 생성 시 고정, 체크 시 타입별 값 검증
- [x] 상태 관리 (`ACTIVE`/`PAUSED`/`ENDED`) — 일시정지 이력(`RoutinePause`) 기반 스트릭 유지
- [x] 루틴 카테고리 (`RoutineCategory`) — 개인 커스텀 태그, CRUD
- [x] 루틴-카테고리 N:M 연결 (`RoutineCategoryLink`) — 한 루틴에 여러 카테고리 태그, 추가/해제/전체교체 지원
- [x] 중요도/메모/시간대 분류 필드 추가
- [x] 그룹 챌린지 (6차) — 기간제 공동 목표, 자유 참가, 습관별 체크 횟수 집계, 만든 사람만 수정/삭제

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
| PATCH  | `/routines/daily-goal-inclusions` | 일일 목표 포함 여부 일괄 변경 | JWT        |
| GET    | `/routines/share-groups` | 내 루틴을 공유 중인 가족 그룹 목록 | JWT   |
| PUT    | `/routines/share-groups` | 공유 그룹 목록 전체 교체      | JWT        |

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

### 그룹 공유 (5차: 사용자 단위 + `isPrivate`)

| Method | Endpoint                                | 설명                       | 권한       |
| ------ | ---------------------------------------- | -------------------------- | ---------- |
| GET    | `/routines/groups/:groupId/members`      | 그룹원별 공유 루틴(비공개 제외) + 현황 | JWT, Member |
| GET    | `/routines/groups/:groupId/members/:userId` | 특정 그룹원 공유 루틴 상세(공유 안 했으면 빈 배열) | JWT, Member |
| GET    | `/routines/groups/:groupId/leaderboard?period=&metric=` | 그룹 랭킹보드 (일일 목표 기준) | JWT, Member |

> 사용자 단위 공유 자체는 `GET/PUT /routines/share-groups`(위 "루틴 기본" 표 참고)로 관리하고, 습관별 노출 여부는 `POST/PATCH`의 `isPrivate` 필드로 정한다.

### 그룹 챌린지 (6차: 기간제 공동 목표)

| Method | Endpoint                                | 설명                                     | 권한        |
| ------ | ---------------------------------------- | ---------------------------------------- | ----------- |
| GET    | `/routines/groups/:groupId/challenges`   | 그룹 챌린지 목록                          | JWT, Member |
| POST   | `/routines/groups/:groupId/challenges`   | 챌린지 생성 (만든 사람 자동 참가 안 됨)   | JWT, Member |
| GET    | `/routines/challenges/:id`               | 챌린지 상세 (참가자별 진행률 포함)        | JWT, Member |
| PATCH  | `/routines/challenges/:id`               | 챌린지 수정                               | JWT, Creator |
| DELETE | `/routines/challenges/:id`               | 챌린지 삭제                               | JWT, Creator |
| POST   | `/routines/challenges/:id/join`          | 참가 (재참가 시 연결 습관 교체)           | JWT, Member |
| DELETE | `/routines/challenges/:id/join`          | 참가 취소                                 | JWT, Member |

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
    update-routine-group-shares.dto.ts — { groupIds: string[] } (5차, 공유 그룹 전체교체용)
    create-routine-challenge.dto.ts   — title/description/startDate/endDate/targetCount/reward (6차)
    update-routine-challenge.dto.ts   — PartialType(CreateRoutineChallengeDto) (6차)
    join-routine-challenge.dto.ts     — { routineId } (6차, 참가용)
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
    routine-response.dto.ts          — RoutineDto(+memo/importance/timeFilter/categoryIds/recordType/status/weeklyMode/targetDays/checkedLog/isPrivate), RoutineCheckedLogDto(조회 기준일 기록값), RoutineLogDto(+textValue/numericValue/timeValue), RoutineGroupShareDto(5차), RoutineCategoryLinkDto, RoutineMemberSummaryDto
    routine-group-response.dto.ts    — RoutineGroupDto(+todayProgress), RoutineGroupDetailDto(+routines)
    routine-category-response.dto.ts — RoutineCategoryDto, RoutineCategoryDetailDto(+routines)
    routine-stats-response.dto.ts    — HeatmapResponseDto, StreakResponseDto, RateResponseDto, RoutineSummaryDto
    routine-challenge-response.dto.ts — RoutineChallengeStatus(로컬 enum), RoutineChallengeDto, RoutineChallengeDetailDto(+participants), RoutineChallengeParticipantDto (6차)
  enums/
    index.ts                        — RoutineFrequencyType, RoutineWeeklyMode, RoutineImportance, RoutineTimeFilter, RoutineRecordType, RoutineStatus, BadgeCriteriaType re-export
  utils/
    routine-stats.util.ts            — 주/월 단위 스트릭·달성률 순수 함수, 일시정지 구간 인지 day-streak, FIXED_DAYS 스케줄 판정
    routine-challenge.util.ts        — computeChallengeStatus, computeAchieved (6차, 순수 함수)
  routine.controller.ts
  routine.service.ts                 — CRUD(isPrivate 포함), pause/resume/end, 체크/체크취소(배지 판정 연동, 기록타입 검증), 사용자 단위 공유 관리(getShareGroups/updateShareGroups), 그룹원 조회(findGroupMembers/findGroupMemberDetail, 비공개 필터링), findRoutineWithAccess(사용자 단위 공유 + isPrivate 게이트), 카테고리 연결 관리(addCategory/removeCategory/findCategories)
  routine-group.service.ts           — 루틴 그룹 CRUD, 오늘 진행률 계산
  routine-category.service.ts        — 루틴 카테고리 CRUD (개인 커스텀 태그, 루틴과의 연결 자체는 routine.service.ts가 담당)
  routine-stats.service.ts           — 히트맵/스트릭/달성률/요약 (frequencyType별 분기, 일시정지 구간 반영)
  routine-badge.service.ts           — 배지 카탈로그 조회, evaluateAndAward(userId) (일일 목표 달성 현황 기반 유저 단위 판정)
  routine-leaderboard.service.ts     — 그룹 랭킹보드 집계 (5차: 그룹원별 일일 목표 순차 계산)
  routine-challenge.service.ts       — 그룹 챌린지 CRUD/참가/취소, 챌린지 단위(groupBy) + 목록 단위(개별 count) 진행률 집계 (6차)
  routine-reminder.scheduler.ts      — 일일 리마인더 + 주간 요약 크론 (status/FIXED_DAYS/MONTHLY 인지)
  routine.module.ts

src/common/utils/
  date-kst.util.ts                   — todayInKst(), thisMonthStartInKst(), parseDateOnly() (KST 기준 날짜 계산, 프로젝트 공용)
```

**Last Updated**: 2026-08-24
