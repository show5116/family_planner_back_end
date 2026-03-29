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
  "type": null, // 거래 유형. shopItemId 또는 ruleId 지정 시 자동 설정됨 (ChildcareTransactionType?)
  "amount": 50, // 포인트 금액. shopItemId 또는 ruleId 지정 시 자동 설정됨 (number?)
  "description": "심부름 완료", // 설명. shopItemId 또는 ruleId 지정 시 자동 설정됨 (string?)
  "shopItemId": "uuid-1234", // 상점 아이템 ID. 지정 시 type=PURCHASE, amount/description 자동 설정 (string?)
  "ruleId": "uuid-1234" // 규칙 ID. 지정 시 type/amount/description 자동 설정 (INFO 타입 규칙은 적용 불가) (string?)
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

### GET `childcare/accounts/:id/shop-items`

**요약:** 상점 아이템 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 상점 아이템 목록 조회 성공

```json
{
  "id": "uuid-1234", // 상점 아이템 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 아이템 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 아이템 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

---

### POST `childcare/accounts/:id/shop-items`

**요약:** 상점 아이템 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "TV 30분 더보기", // 상점 아이템 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 상점 아이템 설명 (string?)
  "points": 10 // 포인트 비용 (number)
}
```

**Responses:**

#### 201 - 상점 아이템 추가 성공

```json
{
  "id": "uuid-1234", // 상점 아이템 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 아이템 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 아이템 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/shop-items/reorder`

**요약:** 상점 아이템 순서 변경 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

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
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/shop-items/:itemId`

**요약:** 상점 아이템 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Request Body:**

```json
{
  "name": "TV 1시간 더보기", // 상점 아이템 이름 (string?)
  "description": "", // 상점 아이템 설명 (string?)
  "points": 20, // 포인트 비용 (number?)
  "isActive": true // 활성화 여부 (boolean?)
}
```

**Responses:**

#### 200 - 상점 아이템 수정 성공

```json
{
  "id": "uuid-1234", // 상점 아이템 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 아이템 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 아이템 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 상점 아이템을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### DELETE `childcare/accounts/:id/shop-items/:itemId`

**요약:** 상점 아이템 삭제 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Responses:**

#### 200 - 상점 아이템 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 상점 아이템을 찾을 수 없습니다

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
  "name": "방 정리하기", // 규칙 이름 (string)
  "description": "방을 깨끗하게 정리하면 포인트가 지급됩니다", // 규칙 설명 (string | null)
  "type": null, // 규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감, INFO: 메모성 규칙) (ChildcareRuleType)
  "points": 10, // 포인트 (없을 경우 null) (number | null)
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
  "name": "방 정리하기", // 규칙 이름 (string)
  "description": "방을 깨끗하게 정리하면 포인트가 지급됩니다", // 규칙 설명 (string?)
  "type": null, // 규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감, INFO: 메모성 규칙) (ChildcareRuleType)
  "points": 10 // 포인트 (INFO 타입은 무시됨, PLUS/MINUS는 선택) (number | null?)
}
```

**Responses:**

#### 201 - 규칙 추가 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리하기", // 규칙 이름 (string)
  "description": "방을 깨끗하게 정리하면 포인트가 지급됩니다", // 규칙 설명 (string | null)
  "type": null, // 규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감, INFO: 메모성 규칙) (ChildcareRuleType)
  "points": 10, // 포인트 (없을 경우 null) (number | null)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/rules/reorder`

**요약:** 규칙 순서 변경 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

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
  "message": "작업이 완료되었습니다" // string
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
  "name": "숙제하기", // 규칙 이름 (string?)
  "description": "", // 규칙 설명 (string?)
  "type": null, // 규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감) (ChildcareRuleType?)
  "points": 20, // 포인트 (null로 설정 시 포인트 없는 규칙) (number | null?)
  "isActive": true // 활성화 여부 (boolean?)
}
```

**Responses:**

#### 200 - 규칙 수정 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리하기", // 규칙 이름 (string)
  "description": "방을 깨끗하게 정리하면 포인트가 지급됩니다", // 규칙 설명 (string | null)
  "type": null, // 규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감, INFO: 메모성 규칙) (ChildcareRuleType)
  "points": 10, // 포인트 (없을 경우 null) (number | null)
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

### GET `childcare/accounts/:id/savings/kr3y-rate`

**요약:** 국고채 3년물 금리 조회 (적금 플랜 화면 참고용)

**Responses:**

#### 200 - 금리 조회 성공

```json
{
  "kr3yRate": 3 // 참고용 현재 국고채 3년물 금리 (%) (number | null)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

---

### POST `childcare/accounts/:id/savings/plan`

**요약:** 적금 플랜 생성 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "monthlyAmount": 20, // 월 적금액 (포인트) (number)
  "interestRate": 3, // 연 이자율 (%) (number)
  "interestType": null, // 이자 유형 (SIMPLE: 단리, COMPOUND: 복리) (SavingsInterestType)
  "startDate": "2026-04-01", // 적금 시작일 (YYYY-MM-DD) (string)
  "endDate": "2027-04-01" // 적금 만기일 (YYYY-MM-DD) (string)
}
```

**Responses:**

#### 201 - 적금 플랜 생성 성공

```json
{
  "id": "uuid-1234", // 적금 플랜 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "monthlyAmount": 20, // 월 적금액 (포인트) (number)
  "interestRate": 3, // 연 이자율 (%) (number)
  "interestType": null, // 이자 유형 (SIMPLE: 단리, COMPOUND: 복리) (SavingsInterestType)
  "startDate": "2026-04-01T00:00:00.000Z", // 시작일 (Date)
  "endDate": "2027-04-01T00:00:00.000Z", // 만기일 (Date)
  "status": null, // 상태 (ACTIVE: 진행 중, MATURED: 만기, CANCELLED: 해지) (SavingsPlanStatus)
  "maturedAt": "2025-01-01T00:00:00Z", // 만기 처리 일시 (Date | null)
  "cancelledAt": "2025-01-01T00:00:00Z", // 해지 일시 (Date | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/accounts/:id/savings/plan`

**요약:** 적금 플랜 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 적금 플랜 조회 성공

```json
{
  "id": "uuid-1234", // 적금 플랜 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "monthlyAmount": 20, // 월 적금액 (포인트) (number)
  "interestRate": 3, // 연 이자율 (%) (number)
  "interestType": null, // 이자 유형 (SIMPLE: 단리, COMPOUND: 복리) (SavingsInterestType)
  "startDate": "2026-04-01T00:00:00.000Z", // 시작일 (Date)
  "endDate": "2027-04-01T00:00:00.000Z", // 만기일 (Date)
  "status": null, // 상태 (ACTIVE: 진행 중, MATURED: 만기, CANCELLED: 해지) (SavingsPlanStatus)
  "maturedAt": "2025-01-01T00:00:00Z", // 만기 처리 일시 (Date | null)
  "cancelledAt": "2025-01-01T00:00:00Z", // 해지 일시 (Date | null)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### DELETE `childcare/accounts/:id/savings/plan`

**요약:** 적금 플랜 중도 해지 (부모만 가능)

**설명:**
중도 해지 시 이자 없이 원금만 잔액에 반환됩니다.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 적금 플랜 해지 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---
