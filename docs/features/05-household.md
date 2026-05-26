# 05. 가계부 관리 (Household Management)

> **상태**: ✅ 완료
> **Phase**: Phase 4

---

## 개요

가족 단위 가계부를 작성하고 지출을 카테고리별로 분류하여 통계를 제공하는 시스템입니다.

---

## 주요 기능

### 가계부 작성
- 일일 거래 내역 입력 (날짜, 유형, 금액, 카테고리, 메모, 결제 수단)
- 거래 유형: 입금(INCOME), 지출(EXPENSE)
- 카테고리: 교통비, 식비, 장보기, 여가비, 생활비, 의료비, 교육비, 용돈, 경조사비, 자산이동, 육아비, 통신비, 기타

### 고정비용 관리
- 매달/매년 고정 금액 등록 (월세, 관리비, 보험료, 구독 서비스)
- 자동 반복 설정

### 데이터 분석
- 카테고리별 지출 통계 (표/차트)
- 월별/연별 비교 분석 (입금, 지출, 순수지)
- 예산 설정 및 예산 대비 지출 현황

---

## 데이터베이스

```prisma
model Expense {
  id                String           @id @default(uuid())
  groupId           String?
  userId            String
  type              TransactionType  @default(EXPENSE)
  amount            Decimal          @db.Decimal(10, 2)
  category          ExpenseCategory?
  date              DateTime         @db.Date
  description       String?          @db.VarChar(200)
  paymentMethod     PaymentMethod?
  isRecurring       Boolean          @default(false)
  shoppingHistoryId String?          @unique
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  group           Group?           @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  receipts        ExpenseReceipt[]
  shoppingHistory ShoppingHistory? @relation(fields: [shoppingHistoryId], references: [id])

  @@index([groupId, date(sort: Desc)])
  @@index([userId, date(sort: Desc)])
  @@index([category])
  @@index([date(sort: Desc)])
  @@index([type])
  @@map("expenses")
}

model ExpenseReceipt {
  id        String   @id @default(uuid())
  expenseId String
  fileKey   String   @db.VarChar(500)
  fileUrl   String   @db.VarChar(500)
  fileName  String   @db.VarChar(255)
  fileSize  Int
  mimeType  String   @db.VarChar(100)
  createdAt DateTime @default(now())

  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  @@index([expenseId])
  @@map("expense_receipts")
}

// 카테고리별 예산 (그룹/개인 공용, groupId/userId nullable)
model Budget {
  id        String          @id @default(uuid())
  groupId   String?
  userId    String?
  category  ExpenseCategory
  amount    Decimal         @db.Decimal(10, 2)
  month     DateTime        @db.Date
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  group     Group?          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User?           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId, category, month])
  @@index([groupId, month])
  @@index([userId, month])
  @@map("budgets")
}

// 카테고리별 예산 자동 적용 템플릿
model BudgetTemplate {
  id        String          @id @default(uuid())
  groupId   String?
  userId    String?
  category  ExpenseCategory
  amount    Decimal         @db.Decimal(10, 2)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  group     Group?          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User?           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId, category])
  @@index([groupId])
  @@index([userId])
  @@map("budget_templates")
}

// 그룹/개인 전체 예산 (카테고리 구분 없음)
model GroupBudget {
  id        String   @id @default(uuid())
  groupId   String?
  userId    String?
  amount    Decimal  @db.Decimal(10, 2)
  month     DateTime @db.Date
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  group     Group?   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId, month])
  @@index([groupId, month])
  @@index([userId, month])
  @@map("group_budgets")
}

// 그룹/개인 전체 예산 자동 적용 템플릿
model GroupBudgetTemplate {
  id        String   @id @default(uuid())
  groupId   String?  @unique
  userId    String?  @unique
  amount    Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  group     Group?   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("group_budget_templates")
}

enum TransactionType {
  INCOME
  EXPENSE
}

enum ExpenseCategory {
  TRANSPORTATION
  FOOD
  GROCERIES
  LEISURE
  LIVING
  MEDICAL
  EDUCATION
  ALLOWANCE
  CELEBRATION
  ASSET_TRANSFER
  CHILDCARE
  COMMUNICATION   // 통신비
  OTHER
}

enum PaymentMethod {
  CARD
  CASH
  TRANSFER
}
```

---

## 구현 상태

### ✅ 완료
- [x] 지출 CRUD (등록, 조회, 수정, 삭제)
- [x] 카테고리별 지출 분류 (교통비, 식비, 통신비 등)
- [x] 결제 수단 관리 (카드, 현금, 계좌이체)
- [x] 고정비용 플래그 (`isRecurring`)
- [x] 고정비용 자동 복사 스케줄러 (매일 00:05, 날짜 clamp + 중복 방지)
- [x] 월별 지출 통계 (카테고리별 합계, 건수)
- [x] 연별 지출 통계 (월별 합계, `GET /household/statistics/yearly`)
- [x] 예산 일괄 설정 및 관리 (카테고리별, bulk upsert)
- [x] 예산 대비 지출 현황 (`budgetRatio`)
- [x] 예산 초과 알림 (지출 등록 시 그룹 멤버 전체에게 FCM 푸시)
- [x] 예산 템플릿 관리 (카테고리별, 그룹/개인 공용, bulk upsert)
- [x] 전체 예산(GroupBudget) 관리 (카테고리 구분 없는 월별 총예산)
- [x] 전체 예산 템플릿(GroupBudgetTemplate) 관리
- [x] 지출 필터링 (월, 카테고리, 결제수단)
- [x] 영수증 첨부 기능 (R2 Presigned PUT URL → DB 등록 → 삭제)
- [x] 장보기 연동: `shoppingHistoryId`로 `ShoppingHistory`와 1:1 연결

---

## API 엔드포인트

### 지출
| Method | Endpoint                                        | 설명                                  | 권한              |
| ------ | ----------------------------------------------- | ------------------------------------- | ----------------- |
| POST   | `/household/expenses`                           | 지출 등록                             | JWT, Group Member |
| GET    | `/household/expenses`                           | 지출 목록 (월/카테고리/결제수단 필터) | JWT, Group Member |
| GET    | `/household/expenses/:id`                       | 지출 상세                             | JWT, Group Member |
| PATCH  | `/household/expenses/:id`                       | 지출 수정                             | JWT, Owner        |
| DELETE | `/household/expenses/:id`                       | 지출 삭제                             | JWT, Owner        |

### 고정비용
> 매일 00:05 스케줄러가 자동 실행 — 별도 API 없음
> - 이전 달 `isRecurring=true` 지출을 이번 달로 복사
> - 날짜 clamp: 이번 달에 없는 날짜(31일 등)는 말일로 자동 조정
> - 중복 방지: 동일 `(groupId, userId, amount, category, date)` 존재 시 skip

### 영수증
| Method | Endpoint                                             | 설명                              | 권한       |
| ------ | ---------------------------------------------------- | --------------------------------- | ---------- |
| GET    | `/household/expenses/:id/receipts/upload-url`        | 영수증 Presigned PUT URL 발급     | JWT, Owner |
| POST   | `/household/expenses/:id/receipts/confirm`           | 영수증 업로드 완료 확인 (DB 등록) | JWT, Owner |
| DELETE | `/household/expenses/:id/receipts/:receiptId`        | 영수증 삭제                       | JWT, Owner |

### 통계
| Method | Endpoint                        | 설명                        | 권한              |
| ------ | ------------------------------- | --------------------------- | ----------------- |
| GET    | `/household/statistics`         | 월별 통계 (카테고리별)      | JWT, Group Member |
| GET    | `/household/statistics/yearly`  | 연별 통계 (월별 합계)       | JWT, Group Member |

### 카테고리별 예산
| Method | Endpoint                              | 설명                           | 권한              |
| ------ | ------------------------------------- | ------------------------------ | ----------------- |
| POST   | `/household/budgets/bulk`             | 예산 일괄 설정 (카테고리별)    | JWT, Group Member |
| GET    | `/household/budgets`                  | 예산 목록 조회                 | JWT, Group Member |

### 카테고리별 예산 템플릿
| Method | Endpoint                                    | 설명                            | 권한              |
| ------ | ------------------------------------------- | ------------------------------- | ----------------- |
| POST   | `/household/budget-templates/bulk`          | 예산 템플릿 일괄 설정           | JWT, Group Member |
| GET    | `/household/budget-templates`               | 예산 템플릿 목록 (groupId 생략 시 개인) | JWT, Group Member |
| DELETE | `/household/budget-templates/:category`     | 예산 템플릿 삭제                | JWT, Group Member |

### 전체 예산 (GroupBudget)
| Method | Endpoint                        | 설명                                  | 권한              |
| ------ | ------------------------------- | ------------------------------------- | ----------------- |
| GET    | `/household/group-budgets`      | 전체 예산 조회 (월별, groupId 생략 시 개인) | JWT, Group Member |

### 전체 예산 템플릿 (GroupBudgetTemplate)
| Method | Endpoint                          | 설명                                     | 권한              |
| ------ | --------------------------------- | ---------------------------------------- | ----------------- |
| GET    | `/household/group-budget-templates`   | 전체 예산 템플릿 조회 (groupId 생략 시 개인) | JWT, Group Member |
| DELETE | `/household/group-budget-templates`   | 전체 예산 템플릿 삭제 (groupId 생략 시 개인) | JWT, Group Member |

> **참고**: 전체 예산(`GroupBudget`) upsert는 `POST /household/budgets/bulk`에 `total` 필드로 함께 처리.
> 전체 예산 템플릿(`GroupBudgetTemplate`) upsert는 `POST /household/budget-templates/bulk`에 `total` 필드로 함께 처리.

---

## 영수증 업로드 플로우

1. `GET /household/expenses/:id/receipts/upload-url?mimeType=image/jpeg` → `uploadUrl`, `fileKey` 수신
2. 클라이언트가 `uploadUrl`로 `PUT` 요청하여 파일 직접 업로드
3. `POST /household/expenses/:id/receipts/confirm` → `fileKey`, `fileName`, `fileSize`, `mimeType` 전송 → DB 등록

---

## 예산 구조

예산은 카테고리별(Budget)과 전체(GroupBudget) 두 레이어로 구성됩니다.

- **카테고리별 예산(Budget)**: 식비, 교통비 등 카테고리 단위 예산. `bulk` API로 여러 카테고리를 한 번에 upsert
- **전체 예산(GroupBudget)**: 카테고리 구분 없는 월별 총예산. `budgets/bulk` body의 `total` 필드로 함께 처리
- **예산 템플릿**: 매달 자동 적용할 기본값 저장. 신규 월 조회 시 템플릿 기반으로 예산 자동 생성 가능
- **그룹/개인 공용**: `groupId`/`userId` 모두 nullable — 그룹 예산(`groupId` 설정) 또는 개인 예산(`userId` 설정)

---

## 장보기 연동

장보기 완료 시 `ShoppingHistory`와 `Expense`가 1:1로 연결됩니다.

- **연결 필드**: `Expense.shoppingHistoryId` (FK, nullable, `@unique`)
- **생성 주체**: `POST /groups/:groupId/cart/complete` 에서 `expense` 필드 포함 시 자동 생성
- **딥링크**: 가계부 지출 목록에서 `shoppingHistoryId`가 있는 항목에 장보기 아이콘 표시 → 클릭 시 `/groups/:groupId/shopping-history/:id` 이동
- **역방향**: 장보기 이력 상세에서 연결된 `expenseId`로 `/household/expenses/:id` 이동 가능

> 상세 구현은 `docs/features/18-fridge.md` 의 가계부 연동 섹션 참고

---

## 구현 파일

```
src/household/
  dto/
    create-expense.dto.ts
    update-expense.dto.ts
    expense-query.dto.ts
    create-budget.dto.ts          — BulkUpsertBudgetDto
    budget-template.dto.ts        — BulkUpsertBudgetTemplateDto
    group-budget.dto.ts           — UpsertGroupBudgetDto, UpsertGroupBudgetTemplateDto
    confirm-receipt.dto.ts
    household-query.dto.ts        — StatisticsQueryDto, YearlyStatisticsQueryDto, BudgetQueryDto, ReceiptUploadQueryDto
    household-response.dto.ts     — ExpenseDto, BudgetDto, BudgetTemplateDto, GroupBudgetDto, GroupBudgetTemplateDto, StatisticsDto, YearlyStatisticsDto, ExpenseReceiptDto, ReceiptUploadUrlDto, BulkBudgetResultDto, BulkBudgetTemplateResultDto
  household.controller.ts
  household.service.ts
  household.scheduler.ts
  household.module.ts
```

**Last Updated**: 2026-05-26
