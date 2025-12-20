# 09. 육아 포인트 (Childcare Points)

> **상태**: ⬜ 시작 안함
> **우선순위**: Low
> **담당 Phase**: Phase 5

---

## 📋 개요

부모-자녀 역할 기반으로 포인트를 관리하고 적금 기능을 제공하는 시스템입니다.

---

## ⬜ 육아 포인트

### 포인트 지급

- 매달 정해진 금액의 포인트 지급
- 포인트 지급액은 부모가 설정
- 자동 지급 스케줄

### 적금 기능

- 아이가 매달 포인트 적금
- 적금 시 이자 지급
- 목표 금액 설정
- 만기일 설정

---

## ⬜ 육아 포인트 표

### 포인트 사용 항목

- 부모가 편집 가능
- 항목별 포인트 금액 설정

### 예시

- TV 30분 더보기 → 10 포인트
- 장난감 10,000원어치 사기 → 100 포인트
- 게임 1시간 → 20 포인트
- 간식 사먹기 → 5 포인트

---

## ⬜ 육아 포인트 Rule

### 규칙 관리

- 부모가 편집 가능
- 규칙 위반 시 포인트 차감
- 차감 포인트 설정

### 예시

- 방 정리 안함 → -10 포인트
- 숙제 안함 → -20 포인트
- 형제 싸움 → -15 포인트

---

## ⬜ History

### 포인트 내역

- 포인트 적립/사용 내역
- 계좌 이력처럼 조회 가능
- 날짜별 필터링
- 카테고리별 필터링 (적립/사용/차감)

---

## 🗄️ 데이터베이스 스키마 (예상)

```prisma
model ChildcareAccount {
  id              String   @id @default(uuid())
  groupId         String
  childUserId     String
  parentUserId    String
  balance         Int      @default(0)
  monthlyAllowance Int
  savingsBalance  Int      @default(0)
  savingsInterestRate Decimal @db.Decimal(5, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  group           Group    @relation(fields: [groupId], references: [id])
  child           User     @relation("Child", fields: [childUserId], references: [id])
  parent          User     @relation("Parent", fields: [parentUserId], references: [id])
  transactions    ChildcareTransaction[]
  rewards         ChildcareReward[]
  rules           ChildcareRule[]
}

model ChildcareTransaction {
  id          String                  @id @default(uuid())
  accountId   String
  type        ChildcareTransactionType
  amount      Int
  description String
  createdBy   String
  createdAt   DateTime                @default(now())

  account     ChildcareAccount        @relation(fields: [accountId], references: [id])
  creator     User                    @relation(fields: [createdBy], references: [id])
}

enum ChildcareTransactionType {
  ALLOWANCE
  REWARD
  PENALTY
  PURCHASE
  SAVINGS_DEPOSIT
  SAVINGS_WITHDRAW
  INTEREST
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

  account     ChildcareAccount @relation(fields: [accountId], references: [id])
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

  account     ChildcareAccount @relation(fields: [accountId], references: [id])
}
```

---

## 📝 API 엔드포인트 (예상)

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
