# 16. 적립금 관리 (Savings Management)

> **상태**: ✅ 완료
> **Phase**: Phase 6

---

## 개요

그룹 단위로 금액을 적립하여 특정 목표(여행, 가전 구매 등)나 비상금을 위해 모아가는 시스템입니다.
일반 예산과 달리 잔액이 이월되며, 이벤트 발생 시 적립된 금액을 한 번에 사용합니다.
하나의 그룹에서 여러 적립 목표를 동시에 운영할 수 있습니다. (예: "여름 여행", "비상금", "새 가전 구매")

---

## 주요 기능

### 적립 목표 관리
- 적립 목표 생성 (이름, 목표 금액, 설명)
- 목표 금액 미설정 시 무기한 적립 (비상금 용도)
- 목표 달성 여부 자동 판단 (`currentAmount >= targetAmount`)
- 목표 완료 처리 (수동 종료)
- 그룹당 여러 개의 적립 목표 동시 운영 가능
- **자산 연동 옵션** (`includeInAssets`): 활성화 시 자산 통계(`GET /assets/statistics`)에 잔액 포함

### 자동 적립 (선택)
- 목표 생성 시 `autoDeposit: true` + `monthlyAmount` 설정 시 활성화
- `depositDay` (1~31): 매달 적립 실행 날짜 (기본값 1일)
  - 해당 월에 날짜가 없으면 말일에 실행 (예: 31일 설정 → 2월은 28/29일)
- 스케줄러 매일 실행, `depositDay == 오늘`인 목표만 적립
- 이번 달 이미 적립된 목표는 skip (중복 방지)
- Redis 분산 락으로 중복 실행 방지
- `autoDeposit: false`이면 스케줄러 대상에서 제외 (수동으로만 적립)
- 자동 적립 일시 중지(`PAUSED`) / 재개(`ACTIVE`) 가능

### 적립/출금 내역 관리
- 수동 입금: 자유롭게 금액 추가 적립
- 출금: 적립금 사용 (잔액 초과 출금 불가)
- 내역 타입: `DEPOSIT`(수동 입금) | `WITHDRAW`(출금) | `AUTO_DEPOSIT`(자동 적립)
- 출금 시 설명 필수 (사용 목적 기록)

### 잔액 관리
- `currentAmount`: 누적 입금 - 누적 출금 (실시간 반영)
- 출금 시 잔액 부족이면 `400 Bad Request`

---

## 데이터베이스

```prisma
model SavingsGoal {
  id               String               @id @default(uuid())
  groupId          String
  name             String               @db.VarChar(100)
  description      String?              @db.VarChar(300)
  targetAmount     Decimal?             @db.Decimal(12, 2)   // null = 무기한 적립
  currentAmount    Decimal              @default(0) @db.Decimal(12, 2)
  autoDeposit      Boolean              @default(false)       // 자동 적립 여부
  monthlyAmount    Decimal?             @db.Decimal(12, 2)   // autoDeposit=true일 때 필수
  depositDay       Int                  @default(1)           // 매달 적립일 (1~31), 해당 월 말일 초과 시 말일 처리
  includeInAssets  Boolean              @default(false)       // 자산 통계 포함 여부
  status           SavingsGoalStatus    @default(ACTIVE)
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  transactions  SavingsTransaction[]

  @@index([groupId])
}

model SavingsTransaction {
  id          String              @id @default(uuid())
  goalId      String
  type        SavingsType
  amount      Decimal             @db.Decimal(12, 2)
  description String?             @db.VarChar(200)
  createdAt   DateTime            @default(now())

  goal        SavingsGoal         @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@index([goalId, createdAt])
}

enum SavingsGoalStatus {
  ACTIVE      // 적립 중 (자동/수동 모두 가능)
  PAUSED      // 자동 적립 일시 중지 (수동 입금은 가능)
  COMPLETED   // 목표 달성 또는 수동 완료 (입출금 불가)
}

enum SavingsType {
  DEPOSIT       // 수동 입금
  WITHDRAW      // 출금 (이벤트 사용)
  AUTO_DEPOSIT  // 스케줄러 자동 적립
}
```

> **제약**: `autoDeposit = true`이면 `monthlyAmount` 필수. 미입력 시 `400 Bad Request`.

---

## 구현 상태

### ✅ 완료
- [x] 적립 목표 CRUD
- [x] 자동 적립 스케줄러 (매일 00:10, `depositDay == 오늘`인 목표만 적립)
- [x] `depositDay` 필드 (1~31, 말일 초과 시 말일 처리)
- [x] 스케줄러 중복 방지 (Redis 분산 락 + 이번 달 AUTO_DEPOSIT 트랜잭션 체크)
- [x] 수동 입금 / 출금 API
- [x] 잔액 초과 출금 방지
- [x] 목표 달성 시 자동 `COMPLETED` 전환 + 그룹 멤버 FCM 알림
- [x] 적립 내역 조회 (페이지네이션)
- [x] 목표 달성률 계산 (`currentAmount / targetAmount * 100`, 최대 100%)
- [x] 목표 완료 처리 (수동 종료)
- [x] 자동 적립 일시 중지 / 재개 (`autoDeposit = true`인 목표만)
- [x] 자산 연동 (`includeInAssets`): 자산 통계에 적립금 잔액 포함

---

## API 엔드포인트

### 적립 목표

| Method | Endpoint                | 설명                            | 권한              |
| ------ | ----------------------- | ------------------------------- | ----------------- |
| POST   | `/savings`              | 적립 목표 생성                  | JWT, Group Member |
| GET    | `/savings`              | 적립 목표 목록 (`groupId` 필터) | JWT, Group Member |
| GET    | `/savings/:id`          | 적립 목표 상세 + 잔액           | JWT, Group Member |
| PATCH  | `/savings/:id`          | 적립 목표 수정                  | JWT, Group Member |
| DELETE | `/savings/:id`          | 적립 목표 삭제                  | JWT, Group Member |
| POST   | `/savings/:id/complete` | 목표 완료 처리 (수동 종료)      | JWT, Group Member |
| POST   | `/savings/:id/pause`    | 자동 적립 일시 중지             | JWT, Group Member |
| POST   | `/savings/:id/resume`   | 자동 적립 재개                  | JWT, Group Member |

### 적립/출금 내역

| Method | Endpoint                    | 설명                     | 권한              |
| ------ | --------------------------- | ------------------------ | ----------------- |
| POST   | `/savings/:id/deposit`      | 수동 입금                | JWT, Group Member |
| POST   | `/savings/:id/withdraw`     | 출금 (이벤트 사용)       | JWT, Group Member |
| GET    | `/savings/:id/transactions` | 내역 목록 (페이지네이션) | JWT, Group Member |

---

## 주요 플로우

### 적립 목표 생성
- `autoDeposit: false` (기본): `monthlyAmount` 불필요, 수동 입금만 사용
- `autoDeposit: true`: `monthlyAmount` + `depositDay` 설정, 매달 지정일 자동 적립 활성화
- `includeInAssets: true`: 자산 통계 조회 시 `currentAmount`가 `savingsTotal`에 합산됨

### 자동 적립 플로우 (스케줄러)
1. 매일 00:10 스케줄러 실행 (Redis 분산 락으로 중복 방지)
2. 오늘 날짜(`todayDay`)와 이번 달 말일(`lastDay`) 계산
3. `autoDeposit = true && status = ACTIVE`인 목표 중 아래 조건에 해당하는 것 조회:
   - `depositDay == todayDay` (정확히 오늘이 적립일)
   - 오늘이 말일(`todayDay == lastDay`)이면 `depositDay > lastDay`인 목표도 포함 (예: 31일 설정 → 2월 말일에 실행)
4. 이번 달 이미 `AUTO_DEPOSIT` 트랜잭션이 있는 목표는 skip (중복 방지)
5. 각 목표에 `monthlyAmount`만큼 `AUTO_DEPOSIT` 트랜잭션 생성
6. `currentAmount += monthlyAmount` 업데이트
7. `targetAmount`가 있고 `currentAmount >= targetAmount`이면 `status = COMPLETED` + 달성 알림 발송

### 출금 플로우
1. `POST /savings/:id/withdraw` 호출 (`amount`, `description` 필수)
2. `status = COMPLETED`이면 `400 Bad Request` ("완료된 적립 목표입니다")
3. `currentAmount < amount`이면 `400 Bad Request` ("잔액이 부족합니다")
4. `WITHDRAW` 트랜잭션 생성 + `currentAmount -= amount` 업데이트

### pause / resume
- `pause`: `status = PAUSED` 전환 → 스케줄러 대상 제외 (수동 입금은 여전히 가능)
- `resume`: `status = ACTIVE` 전환 → 다음 달부터 자동 적립 재개
- `autoDeposit = false`인 목표에 pause/resume 호출 시 `400 Bad Request`

### 자산 연동 (`includeInAssets`)
- `includeInAssets = true`인 목표의 `currentAmount`를 `GET /assets/statistics` 응답에 포함
- 기존 계좌 잔액(`totalBalance`)과 **별도 항목**(`savingsTotal`)으로 표시 (이중 계산 방지)
- `savingsGoals` 배열에 목표별 이름 + 잔액 상세 포함

---

**Last Updated**: 2026-04-01 (depositDay 구현 완료, 자산 연동 완료)
