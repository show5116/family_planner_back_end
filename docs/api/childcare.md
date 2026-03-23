# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 육아 포인트

**Base Path:** `/childcare`

### POST `childcare/children`

**요약:** 자녀 프로필 등록 (앱 계정 불필요)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "name": "김민준", // 자녀 이름 (string)
  "birthDate": "2024-01-15" // 생년월일 (YYYY-MM-DD) (string)
}
```

**Responses:**

#### 201 - 자녀 프로필 등록 성공

```json
{
  "id": "uuid-1234", // 자녀 프로필 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "name": "김민준", // 자녀 이름 (string)
  "birthDate": "2024-01-15T00:00:00.000Z", // 생년월일 (Date)
  "userId": null, // 연결된 앱 계정 ID (앱 가입 시 연결) (string | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `childcare/children`

**요약:** 그룹 내 자녀 프로필 목록 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 자녀 프로필 목록 조회 성공

```json
{
  "id": "uuid-1234", // 자녀 프로필 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "name": "김민준", // 자녀 이름 (string)
  "birthDate": "2024-01-15T00:00:00.000Z", // 생년월일 (Date)
  "userId": null, // 연결된 앱 계정 ID (앱 가입 시 연결) (string | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `childcare/children/:id/link-user`

**요약:** 자녀 프로필과 앱 계정 연동 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 앱 계정 연동 성공

```json
{
  "id": "uuid-1234", // 자녀 프로필 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "name": "김민준", // 자녀 이름 (string)
  "birthDate": "2024-01-15T00:00:00.000Z", // 생년월일 (Date)
  "userId": null, // 연결된 앱 계정 ID (앱 가입 시 연결) (string | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 자녀 프로필을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/accounts`

**요약:** 그룹 내 포인트 계정 목록 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 포인트 계정 목록 조회 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childId": "uuid-1234", // 자녀 프로필 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `childcare/accounts/:id`

**요약:** 포인트 계정 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 포인트 계정 상세 조회 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childId": "uuid-1234", // 자녀 프로필 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 포인트 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### POST `childcare/children/:id/allowance-plan`

**요약:** 월 포인트 할당 설정 (생성 또는 수정, 부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "monthlyPoints": 100, // 월 지급 포인트 (number)
  "payDay": 1, // 월 지급일 (1~31) (number)
  "pointToMoneyRatio": 10, // 포인트 : 원 비율 (1포인트 = N원) (number)
  "nextNegotiationDate": "2027-01-01" // 다음 연봉 협상일 (YYYY-MM-DD) (string?)
}
```

**Responses:**

#### 201 - 월 포인트 할당 설정 성공

```json
{
  "id": "uuid-1234", // 할당 플랜 ID (string)
  "childId": "uuid-1234", // 자녀 프로필 ID (string)
  "monthlyPoints": 100, // 월 지급 포인트 (number)
  "payDay": 1, // 월 지급일 (1~31) (number)
  "pointToMoneyRatio": 10, // 포인트 : 원 비율 (1포인트 = N원) (number)
  "nextNegotiationDate": "2027-01-01T00:00:00.000Z", // 다음 연봉 협상일 (Date | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 자녀 프로필을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/children/:id/allowance-plan`

**요약:** 월 포인트 할당 설정 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 월 포인트 할당 설정 조회 성공

```json
{
  "id": "uuid-1234", // 할당 플랜 ID (string)
  "childId": "uuid-1234", // 자녀 프로필 ID (string)
  "monthlyPoints": 100, // 월 지급 포인트 (number)
  "payDay": 1, // 월 지급일 (1~31) (number)
  "pointToMoneyRatio": 10, // 포인트 : 원 비율 (1포인트 = N원) (number)
  "nextNegotiationDate": "2027-01-01T00:00:00.000Z", // 다음 연봉 협상일 (Date | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 자녀 프로필을 찾을 수 없습니다

#### 403 - 해당 자녀 프로필에 접근할 권한이 없습니다

---

### GET `childcare/children/:id/allowance-plan/history`

**요약:** 월 포인트 할당 변경 히스토리 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 히스토리 조회 성공

```json
{
  "id": "uuid-1234", // 히스토리 ID (string)
  "planId": "uuid-1234", // 플랜 ID (string)
  "monthlyPoints": 100, // 월 지급 포인트 (number)
  "payDay": 1, // 월 지급일 (1~31) (number)
  "pointToMoneyRatio": 10, // 포인트 : 원 비율 (number)
  "nextNegotiationDate": "2027-01-01T00:00:00.000Z", // 다음 연봉 협상일 (Date | null)
  "changedAt": "2026-03-01T00:00:00.000Z" // 변경 일시 (Date)
}
```

#### 404 - 자녀 프로필을 찾을 수 없습니다

#### 403 - 해당 자녀 프로필에 접근할 권한이 없습니다

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
