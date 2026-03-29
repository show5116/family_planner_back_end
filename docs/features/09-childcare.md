# 09. 육아 포인트 (Childcare Points)

> **상태**: 🟡 구현 중
> **Phase**: Phase 5

---

## 개요

부모-자녀 역할 기반으로 포인트를 관리하고 적금 기능을 제공하는 시스템입니다.

자녀는 앱 계정 없이 프로필로만 등록되며, 부모가 대신 관리합니다.
자녀가 성장해서 앱을 직접 사용하고 싶을 때 기존 계정과 연동할 수 있습니다.

---

## 핵심 설계 원칙

- **자녀 프로필 ≠ 앱 계정**: 2살 아기도 등록 가능, 앱 가입 불필요
- **프로필 생성 시 포인트 계정 자동 생성**: 별도 계정 생성 API 없음
- **월 포인트 할당은 별개 기능**: 자녀 등록 후 별도로 설정
- **용돈 설정 히스토리 보존**: 변경 이력 조회 가능

---

## 주요 기능

### 자녀 프로필
- 이름, 생년월일만으로 등록 (앱 계정 불필요)
- 프로필 등록 시 포인트 계정 자동 생성
- 나중에 자녀가 앱 가입 시 계정 연동 가능

### 월 포인트 할당 (용돈 협상)
- 월 지급 포인트, 지급일 설정
- 포인트 : 원 비율 설정 (아이와의 약속을 명확히 하기 위한 표시용)
- 다음 연봉 협상일 설정
- 변경 시 이전 설정 히스토리 자동 보존

### 포인트 상점 (Shop)
- 부모가 편집 가능
- 아이가 포인트를 소비해서 구매하는 항목
- 예: TV 30분 더보기 → 10 포인트, 장난감 10,000원 → 100 포인트
- 수동 순서 정렬 지원 (reorder)

### 육아 포인트 Rule (규칙)
- 부모가 편집 가능
- 행동 기준에 따라 포인트 지급 또는 차감, 또는 메모로만 등록
- `PLUS`: 잘한 행동 → 포인트 지급 (예: 방 정리하기 → +10 포인트)
- `MINUS`: 못한 행동 → 포인트 차감 (예: 숙제 안함 → -20 포인트)
- `INFO`: 메모성 규칙 → 포인트 없음 (예: 취침 시간은 9시)
- 수동 순서 정렬 지원 (reorder)

### 적금 플랜
- 자녀 1명당 1개의 ACTIVE 플랜
- 부모가 월 적금액, 이자율, 단리/복리, 시작일/만기일 설정
- 용돈 지급일마다 설정된 월 적금액만큼 자동 차감 (SAVINGS_DEPOSIT)
- 만기일에 스케줄러가 원금 + 이자를 자동으로 잔액에 합산
- 중도 해지 가능 (이자 없이 원금만 반환)
- 생성 전 예상 이자 미리보기 제공 (참고용 국고채 3년물 금리 포함)

### 포인트 거래 내역
- 포인트 적립/사용/차감 내역
- 날짜별, 카테고리별 필터링
- 3가지 방식으로 거래 생성 가능:
  1. `shopItemId` 지정 → PURCHASE 자동 적용
  2. `ruleId` 지정 → REWARD(PLUS) / PENALTY(MINUS) 자동 적용
  3. `type`, `amount`, `description` 직접 입력

### 거래 타입
| 타입 | 설명 | 잔액 변화 |
| --- | --- | --- |
| `ALLOWANCE` | 월 포인트 자동 지급 (스케줄러) | + |
| `REWARD` | PLUS 규칙 보상 | + |
| `BONUS` | 규칙과 별개로 부모가 직접 지급하는 보너스 | + |
| `PENALTY` | MINUS 규칙 위반 차감 | - |
| `PURCHASE` | 상점 아이템 구매 | - |
| `CASHOUT` | 포인트 현금화 | - |
| `SAVINGS_DEPOSIT` | 적금 입금 (용돈 지급 시 자동 차감) | - (balance) / + (savingsBalance) |
| `SAVINGS_WITHDRAW` | 적금 만기/해지 수령 | + (balance) / - (savingsBalance) |
| `INTEREST` | 적금 만기 이자 지급 | + (savingsBalance) |

### 적금 플랜
- 자녀 1명당 1개의 ACTIVE 플랜
- 용돈 지급일마다 `monthlyAmount`만큼 자동 차감 (SAVINGS_DEPOSIT)
- 만기일에 스케줄러가 자동으로 원금 + 이자를 잔액에 합산 (MATURED)
- 중도 해지 가능 (이자 없이 원금만 반환, CANCELLED)
- 단리(SIMPLE) / 복리(COMPOUND) 선택 가능
- 생성 전 예상 이자 미리보기 제공 (참고용 국고채 3년물 금리 포함)

---

## 데이터베이스

```prisma
model Child {
  id           String    @id @default(uuid())
  groupId      String
  parentUserId String
  name         String    @db.VarChar(50)
  birthDate    DateTime  @db.Date
  userId       String?   // 앱 계정 연동 시 설정
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  account       ChildcareAccount?
  allowancePlan ChildAllowancePlan?
}

model ChildcareAccount {
  id             String   @id @default(uuid())
  groupId        String
  childId        String   @unique  // 자녀당 1개
  parentUserId   String
  balance        Int      @default(0)
  savingsBalance Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  child        Child
  transactions ChildcareTransaction[]
  shopItems    ChildcareShopItem[]
  rules        ChildcareRule[]
  savingsPlan  ChildcareSavingsPlan?
}

model ChildAllowancePlan {
  id                  String    @id @default(uuid())
  childId             String    @unique  // 자녀당 1개
  monthlyPoints       Int
  payDay              Int       // 1~31
  pointToMoneyRatio   Int       // 1포인트 = N원 (표시용)
  nextNegotiationDate DateTime? @db.Date
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  histories ChildAllowancePlanHistory[]
}

model ChildAllowancePlanHistory {
  id                  String    @id @default(uuid())
  planId              String
  monthlyPoints       Int
  payDay              Int
  pointToMoneyRatio   Int
  nextNegotiationDate DateTime? @db.Date
  changedAt           DateTime  @default(now())
}

model ChildcareTransaction {
  id          String                   @id @default(uuid())
  accountId   String
  type        ChildcareTransactionType
  amount      Int
  description String                   @db.VarChar(200)
  createdBy   String
  createdAt   DateTime                 @default(now())
}

enum ChildcareTransactionType {
  ALLOWANCE        // 월 용돈 지급 (스케줄러 자동)
  REWARD           // PLUS 규칙 보상
  BONUS            // 규칙 외 부모 직접 보너스 지급
  PENALTY          // MINUS 규칙 위반 차감
  PURCHASE         // 상점 아이템 구매
  CASHOUT          // 포인트 현금화
  SAVINGS_DEPOSIT  // 적금 입금
  SAVINGS_WITHDRAW // 적금 만기/해지 수령
  INTEREST         // 적금 이자 지급
}

model ChildcareShopItem {
  id          String   @id @default(uuid())
  accountId   String
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(200)
  points      Int      // 구매에 필요한 포인트
  isActive    Boolean  @default(true)
  order       Int      @default(0)  // 수동 정렬 순서
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ChildcareRule {
  id          String            @id @default(uuid())
  accountId   String
  name        String            @db.VarChar(100)
  description String?           @db.VarChar(200)
  type        ChildcareRuleType // PLUS: 지급, MINUS: 차감, INFO: 메모
  points      Int?              // INFO 타입일 경우 null
  isActive    Boolean           @default(true)
  order       Int               @default(0)  // 수동 정렬 순서
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

enum ChildcareRuleType {
  PLUS   // 잘한 행동 → 포인트 지급
  MINUS  // 못한 행동 → 포인트 차감
  INFO   // 메모성 규칙 → 포인트 없음
}

model ChildcareSavingsPlan {
  id            String               @id @default(uuid())
  accountId     String               @unique  // 자녀당 1개
  monthlyAmount Int                  // 월 자동 적금액 (포인트)
  interestRate  Decimal              @db.Decimal(5, 2)  // 연 이자율 (%)
  interestType  SavingsInterestType  // SIMPLE: 단리, COMPOUND: 복리
  startDate     DateTime             @db.Date
  endDate       DateTime             @db.Date
  status        SavingsPlanStatus    @default(ACTIVE)
  maturedAt     DateTime?
  cancelledAt   DateTime?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
}

enum SavingsInterestType {
  SIMPLE    // 단리
  COMPOUND  // 복리
}

enum SavingsPlanStatus {
  ACTIVE    // 진행 중
  MATURED   // 만기 처리 완료
  CANCELLED // 중도 해지
}
```

---

## 구현 상태

### ✅ 완료
- [x] 자녀 프로필 등록 (포인트 계정 자동 생성)
- [x] 자녀 프로필 목록 조회
- [x] 자녀 프로필 ↔ 앱 계정 연동
- [x] 포인트 계정 목록/상세 조회
- [x] 월 포인트 할당 설정 (생성/수정)
- [x] 월 포인트 할당 조회
- [x] 월 포인트 할당 변경 히스토리 조회
- [x] 포인트 거래 추가 (shopItemId / ruleId / 직접 입력)
- [x] 포인트 거래 내역 조회 (날짜별, 타입별 필터)
- [x] 포인트 상점 아이템 CRUD + 수동 순서 정렬
- [x] 규칙 CRUD (PLUS/MINUS/INFO 타입) + 수동 순서 정렬
- [x] 거래 타입: ALLOWANCE / REWARD / BONUS / PENALTY / PURCHASE / CASHOUT / SAVINGS_DEPOSIT / SAVINGS_WITHDRAW / INTEREST
- [x] 적금 플랜 생성 / 조회 / 중도 해지
- [x] 적금 플랜 예상 이자 미리보기 (국고채 3년물 금리 참조)
- [x] 용돈 자동 지급 스케줄러 (매일 00:00 UTC)
- [x] 적금 자동 차감 (용돈 지급 시 SAVINGS_DEPOSIT)
- [x] 적금 만기 자동 정산 스케줄러 (매일 00:00 UTC)
- [x] 연봉 협상일 알림 스케줄러 (당일/전날)
- [x] 거래 시 자녀/부모 앱 알림

### ⬜ TODO / 향후 고려
- [ ] 포인트 통계 (월별, 카테고리별)

---

## API 엔드포인트

### 자녀 프로필

| Method | Endpoint                            | 설명             | 권한              |
| ------ | ----------------------------------- | ---------------- | ----------------- |
| POST   | `/childcare/children`               | 자녀 프로필 등록 | JWT, Group Member |
| GET    | `/childcare/children`               | 자녀 프로필 목록 | JWT, Group Member |
| POST   | `/childcare/children/:id/link-user` | 앱 계정 연동     | JWT, Parent       |

### 월 포인트 할당

| Method | Endpoint                                         | 설명                  | 권한                 |
| ------ | ------------------------------------------------ | --------------------- | -------------------- |
| POST   | `/childcare/children/:id/allowance-plan`         | 할당 설정 (생성/수정) | JWT, Parent          |
| GET    | `/childcare/children/:id/allowance-plan`         | 할당 설정 조회        | JWT, Parent or Child |
| GET    | `/childcare/children/:id/allowance-plan/history` | 변경 히스토리         | JWT, Parent or Child |

### 포인트 계정

| Method | Endpoint                  | 설명       | 권한                 |
| ------ | ------------------------- | ---------- | -------------------- |
| GET    | `/childcare/accounts`     | 계정 목록  | JWT, Group Member    |
| GET    | `/childcare/accounts/:id` | 계정 상세  | JWT, Parent or Child |

### 거래 내역

| Method | Endpoint                               | 설명      | 권한                 |
| ------ | -------------------------------------- | --------- | -------------------- |
| POST   | `/childcare/accounts/:id/transactions` | 거래 추가 | JWT, Parent          |
| GET    | `/childcare/accounts/:id/transactions` | 거래 내역 | JWT, Parent or Child |

### 포인트 상점

| Method | Endpoint                                       | 설명              | 권한                 |
| ------ | ---------------------------------------------- | ----------------- | -------------------- |
| GET    | `/childcare/accounts/:id/shop-items`           | 상점 목록         | JWT, Parent or Child |
| POST   | `/childcare/accounts/:id/shop-items`           | 아이템 추가       | JWT, Parent          |
| PATCH  | `/childcare/accounts/:id/shop-items/reorder`   | 순서 변경         | JWT, Parent          |
| PATCH  | `/childcare/accounts/:id/shop-items/:itemId`   | 아이템 수정       | JWT, Parent          |
| DELETE | `/childcare/accounts/:id/shop-items/:itemId`   | 아이템 삭제       | JWT, Parent          |

### 규칙

| Method | Endpoint                                | 설명      | 권한                 |
| ------ | --------------------------------------- | --------- | -------------------- |
| GET    | `/childcare/accounts/:id/rules`         | 규칙 목록 | JWT, Parent or Child |
| POST   | `/childcare/accounts/:id/rules`         | 규칙 추가 | JWT, Parent          |
| PATCH  | `/childcare/accounts/:id/rules/reorder` | 순서 변경 | JWT, Parent          |
| PATCH  | `/childcare/accounts/:id/rules/:ruleId` | 규칙 수정 | JWT, Parent          |
| DELETE | `/childcare/accounts/:id/rules/:ruleId` | 규칙 삭제 | JWT, Parent          |

### 적금 플랜

| Method | Endpoint                                          | 설명                              | 권한                 |
| ------ | ------------------------------------------------- | --------------------------------- | -------------------- |
| POST   | `/childcare/accounts/:id/savings/plan/preview`    | 예상 이자 미리보기                | JWT, Parent          |
| POST   | `/childcare/accounts/:id/savings/plan`            | 적금 플랜 생성                    | JWT, Parent          |
| GET    | `/childcare/accounts/:id/savings/plan`            | 적금 플랜 조회                    | JWT, Parent or Child |
| DELETE | `/childcare/accounts/:id/savings/plan`            | 중도 해지 (원금만 반환)           | JWT, Parent          |

---

**Last Updated**: 2026-03-29
