# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 스마트 장보기

**Base Path:** `/shopping`

### GET `shopping/cart`

**요약:** 활성 장바구니 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 장바구니 조회 성공

```json
{
  "id": "uuid-cart", // string
  "groupId": "uuid-group", // string
  "items": [
    {
      "id": "uuid-1234", // string
      "cartId": "uuid-cart", // string
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string | null
      "price": 3500, // number | null
      "isChecked": false, // boolean
      "memo": "1+1 행사", // string | null
      "createdAt": "2025-01-01T00:00:00Z" // Date
    }
  ], // CartItemDto[]
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### POST `shopping/cart/items`

**요약:** 장바구니 품목 추가

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string?
  "price": 3500, // number?
  "memo": "1+1 행사" // string?
}
```

**Responses:**

#### 201 - 품목 추가 성공

```json
{
  "id": "uuid-1234", // string
  "cartId": "uuid-cart", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "price": 3500, // number | null
  "isChecked": false, // boolean
  "memo": "1+1 행사", // string | null
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### POST `shopping/cart/items/bulk`

**요약:** 장바구니 품목 일괄 추가

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "items": [
    {
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string?
      "price": 3500, // number?
      "memo": "1+1 행사" // string?
    }
  ] // CartItemEntryDto[]
}
```

**Responses:**

#### 200 - 품목 일괄 추가 성공

```json
{
  "id": "uuid-1234", // string
  "cartId": "uuid-cart", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "price": 3500, // number | null
  "isChecked": false, // boolean
  "memo": "1+1 행사", // string | null
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `shopping/cart/items/bulk`

**요약:** 장바구니 품목 일괄 수정/삭제

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "updates": [
    {
      "id": "uuid-cart-item", // string
      "quantity": 2, // number?
      "unit": "개", // string?
      "isChecked": true, // boolean?
      "price": 3500, // number?
      "memo": "1+1 행사" // string?
    }
  ], // CartItemUpdateEntryDto[]?
  "deletes": ["uuid-1", "uuid-2"] // string[]?
}
```

**Responses:**

#### 200 - 일괄 수정/삭제 성공

```json
{
  "id": "uuid-cart", // string
  "groupId": "uuid-group", // string
  "items": [
    {
      "id": "uuid-1234", // string
      "cartId": "uuid-cart", // string
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string | null
      "price": 3500, // number | null
      "isChecked": false, // boolean
      "memo": "1+1 행사", // string | null
      "createdAt": "2025-01-01T00:00:00Z" // Date
    }
  ], // CartItemDto[]
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `shopping/cart/items/:itemId`

**요약:** 장바구니 품목 수정 (수량, 체크 등)

**Path Parameters:**

- `itemId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "quantity": 2, // number?
  "unit": "개", // string?
  "isChecked": true, // boolean?
  "price": 3500, // number?
  "memo": "1+1 행사" // string?
}
```

**Responses:**

#### 200 - 품목 수정 성공

```json
{
  "id": "uuid-1234", // string
  "cartId": "uuid-cart", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "price": 3500, // number | null
  "isChecked": false, // boolean
  "memo": "1+1 행사", // string | null
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 품목을 찾을 수 없습니다

---

### DELETE `shopping/cart/items/:itemId`

**요약:** 장바구니 품목 삭제

**Path Parameters:**

- `itemId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 품목 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 품목을 찾을 수 없습니다

---

### POST `shopping/cart/complete`

**요약:** 장보기 완료 — 이력 저장 및 냉장고 이관

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "transfers": [
    {
      "cartItemId": "uuid-cart-item", // string
      "storageLocationId": "uuid-storage", // string
      "quantity": 2, // number?
      "unit": "개", // string?
      "price": 3500, // 품목 금액 (number?)
      "expiresAt": "2026-05-30", // string?
      "alertDaysBefore": 3 // number?
    }
  ], // 냉장고로 이관할 품목 목록 (TransferItemDto[])
  "expense": {
    "amount": 45000, // 총 구매액 (생략 시 품목별 금액 합계로 자동 계산) (number?)
    "paymentMethod": "CARD", // 결제 수단 (PaymentMethod?)
    "date": "2026-05-12", // 지출 날짜 (기본: 오늘) (string?)
    "description": "마트 장보기", // 지출 내용 (string?)
    "category": "GROCERIES" // 가계부 카테고리 (기본: GROCERIES) (ExpenseCategory?)
  } // 가계부 자동 등록 (생략 시 가계부 미등록) (ShoppingExpenseDto?)
}
```

**Responses:**

#### 201 - 장보기 완료 성공

```json
{
  "id": "uuid-history", // string
  "groupId": "uuid-group", // string
  "completedAt": "2025-01-01T00:00:00Z", // Date
  "items": [
    {
      "id": "uuid-1234", // string
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string | null
      "price": 3500, // number | null
      "transferredToFridge": true, // boolean
      "fridgeItemId": "uuid-fridge-item" // string | null
    }
  ], // ShoppingHistoryItemDto[]
  "expense": {
    "id": "uuid-expense", // string
    "amount": 45000, // string
    "category": "FOOD", // string | null
    "paymentMethod": "CARD", // string | null
    "date": "2025-01-01T00:00:00Z", // Date
    "description": "마트 장보기" // string | null
  } // 연결된 가계부 지출 (장보기 완료 시 가계부 등록한 경우에만 존재) (LinkedExpenseDto | null)
}
```

#### 404 - 장바구니가 비어 있습니다

#### 403 - 그룹 멤버만 접근할 수 있습니다

---

### GET `shopping/history`

**요약:** 구매 이력 목록 조회 (페이지네이션)

**Query Parameters:**

- `groupId` (`string`)
- `page` (`number`) (Optional)
- `limit` (`number`) (Optional)

**Responses:**

#### 200 - 이력 조회 성공

```json
{
  "data": [
    {
      "id": "uuid-history", // string
      "groupId": "uuid-group", // string
      "completedAt": "2025-01-01T00:00:00Z", // Date
      "items": {
        "id": "uuid-1234",
        "name": "우유",
        "quantity": 2,
        "unit": "개",
        "price": 3500,
        "transferredToFridge": true,
        "fridgeItemId": "uuid-fridge-item"
      }, // ShoppingHistoryItemDto[]
      "expense": {
        "id": "uuid-expense",
        "amount": 45000,
        "category": "FOOD",
        "paymentMethod": "CARD",
        "date": "2025-01-01T00:00:00Z",
        "description": "마트 장보기"
      } // 연결된 가계부 지출 (장보기 완료 시 가계부 등록한 경우에만 존재) (LinkedExpenseDto | null)
    }
  ], // ShoppingHistoryDto[]
  "total": 20, // number
  "page": 1, // number
  "limit": 10 // number
}
```

---

### GET `shopping/history/:historyId`

**요약:** 구매 이력 상세 조회

**Path Parameters:**

- `historyId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 이력 상세 조회 성공

```json
{
  "id": "uuid-history", // string
  "groupId": "uuid-group", // string
  "completedAt": "2025-01-01T00:00:00Z", // Date
  "items": [
    {
      "id": "uuid-1234", // string
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string | null
      "price": 3500, // number | null
      "transferredToFridge": true, // boolean
      "fridgeItemId": "uuid-fridge-item" // string | null
    }
  ], // ShoppingHistoryItemDto[]
  "expense": {
    "id": "uuid-expense", // string
    "amount": 45000, // string
    "category": "FOOD", // string | null
    "paymentMethod": "CARD", // string | null
    "date": "2025-01-01T00:00:00Z", // Date
    "description": "마트 장보기" // string | null
  } // 연결된 가계부 지출 (장보기 완료 시 가계부 등록한 경우에만 존재) (LinkedExpenseDto | null)
}
```

#### 404 - 구매 이력을 찾을 수 없습니다

---

### DELETE `shopping/history/:historyId`

**요약:** 구매 이력 삭제 (오입력 정정용)

**Path Parameters:**

- `historyId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 이력 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 구매 이력을 찾을 수 없습니다

---
