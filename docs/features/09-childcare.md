# 09. 육아 포인트 (Childcare Points)

> **상태**: ⬜ 시작 안함
> **Phase**: Phase 5

---

## 개요

부모-자녀 역할 기반으로 포인트를 관리하고 적금 기능을 제공하는 시스템입니다.

---

## 주요 기능

### 육아 포인트
- 매달 정해진 금액의 포인트 지급 (부모가 설정, 자동 지급 스케줄)
- 적금 기능: 매달 포인트 적금, 이자 지급, 목표 금액 및 만기일 설정

### 육아 포인트 표
- 부모가 편집 가능
- 항목별 포인트 금액 설정
- 예: TV 30분 더보기 → 10 포인트, 장난감 10,000원 → 100 포인트

### 육아 포인트 Rule
- 부모가 편집 가능
- 규칙 위반 시 포인트 차감
- 예: 방 정리 안함 → -10 포인트, 숙제 안함 → -20 포인트

### History
- 포인트 적립/사용 내역
- 날짜별, 카테고리별 필터링 (적립/사용/차감)

---

## 데이터베이스 (예상)

```prisma
model ChildcareAccount {
  id                  String   @id @default(uuid())
  groupId             String
  childUserId         String
  parentUserId        String
  balance             Int      @default(0)
  monthlyAllowance    Int
  savingsBalance      Int      @default(0)
  savingsInterestRate Decimal  @db.Decimal(5, 2)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  transactions        ChildcareTransaction[]
  rewards             ChildcareReward[]
  rules               ChildcareRule[]
}

model ChildcareTransaction {
  id          String                  @id @default(uuid())
  accountId   String
  type        ChildcareTransactionType
  amount      Int
  description String
  createdBy   String
  createdAt   DateTime                @default(now())
}

enum ChildcareTransactionType {
  ALLOWANCE, REWARD, PENALTY, PURCHASE,
  SAVINGS_DEPOSIT, SAVINGS_WITHDRAW, INTEREST
}

model ChildcareReward {
  id          String   @id @default(uuid())
  accountId   String
  name        String
  description String?
  points      Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ChildcareRule {
  id          String   @id @default(uuid())
  accountId   String
  name        String
  description String?
  penalty     Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 구현 상태

### ⬜ TODO / 향후 고려
- [ ] 육아 계정 CRUD (생성, 조회, 수정)
- [ ] 포인트 잔액 관리
- [ ] 월별 포인트 자동 지급 스케줄러
- [ ] 적금 기능 (입금, 출금, 이자 계산)
- [ ] 적금 목표 설정 (목표 금액, 만기일)
- [ ] 거래 내역 CRUD (적립, 사용, 차감)
- [ ] 거래 내역 조회 (날짜별, 카테고리별 필터링)
- [ ] 보상 항목 관리 (TV 시청, 장난감 구매 등)
- [ ] 규칙 관리 (방 정리 안함, 숙제 안함 등)
- [ ] 보상/규칙 활성화/비활성화
- [ ] 포인트 통계 (월별, 카테고리별)
- [ ] 부모-자녀 역할 검증
- [ ] 거래 알림 (포인트 적립, 사용, 차감)

---

## API 엔드포인트 (예상)

| Method | Endpoint                                    | 설명           | 권한                 |
| ------ | ------------------------------------------- | -------------- | -------------------- |
| POST   | `/childcare/accounts`                       | 육아 계정 생성 | JWT, Parent          |
| GET    | `/childcare/accounts`                       | 계정 목록      | JWT, Group Member    |
| GET    | `/childcare/accounts/:id`                   | 계정 상세      | JWT, Parent or Child |
| PATCH  | `/childcare/accounts/:id`                   | 계정 설정 수정 | JWT, Parent          |
| POST   | `/childcare/accounts/:id/transactions`      | 거래 추가      | JWT, Parent          |
| GET    | `/childcare/accounts/:id/transactions`      | 거래 내역      | JWT, Parent or Child |
| POST   | `/childcare/accounts/:id/rewards`           | 보상 항목 추가 | JWT, Parent          |
| PATCH  | `/childcare/accounts/:id/rewards/:rewardId` | 보상 항목 수정 | JWT, Parent          |
| DELETE | `/childcare/accounts/:id/rewards/:rewardId` | 보상 항목 삭제 | JWT, Parent          |
| POST   | `/childcare/accounts/:id/rules`             | 규칙 추가      | JWT, Parent          |
| PATCH  | `/childcare/accounts/:id/rules/:ruleId`     | 규칙 수정      | JWT, Parent          |
| DELETE | `/childcare/accounts/:id/rules/:ruleId`     | 규칙 삭제      | JWT, Parent          |
| POST   | `/childcare/accounts/:id/savings/deposit`   | 적금 입금      | JWT, Child or Parent |
| POST   | `/childcare/accounts/:id/savings/withdraw`  | 적금 출금      | JWT, Parent          |

---

**Last Updated**: 2025-12-04
