# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 냉장고 관리

**Base Path:** `/fridge`

### GET `fridge/item-names`

**요약:** 품목 이름 자동완성 목록 조회

**Query Parameters:**

- `groupId` (`string`)
- `q` (`string`) (Optional): 검색어 (부분 일치)

**Responses:**

#### 200 - 조회 성공

---
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
  "ids": ["uuid-3","uuid-1","uuid-2"] // 변경할 순서대로 정렬된 ID 목록 (string[])
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
  "memo": "유기농" // string?
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
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 보관소를 찾을 수 없습니다

---
### POST `fridge/items/bulk`

**요약:** 냉장고 품목 일괄 등록

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "items": [
    {
      "storageLocationId": "uuid-storage", // string
      "name": "우유", // string
      "quantity": 2, // number
      "unit": "개", // string?
      "expiresAt": "2026-05-20", // string?
      "alertDaysBefore": 3, // number?
      "memo": "유기농" // string?
    }
  ] // FridgeItemEntryDto[]
}
```

**Responses:**

#### 200 - 품목 일괄 등록 성공

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
  "createdAt": "2025-01-01T00:00:00Z", // Date
  "updatedAt": "2025-01-01T00:00:00Z" // Date
}
```

#### 404 - 일부 보관소를 찾을 수 없습니다

---
### PATCH `fridge/items/bulk`

**요약:** 냉장고 품목 일괄 수정/삭제

**Request Body:**

```json
{
  "groupId": "uuid-group", // string
  "updates": [
    {
      "id": "uuid-fridge-item", // string
      "storageLocationId": "uuid-storage", // string?
      "name": "우유", // string?
      "quantity": 2, // number?
      "unit": "개", // string?
      "expiresAt": "2026-05-20", // string?
      "alertDaysBefore": 3, // number?
      "memo": "유기농" // string?
    }
  ], // FridgeItemUpdateEntryDto[]?
  "deletes": ["uuid-1","uuid-2"] // string[]?
}
```

**Responses:**

#### 200 - 일괄 수정/삭제 성공

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
  "memo": "유기농" // string?
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
  "ids": ["uuid-3","uuid-1","uuid-2"] // 변경할 순서대로 정렬된 ID 목록 (string[])
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
