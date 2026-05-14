# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 냉장고 & 장보기

**Base Path:** `/fridge`

### GET `fridge/storages`

**요약:** 보관소 목록 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 보관소 목록 조회 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우리집 냉장고", // string
  "type": "FRIDGE", // string
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### POST `fridge/storages`

**요약:** 보관소 생성

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "name": "우리집 냉장고", // string
  "type": "FRIDGE" // StorageType
}
```

**Responses:**

#### 201 - 보관소 생성 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우리집 냉장고", // string
  "type": "FRIDGE", // string
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `fridge/storages/reorder`

**요약:** 보관소 순서 변경

**Request Body:**

```json
{
  "ids": ["uuid-3", "uuid-1", "uuid-2"] // 변경할 순서대로 정렬된 ID 목록 (string[])
}
```

**Responses:**

#### 200 - 순서 변경 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우리집 냉장고", // string
  "type": "FRIDGE", // string
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `fridge/storages/:storageId`

**요약:** 보관소 수정

**Path Parameters:**

- `storageId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "name": "냉장고 1", // string?
  "type": null // StorageType?
}
```

**Responses:**

#### 200 - 보관소 수정 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우리집 냉장고", // string
  "type": "FRIDGE", // string
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 보관소를 찾을 수 없습니다

---

### DELETE `fridge/storages/:storageId`

**요약:** 보관소 삭제

**Path Parameters:**

- `storageId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 보관소 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 보관소를 찾을 수 없습니다

---

### GET `fridge/items`

**요약:** 냉장고 전체 품목 조회 (보관소별)

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 조회 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우리집 냉장고", // string
  "type": "FRIDGE", // string
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### POST `fridge/items`

**요약:** 냉장고 품목 등록

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "storageLocationId": "uuid-storage", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string?
  "expiresAt": "2026-05-20", // string?
  "alertDaysBefore": 3, // number?
  "memo": "유기농", // string?
  "frequentItemId": "uuid-frequent" // string?
}
```

**Responses:**

#### 201 - 품목 등록 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "storageLocationId": "uuid-storage", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "registeredAt": "2025-01-01T00:00:00Z", // Date
  "expiresAt": "2026-05-20T00:00:00.000Z", // Date | null
  "alertDaysBefore": 3, // number
  "memo": "유기농", // string | null
  "frequentItemId": "uuid-frequent", // string | null
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 보관소를 찾을 수 없습니다

---

### PATCH `fridge/items/:itemId`

**요약:** 냉장고 품목 수정

**Path Parameters:**

- `itemId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "storageLocationId": "uuid-storage", // string?
  "name": "우유", // string?
  "quantity": 2, // number?
  "unit": "개", // string?
  "expiresAt": "2026-05-20", // string?
  "alertDaysBefore": 3, // number?
  "memo": "유기농", // string?
  "frequentItemId": "uuid-frequent" // string | null?
}
```

**Responses:**

#### 200 - 품목 수정 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "storageLocationId": "uuid-storage", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "registeredAt": "2025-01-01T00:00:00Z", // Date
  "expiresAt": "2026-05-20T00:00:00.000Z", // Date | null
  "alertDaysBefore": 3, // number
  "memo": "유기농", // string | null
  "frequentItemId": "uuid-frequent", // string | null
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 품목을 찾을 수 없습니다

---

### DELETE `fridge/items/:itemId`

**요약:** 냉장고 품목 삭제

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

### PATCH `fridge/items/:itemId/quantity`

**요약:** 냉장고 품목 수량 변경 (소진 시 자동 카트 등재)

**Path Parameters:**

- `itemId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "quantity": 1 // number
}
```

**Responses:**

#### 200 - 수량 변경 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "storageLocationId": "uuid-storage", // string
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "registeredAt": "2025-01-01T00:00:00Z", // Date
  "expiresAt": "2026-05-20T00:00:00.000Z", // Date | null
  "alertDaysBefore": 3, // number
  "memo": "유기농", // string | null
  "frequentItemId": "uuid-frequent", // string | null
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 품목을 찾을 수 없습니다

---

### GET `fridge/frequent-items`

**요약:** 자주 사는 항목 목록 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 조회 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우유", // string
  "defaultUnit": "개", // string | null
  "autoAdd": true, // boolean
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### POST `fridge/frequent-items`

**요약:** 자주 사는 항목 생성

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "name": "우유", // string
  "defaultUnit": "개", // string?
  "autoAdd": false // boolean?
}
```

**Responses:**

#### 201 - 생성 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우유", // string
  "defaultUnit": "개", // string | null
  "autoAdd": true, // boolean
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `fridge/frequent-items/reorder`

**요약:** 자주 사는 항목 순서 변경

**Request Body:**

```json
{
  "ids": ["uuid-3", "uuid-1", "uuid-2"] // 변경할 순서대로 정렬된 ID 목록 (string[])
}
```

**Responses:**

#### 200 - 순서 변경 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우유", // string
  "defaultUnit": "개", // string | null
  "autoAdd": true, // boolean
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `fridge/frequent-items/:itemId`

**요약:** 자주 사는 항목 수정 (autoAdd 토글 포함)

**Path Parameters:**

- `itemId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "name": "우유", // string?
  "defaultUnit": "개", // string | null?
  "autoAdd": true // boolean?
}
```

**Responses:**

#### 200 - 수정 성공

```json
{
  "id": "uuid-1234", // string
  "groupId": "uuid-group", // string
  "name": "우유", // string
  "defaultUnit": "개", // string | null
  "autoAdd": true, // boolean
  "sortOrder": 0, // number
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 자주 사는 항목을 찾을 수 없습니다

---

### DELETE `fridge/frequent-items/:itemId`

**요약:** 자주 사는 항목 삭제

**Path Parameters:**

- `itemId` (`string`)

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 자주 사는 항목을 찾을 수 없습니다

---

### GET `fridge/cart`

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
      "frequentItemId": "uuid-frequent", // string | null
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string | null
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

### POST `fridge/cart/items`

**요약:** 장바구니 품목 추가

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "frequentItemId": "uuid-frequent", // string?
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string?
  "memo": "1+1 행사" // string?
}
```

**Responses:**

#### 201 - 품목 추가 성공

```json
{
  "id": "uuid-1234", // string
  "cartId": "uuid-cart", // string
  "frequentItemId": "uuid-frequent", // string | null
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "isChecked": false, // boolean
  "memo": "1+1 행사", // string | null
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

---

### PATCH `fridge/cart/items/:itemId`

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
  "memo": "1+1 행사" // string?
}
```

**Responses:**

#### 200 - 품목 수정 성공

```json
{
  "id": "uuid-1234", // string
  "cartId": "uuid-cart", // string
  "frequentItemId": "uuid-frequent", // string | null
  "name": "우유", // string
  "quantity": 2, // number
  "unit": "개", // string | null
  "isChecked": false, // boolean
  "memo": "1+1 행사", // string | null
  "createdAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 품목을 찾을 수 없습니다

---

### DELETE `fridge/cart/items/:itemId`

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

### POST `fridge/cart/complete`

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
      "expiresAt": "2026-05-30", // string?
      "alertDaysBefore": 3 // number?
    }
  ], // 냉장고로 이관할 품목 목록 (TransferItemDto[])
  "expense": {
    "amount": 45000, // 총 구매액 (number)
    "paymentMethod": "CARD", // 결제 수단 (PaymentMethod?)
    "date": "2026-05-12", // 지출 날짜 (기본: 오늘) (string?)
    "description": "마트 장보기", // 지출 내용 (string?)
    "category": "FOOD" // 가계부 카테고리 (기본: FOOD) (ExpenseCategory?)
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

### GET `fridge/shopping-history`

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

### GET `fridge/shopping-history/:historyId`

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
