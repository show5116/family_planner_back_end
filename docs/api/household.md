# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 가계부

**Base Path:** `/household`

### POST `household/expenses`

**요약:** 지출 등록

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (개인 지출 시 생략) (string?)
  "type": null, // 거래 유형 (기본값: EXPENSE) (TransactionType?)
  "amount": 15000, // 금액 (number)
  "category": null, // 카테고리 (ExpenseCategory?)
  "date": "2026-02-27", // 지출 날짜 (YYYY-MM-DD) (string)
  "description": "점심 식사", // 내용 (string?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "merchantId": "uuid-1234", // 소비처 ID (string?)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때 사용) (IncomeCategory?)
  "refundedExpenseId": "uuid-1234", // 환불 대상 지출 ID (반품/환불 시 원본 지출과 연결) (string?)
  "memberId": "uuid-1234" // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string?)
}
```

**Responses:**

#### 201 - 지출 등록 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때) (IncomeCategory | null)
  "recurringExpenseId": "uuid-1234", // 연결된 고정지출 규칙 ID (스케줄러로 자동 생성된 경우) (string | null)
  "isConfirmed": true, // 실제 금액 확인 여부 (false = 가변 고정지출로 자동 생성된 미확정 항목) (boolean)
  "merchant": null, // 소비처 (MerchantDto | null)
  "refundedExpenseId": "uuid-1234", // 환불 대상 지출 ID (반품/환불 시 원본 지출 ID) (string | null)
  "refunds": [], // 이 지출에 연결된 환불 목록 (ExpenseDto[])
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "shoppingHistoryId": "uuid-1234", // 연결된 장보기 이력 ID (장보기 완료 시 자동 생성된 지출에만 존재) (string | null)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/expenses`

**요약:** 지출 목록 조회

**Query Parameters:**

- `groupId` (`string`) (Optional): 그룹 ID (개인 조회 시 생략)
- `month` (`string`) (Optional): 조회 월 (YYYY-MM)
- `category` (`ExpenseCategoryFilter`) (Optional): 카테고리 필터 (NONE: 카테고리 없는 항목 조회)
- `paymentMethod` (`PaymentMethod`) (Optional): 결제 수단 필터
- `type` (`TransactionType`) (Optional): 거래 유형 필터 (생략 시 전체 조회)
- `merchantId` (`string`) (Optional): 소비처 ID 필터
- `incomeCategory` (`IncomeCategory`) (Optional): 입금 카테고리 필터 (type=INCOME 조회 시 사용)

**Responses:**

#### 200 - 지출 목록 조회 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때) (IncomeCategory | null)
  "recurringExpenseId": "uuid-1234", // 연결된 고정지출 규칙 ID (스케줄러로 자동 생성된 경우) (string | null)
  "isConfirmed": true, // 실제 금액 확인 여부 (false = 가변 고정지출로 자동 생성된 미확정 항목) (boolean)
  "merchant": null, // 소비처 (MerchantDto | null)
  "refundedExpenseId": "uuid-1234", // 환불 대상 지출 ID (반품/환불 시 원본 지출 ID) (string | null)
  "refunds": [], // 이 지출에 연결된 환불 목록 (ExpenseDto[])
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "shoppingHistoryId": "uuid-1234", // 연결된 장보기 이력 ID (장보기 완료 시 자동 생성된 지출에만 존재) (string | null)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/expenses/:id`

**요약:** 지출 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 지출 상세 조회 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때) (IncomeCategory | null)
  "recurringExpenseId": "uuid-1234", // 연결된 고정지출 규칙 ID (스케줄러로 자동 생성된 경우) (string | null)
  "isConfirmed": true, // 실제 금액 확인 여부 (false = 가변 고정지출로 자동 생성된 미확정 항목) (boolean)
  "merchant": null, // 소비처 (MerchantDto | null)
  "refundedExpenseId": "uuid-1234", // 환불 대상 지출 ID (반품/환불 시 원본 지출 ID) (string | null)
  "refunds": [], // 이 지출에 연결된 환불 목록 (ExpenseDto[])
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "shoppingHistoryId": "uuid-1234", // 연결된 장보기 이력 ID (장보기 완료 시 자동 생성된 지출에만 존재) (string | null)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `household/expenses/:id`

**요약:** 지출 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "type": null, // 거래 유형 (TransactionType?)
  "amount": 15000, // 금액 (number?)
  "category": null, // 카테고리 (ExpenseCategory?)
  "date": "2026-02-27", // 지출 날짜 (YYYY-MM-DD) (string?)
  "description": "점심 식사", // 내용 (string?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "merchantId": "uuid-1234", // 소비처 ID (null 전달 시 소비처 연결 해제) (string | null?)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때 사용, null 전달 시 해제) (IncomeCategory | null?)
  "isConfirmed": true, // 실제 금액 확인 여부 (가변 고정지출 자동 생성 시 false로 설정됨) (boolean?)
  "refundedExpenseId": "uuid-1234", // 환불 대상 지출 ID (null 전달 시 연결 해제) (string | null?)
  "memberId": "uuid-1234" // 결제 주체 ID (null 전달 시 해제) (string | null?)
}
```

**Responses:**

#### 200 - 지출 수정 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때) (IncomeCategory | null)
  "recurringExpenseId": "uuid-1234", // 연결된 고정지출 규칙 ID (스케줄러로 자동 생성된 경우) (string | null)
  "isConfirmed": true, // 실제 금액 확인 여부 (false = 가변 고정지출로 자동 생성된 미확정 항목) (boolean)
  "merchant": null, // 소비처 (MerchantDto | null)
  "refundedExpenseId": "uuid-1234", // 환불 대상 지출 ID (반품/환불 시 원본 지출 ID) (string | null)
  "refunds": [], // 이 지출에 연결된 환불 목록 (ExpenseDto[])
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "shoppingHistoryId": "uuid-1234", // 연결된 장보기 이력 ID (장보기 완료 시 자동 생성된 지출에만 존재) (string | null)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 수정할 수 있습니다

---

### DELETE `household/expenses/:id`

**요약:** 지출 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 지출 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 삭제할 수 있습니다

---

### GET `household/expenses/:id/receipts/upload-url`

**요약:** 영수증 업로드 Presigned URL 발급

**설명:**
발급된 uploadUrl로 파일을 직접 업로드한 뒤, confirmReceipt API를 호출하세요.

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `mimeType` (`string`): MIME 타입

**Responses:**

#### 200 - 업로드 URL 발급 성공

```json
{
  "uploadUrl": "", // Presigned 업로드 URL (string)
  "fileKey": "" // 파일 키 (업로드 완료 후 confirmReceipt에 사용) (string)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 수정할 수 있습니다

---

### POST `household/expenses/:id/receipts/confirm`

**요약:** 영수증 업로드 완료 확인 (DB 등록)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "fileKey": "receipts/uuid-1234.jpg", // 업로드된 파일 키 (getReceiptUploadUrl 응답의 fileKey) (string)
  "fileName": "receipt.jpg", // 원본 파일명 (string)
  "fileSize": 102400, // 파일 크기 (bytes) (number)
  "mimeType": "image/jpeg" // MIME 타입 (string)
}
```

**Responses:**

#### 201 - 영수증 등록 성공

```json
{
  "id": "uuid-1234", // 영수증 ID (string)
  "expenseId": "uuid-1234", // 지출 ID (string)
  "fileUrl": "https://cdn.example.com/receipts/xxx.jpg", // 파일 URL (string)
  "fileName": "receipt.jpg", // 파일명 (string)
  "fileSize": 102400, // 파일 크기 (bytes) (number)
  "mimeType": "image/jpeg", // MIME 타입 (string)
  "createdAt": "2026-02-27T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 수정할 수 있습니다

---

### DELETE `household/expenses/:id/receipts/:receiptId`

**요약:** 영수증 삭제

**Path Parameters:**

- `id` (`string`)
- `receiptId` (`string`)

**Responses:**

#### 200 - 영수증 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 영수증을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출의 영수증만 삭제할 수 있습니다

---

### GET `household/statistics`

**요약:** 월별 지출 통계 조회

**Query Parameters:**

- `groupId` (`string`) (Optional): 그룹 ID (개인 조회 시 생략)
- `month` (`string`): 조회 월 (YYYY-MM)
- `excludeRefunds` (`boolean`) (Optional): 환불 입금 제외 여부 (환불로 연결된 INCOME 항목 제외)
- `excludeCarryover` (`boolean`) (Optional): 이월 입금 제외 여부 (incomeCategory=CARRYOVER 항목 제외)

**Responses:**

#### 200 - 통계 조회 성공

```json
{
  "month": "2026-02", // 조회 월 (string)
  "totalIncome": "2000000.00", // 총 입금 (string)
  "totalExpense": "350000.00", // 총 지출 (string)
  "balance": "1650000.00", // 순수지 (입금 - 지출) (string)
  "totalBudget": "500000.00", // 총 예산 (string)
  "categories": [
    {
      "category": null, // 카테고리 (ExpenseCategory)
      "total": "120000.00", // 총 지출 (string)
      "count": 8, // 지출 건수 (number)
      "budget": "300000.00", // 예산 (string | null)
      "budgetRatio": 40 // 예산 대비 지출 비율 (%) (number | null)
    }
  ] // 카테고리별 통계 (지출만) (CategoryStatDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/statistics/yearly`

**요약:** 연별 지출 통계 조회 (월별 합계)

**Query Parameters:**

- `groupId` (`string`) (Optional): 그룹 ID (개인 조회 시 생략)
- `year` (`string`): 조회 연도 (YYYY)
- `excludeRefunds` (`boolean`) (Optional): 환불 입금 제외 여부 (환불로 연결된 INCOME 항목 제외)
- `excludeCarryover` (`boolean`) (Optional): 이월 입금 제외 여부 (incomeCategory=CARRYOVER 항목 제외)

**Responses:**

#### 200 - 연별 통계 조회 성공

```json
{
  "year": "2026", // 조회 연도 (string)
  "totalIncome": "24000000.00", // 연간 총 입금 (string)
  "totalExpense": "4200000.00", // 연간 총 지출 (string)
  "balance": "19800000.00", // 연간 순수지 (입금 - 지출) (string)
  "months": [
    {
      "month": "2026-01", // 월 (YYYY-MM) (string)
      "totalIncome": "2000000.00", // 총 입금 (string)
      "totalExpense": "350000.00", // 총 지출 (string)
      "balance": "1650000.00", // 순수지 (입금 - 지출) (string)
      "count": 15 // 지출 건수 (number)
    }
  ] // 월별 통계 목록 (MonthlyTotalDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `household/budgets/bulk`

**요약:** 예산 일괄 설정 (전체 + 카테고리별)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (개인 예산 시 생략) (string?)
  "month": "2026-04", // 예산 월 (YYYY-MM) (string)
  "total": 1500000, // 전체 예산 금액 (number?)
  "categories": [
    {
      "category": null, // 카테고리 (ExpenseCategory)
      "amount": 300000 // 예산 금액 (number)
    }
  ] // 카테고리별 예산 목록 (CategoryBudgetItemDto[]?)
}
```

**Responses:**

#### 201 - 예산 일괄 설정 성공

```json
{
  "total": null, // 전체 예산 설정 결과 (GroupBudgetDto?)
  "categories": [
    {
      "id": "uuid-1234", // 예산 ID (string)
      "groupId": "uuid-1234", // 그룹 ID (string)
      "category": null, // 카테고리 (ExpenseCategory)
      "amount": "300000.00", // 예산 금액 (string)
      "month": "2026-02-01T00:00:00.000Z", // 예산 월 (Date)
      "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
      "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
    }
  ] // 카테고리별 예산 설정 결과 (BudgetDto[]?)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/budgets`

**요약:** 예산 목록 조회

**Query Parameters:**

- `groupId` (`string`) (Optional): 그룹 ID (개인 예산 조회 시 생략)
- `month` (`string`): 조회 월 (YYYY-MM)
- `category` (`ExpenseCategory`) (Optional): 카테고리 필터

**Responses:**

#### 200 - 예산 목록 조회 성공

```json
{
  "id": "uuid-1234", // 예산 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "amount": "300000.00", // 예산 금액 (string)
  "month": "2026-02-01T00:00:00.000Z", // 예산 월 (Date)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `household/budget-templates/bulk`

**요약:** 예산 템플릿 일괄 설정 (전체 + 카테고리별)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (개인 템플릿 시 생략) (string?)
  "total": 1500000, // 전체 예산 템플릿 금액 (number?)
  "categories": [
    {
      "category": null, // 카테고리 (ExpenseCategory)
      "amount": 300000 // 매월 자동 적용할 예산 금액 (number)
    }
  ] // 카테고리별 예산 템플릿 목록 (CategoryTemplateItemDto[]?)
}
```

**Responses:**

#### 201 - 예산 템플릿 일괄 설정 성공

```json
{
  "total": null, // 전체 예산 템플릿 설정 결과 (GroupBudgetTemplateDto?)
  "categories": [
    {
      "id": "uuid-1234", // 템플릿 ID (string)
      "groupId": "uuid-1234", // 그룹 ID (string)
      "category": null, // 카테고리 (ExpenseCategory)
      "amount": "300000.00", // 매월 자동 적용할 예산 금액 (string)
      "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
      "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
    }
  ] // 카테고리별 예산 템플릿 설정 결과 (BudgetTemplateDto[]?)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/budget-templates`

**요약:** 예산 템플릿 목록 조회 (groupId 생략 시 개인 템플릿)

**Query Parameters:**

- `groupId` (`string`) - Optional

**Responses:**

#### 200 - 예산 템플릿 목록 조회 성공

```json
{
  "id": "uuid-1234", // 템플릿 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "amount": "300000.00", // 매월 자동 적용할 예산 금액 (string)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### DELETE `household/budget-templates/:category`

**요약:** 예산 템플릿 삭제 (groupId 생략 시 개인 템플릿)

**Path Parameters:**

- `category` (`string`)

**Query Parameters:**

- `groupId` (`string`) - Optional

**Responses:**

#### 200 - 예산 템플릿 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 예산 템플릿을 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/group-budgets`

**요약:** 전체 예산 조회 (월별, groupId 생략 시 개인)

**Query Parameters:**

- `groupId` (`string | undefined`)
- `month` (`string`)

**Responses:**

#### 200 - 전체 예산 조회 성공

```json
{
  "id": "uuid-1234", // 전체 예산 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "amount": "1500000.00", // 전체 예산 금액 (string)
  "month": "2026-04-01T00:00:00.000Z", // 예산 월 (Date)
  "createdAt": "2026-04-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-04-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/group-budget-templates`

**요약:** 전체 예산 템플릿 조회 (groupId 생략 시 개인)

**Query Parameters:**

- `groupId` (`string`) - Optional

**Responses:**

#### 200 - 전체 예산 템플릿 조회 성공

```json
{
  "id": "uuid-1234", // 템플릿 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "amount": "1500000.00", // 매월 자동 적용할 전체 예산 금액 (string)
  "createdAt": "2026-04-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-04-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### DELETE `household/group-budget-templates`

**요약:** 전체 예산 템플릿 삭제 (groupId 생략 시 개인)

**Query Parameters:**

- `groupId` (`string`) - Optional

**Responses:**

#### 200 - 전체 예산 템플릿 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 전체 예산 템플릿을 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `household/recurring-expenses`

**요약:** 고정지출 등록

**Request Body:**

```json
{
  "groupId": "", // 그룹 ID (개인 지출 시 생략) (string?)
  "type": null, // 거래 유형 (기본값: EXPENSE) (TransactionType?)
  "amount": 150000, // 금액 (number)
  "isVariable": false, // 가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨) (boolean?)
  "category": null, // 카테고리 (ExpenseCategory?)
  "incomeCategory": null, // 입금 카테고리 (type=INCOME 일 때 사용) (IncomeCategory?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "merchantId": "", // 소비처 ID (string?)
  "description": "월세", // 내용 (string?)
  "dayOfMonth": 25, // 매달 발생 일(day). 1~31 (number)
  "memberId": "" // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string?)
}
```

**Responses:**

#### 201 - 고정지출 등록 성공

```json
{
  "id": "uuid-1234", // 고정지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 등록자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": "150000.00", // 기본 금액 (string)
  "isVariable": false, // 가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨) (boolean)
  "category": null, // 카테고리 (ExpenseCategory | null)
  "incomeCategory": null, // 입금 카테고리 (IncomeCategory | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "merchantId": null, // 소비처 ID (string | null)
  "description": "월세", // 내용 (string | null)
  "dayOfMonth": 25, // 매달 발생 일(day). 1~31 (number)
  "isActive": true, // 활성 여부 (boolean)
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "createdAt": "2026-06-08T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-06-08T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/recurring-expenses`

**요약:** 고정지출 목록 조회

**Query Parameters:**

- `groupId` (`string`) (Optional): 그룹 ID (생략 시 개인)
- `includeInactive` (`boolean`) (Optional): 비활성 포함 여부 (기본: 활성만)

**Responses:**

#### 200 - 고정지출 목록 조회 성공

```json
{
  "id": "uuid-1234", // 고정지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 등록자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": "150000.00", // 기본 금액 (string)
  "isVariable": false, // 가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨) (boolean)
  "category": null, // 카테고리 (ExpenseCategory | null)
  "incomeCategory": null, // 입금 카테고리 (IncomeCategory | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "merchantId": null, // 소비처 ID (string | null)
  "description": "월세", // 내용 (string | null)
  "dayOfMonth": 25, // 매달 발생 일(day). 1~31 (number)
  "isActive": true, // 활성 여부 (boolean)
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "createdAt": "2026-06-08T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-06-08T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/recurring-expenses/:id`

**요약:** 고정지출 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 고정지출 상세 조회 성공

```json
{
  "id": "uuid-1234", // 고정지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 등록자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": "150000.00", // 기본 금액 (string)
  "isVariable": false, // 가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨) (boolean)
  "category": null, // 카테고리 (ExpenseCategory | null)
  "incomeCategory": null, // 입금 카테고리 (IncomeCategory | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "merchantId": null, // 소비처 ID (string | null)
  "description": "월세", // 내용 (string | null)
  "dayOfMonth": 25, // 매달 발생 일(day). 1~31 (number)
  "isActive": true, // 활성 여부 (boolean)
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "createdAt": "2026-06-08T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-06-08T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 고정지출을 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `household/recurring-expenses/:id`

**요약:** 고정지출 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 0, // 금액 (number?)
  "isVariable": false, // 가변 여부 (boolean?)
  "category": null, // 카테고리 (ExpenseCategory?)
  "incomeCategory": null, // 입금 카테고리 (null 전달 시 해제) (IncomeCategory | null?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "merchantId": null, // 소비처 ID (null 전달 시 해제) (string | null?)
  "description": "", // 내용 (string?)
  "dayOfMonth": 0, // 매달 발생 일(day). 1~31 (number?)
  "isActive": false, // 활성 여부 (boolean?)
  "memberId": null // 결제 주체 ID (null 전달 시 해제) (string | null?)
}
```

**Responses:**

#### 200 - 고정지출 수정 성공

```json
{
  "id": "uuid-1234", // 고정지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 등록자 ID (string)
  "type": null, // 거래 유형 (TransactionType)
  "amount": "150000.00", // 기본 금액 (string)
  "isVariable": false, // 가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨) (boolean)
  "category": null, // 카테고리 (ExpenseCategory | null)
  "incomeCategory": null, // 입금 카테고리 (IncomeCategory | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "merchantId": null, // 소비처 ID (string | null)
  "description": "월세", // 내용 (string | null)
  "dayOfMonth": 25, // 매달 발생 일(day). 1~31 (number)
  "isActive": true, // 활성 여부 (boolean)
  "memberId": "uuid-1234", // 결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용) (string | null)
  "member": null, // 결제 주체 정보 (ExpenseMemberDto | null)
  "createdAt": "2026-06-08T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-06-08T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 고정지출을 찾을 수 없습니다

#### 403 - 본인이 등록한 고정지출만 수정할 수 있습니다

---

### GET `household/recurring-expenses/:id/history`

**요약:** 고정지출 적용 내역 조회

**설명:**
해당 고정지출에 연결된 지출 목록을 최신순으로 반환합니다. isVariable=true인 경우에는 확정(isConfirmed=true) 금액 기준 평균·합계·최솟값·최댓값도 함께 반환합니다.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 고정지출 적용 내역 조회 성공

```json
{
  "recurringExpenseId": "uuid-1234", // 고정지출 ID (string)
  "isVariable": true, // 가변 여부 (boolean)
  "history": [], // 적용 내역 목록 (최신순) (RecurringExpenseHistoryItemDto[])
  "averageAmount": "152500.00", // 확정 금액 평균 (isVariable=true인 경우에만 존재, 확정 건수 0이면 null) (string | null)
  "totalAmount": "915000.00", // 확정 금액 합계 (isVariable=true인 경우에만 존재) (string | null)
  "minAmount": "130000.00", // 확정 금액 최솟값 (isVariable=true인 경우에만 존재) (string | null)
  "maxAmount": "175000.00" // 확정 금액 최댓값 (isVariable=true인 경우에만 존재) (string | null)
}
```

#### 404 - 고정지출을 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### DELETE `household/recurring-expenses/:id`

**요약:** 고정지출 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 고정지출 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 고정지출을 찾을 수 없습니다

#### 403 - 본인이 등록한 고정지출만 삭제할 수 있습니다

---

### POST `household/merchants`

**요약:** 소비처 등록

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (개인 소비처 시 생략) (string?)
  "name": "쿠팡" // 소비처 이름 (string)
}
```

**Responses:**

#### 201 - 소비처 등록 성공

```json
{
  "id": "uuid-1234", // 소비처 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 작성자 ID (string | null)
  "name": "쿠팡", // 소비처 이름 (string)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/merchants`

**요약:** 소비처 목록 조회 (groupId 생략 시 개인)

**Query Parameters:**

- `groupId` (`string`) (Optional): 그룹 ID (개인 소비처 조회 시 생략)

**Responses:**

#### 200 - 소비처 목록 조회 성공

```json
{
  "id": "uuid-1234", // 소비처 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 작성자 ID (string | null)
  "name": "쿠팡", // 소비처 이름 (string)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `household/merchants/:id`

**요약:** 소비처 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "쿠팡" // 소비처 이름 (string?)
}
```

**Responses:**

#### 200 - 소비처 수정 성공

```json
{
  "id": "uuid-1234", // 소비처 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string | null)
  "userId": "uuid-1234", // 작성자 ID (string | null)
  "name": "쿠팡", // 소비처 이름 (string)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 소비처를 찾을 수 없습니다

#### 403 - 본인이 등록한 소비처만 수정할 수 있습니다

---

### DELETE `household/merchants/:id`

**요약:** 소비처 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 소비처 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 소비처를 찾을 수 없습니다

#### 403 - 본인이 등록한 소비처만 삭제할 수 있습니다

---
