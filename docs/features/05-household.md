# 05. 가계부 관리 (Household Management)

> **상태**: ⬜ 시작 안함
> **우선순위**: Low
> **담당 Phase**: Phase 4

---

## 📋 개요

가족 단위 가계부를 작성하고 지출을 카테고리별로 분류하여 통계를 제공하는 시스템입니다.

---

## ⬜ 가계부 작성

### 일일 지출 내역 입력

- 날짜, 금액, 카테고리, 메모 입력
- 결제 수단 (현금, 카드 등)

### 카테고리별 분류

- 교통비
- 식비
- 여가비
- 생활비
- 의료비
- 교육비
- 기타

---

## ⬜ 고정비용 관리

### 고정비 등록

- 매달/매년 나가는 고정 금액 등록
- 자동 반복 설정
- 해당 월 시작 시 자동 계산

### 예시

- 월세, 관리비
- 보험료
- 구독 서비스

---

## ⬜ 데이터 분석

### 통계

- 카테고리별 지출 통계
- 표 및 차트로 시각화
- 월별/연별 비교 분석

### 예산 관리

- 카테고리별 예산 설정
- 예산 대비 지출 현황

---

## 🗄️ 데이터베이스 스키마 (예상)

```prisma
model Expense {
  id          String         @id @default(uuid())
  groupId     String
  userId      String
  amount      Decimal        @db.Decimal(10, 2)
  category    ExpenseCategory
  date        DateTime
  description String?
  paymentMethod String?
  isRecurring Boolean        @default(false)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  group       Group          @relation(fields: [groupId], references: [id])
  user        User           @relation(fields: [userId], references: [id])
}

enum ExpenseCategory {
  TRANSPORTATION
  FOOD
  LEISURE
  LIVING
  MEDICAL
  EDUCATION
  OTHER
}

model Budget {
  id          String         @id @default(uuid())
  groupId     String
  category    ExpenseCategory
  amount      Decimal        @db.Decimal(10, 2)
  month       DateTime
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  group       Group          @relation(fields: [groupId], references: [id])
}
```

---

## 📝 API 엔드포인트 (예상)

| Method | Endpoint                  | 설명      | 권한              |
| ------ | ------------------------- | --------- | ----------------- |
| POST   | `/household/expenses`     | 지출 등록 | JWT, Group Member |
| GET    | `/household/expenses`     | 지출 목록 | JWT, Group Member |
| GET    | `/household/expenses/:id` | 지출 상세 | JWT, Group Member |
| PATCH  | `/household/expenses/:id` | 지출 수정 | JWT, Owner        |
| DELETE | `/household/expenses/:id` | 지출 삭제 | JWT, Owner        |
| GET    | `/household/statistics`   | 통계 조회 | JWT, Group Member |
| POST   | `/household/budgets`      | 예산 설정 | JWT, Admin        |
| GET    | `/household/budgets`      | 예산 목록 | JWT, Group Member |

---

**Last Updated**: 2025-12-04
