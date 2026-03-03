# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 육아 포인트

**Base Path:** `/childcare`

### POST `childcare/accounts`

**요약:** 육아 계정 생성 (부모만 가능)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsInterestRate": 2 // 적금 이자율 (%) (number)
}
```

**Responses:**

#### 201 - 육아 계정 생성 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `childcare/accounts`

**요약:** 육아 계정 목록 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 육아 계정 목록 조회 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `childcare/accounts/:id`

**요약:** 육아 계정 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 육아 계정 상세 조회 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### PATCH `childcare/accounts/:id`

**요약:** 육아 계정 설정 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "monthlyAllowance": 150, // 월별 용돈 포인트 (number?)
  "savingsInterestRate": 3 // 적금 이자율 (%) (number?)
}
```

**Responses:**

#### 200 - 육아 계정 수정 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### POST `childcare/accounts/:id/transactions`

**요약:** 포인트 거래 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 50, // 포인트 금액 (number)
  "description": "심부름 완료" // 설명 (string)
}
```

**Responses:**

#### 201 - 거래 추가 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/accounts/:id/transactions`

**요약:** 거래 내역 조회

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `type` (`ChildcareTransactionType`) (Optional): 거래 유형 필터
- `month` (`string`) (Optional): 조회 월 (YYYY-MM)

**Responses:**

#### 200 - 거래 내역 조회 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### GET `childcare/accounts/:id/rewards`

**요약:** 보상 항목 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 보상 항목 목록 조회 성공

```json
{
  "id": "uuid-1234", // 보상 항목 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

---

### POST `childcare/accounts/:id/rewards`

**요약:** 보상 항목 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string?)
  "points": 10 // 포인트 비용 (number)
}
```

**Responses:**

#### 201 - 보상 항목 추가 성공

```json
{
  "id": "uuid-1234", // 보상 항목 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/rewards/:rewardId`

**요약:** 보상 항목 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `rewardId` (`string`)

**Request Body:**

```json
{
  "name": "TV 1시간 더보기", // 보상 이름 (string?)
  "description": "", // 보상 설명 (string?)
  "points": 20, // 포인트 비용 (number?)
  "isActive": true // 활성화 여부 (boolean?)
}
```

**Responses:**

#### 200 - 보상 항목 수정 성공

```json
{
  "id": "uuid-1234", // 보상 항목 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 보상 항목을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### DELETE `childcare/accounts/:id/rewards/:rewardId`

**요약:** 보상 항목 삭제 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `rewardId` (`string`)

**Responses:**

#### 200 - 보상 항목 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 보상 항목을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/accounts/:id/rules`

**요약:** 규칙 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 규칙 목록 조회 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string | null)
  "penalty": 10, // 차감 포인트 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

---

### POST `childcare/accounts/:id/rules`

**요약:** 규칙 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string?)
  "penalty": 10 // 차감 포인트 (number)
}
```

**Responses:**

#### 201 - 규칙 추가 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string | null)
  "penalty": 10, // 차감 포인트 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/rules/:ruleId`

**요약:** 규칙 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `ruleId` (`string`)

**Request Body:**

```json
{
  "name": "숙제 안함", // 규칙 이름 (string?)
  "description": "", // 규칙 설명 (string?)
  "penalty": 20, // 차감 포인트 (number?)
  "isActive": true // 활성화 여부 (boolean?)
}
```

**Responses:**

#### 200 - 규칙 수정 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string | null)
  "penalty": 10, // 차감 포인트 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 규칙을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### DELETE `childcare/accounts/:id/rules/:ruleId`

**요약:** 규칙 삭제 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `ruleId` (`string`)

**Responses:**

#### 200 - 규칙 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 규칙을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### POST `childcare/accounts/:id/savings/deposit`

**요약:** 적금 입금 (자녀 또는 부모)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 50 // 입금 포인트 (number)
}
```

**Responses:**

#### 201 - 적금 입금 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### POST `childcare/accounts/:id/savings/withdraw`

**요약:** 적금 출금 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 50 // 출금 포인트 (number)
}
```

**Responses:**

#### 201 - 적금 출금 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---
