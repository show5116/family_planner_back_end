# 05. 가계부 관리 (Household Management)

> **상태**: ✅ 완료
> **Phase**: Phase 4

---

## 개요

가족 단위 가계부를 작성하고 지출을 카테고리별로 분류하여 통계를 제공하는 시스템입니다.

---

## 주요 기능

### 가계부 작성
- 일일 지출 내역 입력 (날짜, 금액, 카테고리, 메모, 결제 수단)
- 카테고리: 교통비, 식비, 여가비, 생활비, 의료비, 교육비, 기타

### 고정비용 관리
- 매달/매년 고정 금액 등록 (월세, 관리비, 보험료, 구독 서비스)
- 자동 반복 설정

### 데이터 분석
- 카테고리별 지출 통계 (표/차트)
- 월별/연별 비교 분석
- 예산 설정 및 예산 대비 지출 현황

---

## 데이터베이스

```prisma
model Expense {
  id            String          @id @default(uuid())
  groupId       String
  userId        String
  amount        Decimal         @db.Decimal(10, 2)
  category      ExpenseCategory
  date          DateTime        @db.Date
  description   String?         @db.VarChar(200)
  paymentMethod PaymentMethod?
  isRecurring   Boolean         @default(false)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model Budget {
  id        String          @id @default(uuid())
  groupId   String
  category  ExpenseCategory
  amount    Decimal         @db.Decimal(10, 2)
  month     DateTime        @db.Date
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@unique([groupId, category, month])
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
- [x] 카테고리별 지출 분류 (교통비, 식비, 여가비 등)
- [x] 결제 수단 관리 (카드, 현금, 계좌이체)
- [x] 고정비용 플래그 (`isRecurring`)
- [x] 고정비용 다음 달 복사 (`POST /household/expenses/recurring/copy`)
- [x] 월별 지출 통계 (카테고리별 합계, 건수)
- [x] 연별 지출 통계 (월별 합계, `GET /household/statistics/yearly`)
- [x] 예산 설정 및 관리 (upsert)
- [x] 예산 대비 지출 현황 (`budgetRatio`)
- [x] 예산 초과 알림 (지출 등록 시 그룹 멤버 전체에게 FCM 푸시)
- [x] 지출 필터링 (월, 카테고리, 결제수단)
- [x] 영수증 첨부 기능 (R2 Presigned PUT URL → DB 등록 → 삭제)

---

## API 엔드포인트

### 지출
| Method | Endpoint                                       | 설명                              | 권한              |
| ------ | ---------------------------------------------- | --------------------------------- | ----------------- |
| POST   | `/household/expenses`                          | 지출 등록                         | JWT, Group Member |
| GET    | `/household/expenses`                          | 지출 목록 (월/카테고리/결제수단 필터) | JWT, Group Member |
| GET    | `/household/expenses/:id`                      | 지출 상세                         | JWT, Group Member |
| PATCH  | `/household/expenses/:id`                      | 지출 수정                         | JWT, Owner        |
| DELETE | `/household/expenses/:id`                      | 지출 삭제                         | JWT, Owner        |

### 고정비용
| Method | Endpoint                                       | 설명                              | 권한              |
| ------ | ---------------------------------------------- | --------------------------------- | ----------------- |
| POST   | `/household/expenses/recurring/copy`           | 이전 달 고정비용 → 대상 월 복사  | JWT, Group Member |

### 영수증
| Method | Endpoint                                             | 설명                              | 권한  |
| ------ | ---------------------------------------------------- | --------------------------------- | ----- |
| GET    | `/household/expenses/:id/receipts/upload-url`        | 영수증 Presigned PUT URL 발급     | JWT, Owner |
| POST   | `/household/expenses/:id/receipts/confirm`           | 영수증 업로드 완료 확인 (DB 등록) | JWT, Owner |
| DELETE | `/household/expenses/:id/receipts/:receiptId`        | 영수증 삭제                       | JWT, Owner |

### 통계
| Method | Endpoint                        | 설명                        | 권한              |
| ------ | ------------------------------- | --------------------------- | ----------------- |
| GET    | `/household/statistics`         | 월별 통계 (카테고리별)      | JWT, Group Member |
| GET    | `/household/statistics/yearly`  | 연별 통계 (월별 합계)       | JWT, Group Member |

### 예산
| Method | Endpoint               | 설명                   | 권한              |
| ------ | ---------------------- | ---------------------- | ----------------- |
| POST   | `/household/budgets`   | 예산 설정 (upsert)     | JWT, Group Member |
| GET    | `/household/budgets`   | 예산 목록              | JWT, Group Member |

---

## 영수증 업로드 플로우

1. `GET /household/expenses/:id/receipts/upload-url?mimeType=image/jpeg` → `uploadUrl`, `fileKey` 수신
2. 클라이언트가 `uploadUrl`로 `PUT` 요청하여 파일 직접 업로드
3. `POST /household/expenses/:id/receipts/confirm` → `fileKey`, `fileName`, `fileSize`, `mimeType` 전송 → DB 등록

---

**Last Updated**: 2026-02-27
