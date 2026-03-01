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
  "groupId": "uuid-1234", // 그룹 ID (string)
  "amount": 15000, // 금액 (number)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27", // 지출 날짜 (YYYY-MM-DD) (string)
  "description": "점심 식사", // 내용 (string?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "isRecurring": false // 고정 지출 여부 (boolean?)
}
```

**Responses:**

#### 201 - 지출 등록 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/expenses`

**요약:** 지출 목록 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID
- `month` (`string`) (Optional): 조회 월 (YYYY-MM)
- `category` (`ExpenseCategory`) (Optional): 카테고리 필터
- `paymentMethod` (`PaymentMethod`) (Optional): 결제 수단 필터

**Responses:**

#### 200 - 지출 목록 조회 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
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
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
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
  "amount": 15000, // 금액 (number?)
  "category": null, // 카테고리 (ExpenseCategory?)
  "date": "2026-02-27", // 지출 날짜 (YYYY-MM-DD) (string?)
  "description": "점심 식사", // 내용 (string?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "isRecurring": false // 고정 지출 여부 (boolean?)
}
```

**Responses:**

#### 200 - 지출 수정 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
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

- `query` (`ReceiptUploadQueryDto`)

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

### POST `household/expenses/recurring/copy`

**요약:** 고정비용 다음 달 복사

**설명:**
이전 달의 isRecurring=true 지출을 targetMonth로 복사합니다.

**Query Parameters:**

- `query` (`RecurringCopyQueryDto`)

**Responses:**

#### 201 - 고정비용 복사 성공

```json
{
  "count": 3, // 복사된 지출 건수 (number)
  "expenses": [
    {
      "id": "uuid-1234", // 지출 ID (string)
      "groupId": "uuid-1234", // 그룹 ID (string)
      "userId": "uuid-1234", // 작성자 ID (string)
      "amount": 15000, // 금액 (string)
      "category": null, // 카테고리 (ExpenseCategory)
      "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
      "description": "점심 식사", // 내용 (string | null)
      "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
      "isRecurring": false, // 고정 지출 여부 (boolean)
      "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
      "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
    }
  ] // 복사된 지출 목록 (ExpenseDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/statistics`

**요약:** 월별 지출 통계 조회

**Query Parameters:**

- `query` (`StatisticsQueryDto`)

**Responses:**

#### 200 - 통계 조회 성공

```json
{
  "month": "2026-02", // 조회 월 (string)
  "totalExpense": "350000.00", // 총 지출 (string)
  "totalBudget": "500000.00", // 총 예산 (string)
  "categories": [
    {
      "category": null, // 카테고리 (ExpenseCategory)
      "total": "120000.00", // 총 지출 (string)
      "count": 8, // 지출 건수 (number)
      "budget": "300000.00", // 예산 (string | null)
      "budgetRatio": 40 // 예산 대비 지출 비율 (%) (number | null)
    }
  ] // 카테고리별 통계 (CategoryStatDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/statistics/yearly`

**요약:** 연별 지출 통계 조회 (월별 합계)

**Query Parameters:**

- `query` (`YearlyStatisticsQueryDto`)

**Responses:**

#### 200 - 연별 통계 조회 성공

```json
{
  "year": "2026", // 조회 연도 (string)
  "totalExpense": "4200000.00", // 연간 총 지출 (string)
  "months": [
    {
      "month": "2026-01", // 월 (YYYY-MM) (string)
      "total": "350000.00", // 총 지출 (string)
      "count": 15 // 지출 건수 (number)
    }
  ] // 월별 지출 목록 (MonthlyTotalDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `household/budgets`

**요약:** 예산 설정 (없으면 생성, 있으면 수정)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "amount": 300000, // 예산 금액 (number)
  "month": "2026-02" // 예산 월 (YYYY-MM) (string)
}
```

**Responses:**

#### 201 - 예산 설정 성공

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

### GET `household/budgets`

**요약:** 예산 목록 조회

**Query Parameters:**

- `query` (`BudgetQueryDto`)

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
