# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 적립금

**Base Path:** `/savings`

### POST `savings`

**요약:** 적립 목표 생성

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "name": "여름 휴가 비용", // 적립 목표 이름 (string)
  "description": "7월 제주도 여행 경비", // 설명 (string?)
  "targetAmount": 1000000, // 목표 금액 (미설정 시 무기한 적립) (number?)
  "autoDeposit": false, // 자동 적립 여부 (boolean?)
  "monthlyAmount": 100000 // 매달 자동 적립 금액 (autoDeposit=true 시 필수) (number?)
}
```

**Responses:**

#### 201 - 적립 목표 생성 성공

```json
{
  "id": "uuid-1234", // 적립 목표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "name": "여름 휴가 비용", // 이름 (string)
  "description": "제주도 여행", // 설명 (string | null)
  "targetAmount": 1000000, // 목표 금액 (number | null)
  "currentAmount": 350000, // 현재 적립 금액 (number)
  "autoDeposit": false, // 자동 적립 여부 (boolean)
  "monthlyAmount": 100000, // 매달 자동 적립 금액 (number | null)
  "status": null, // 상태 (SavingsGoalStatus)
  "achievementRate": 35, // 달성률 (targetAmount 없으면 null) (number | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `savings`

**요약:** 적립 목표 목록 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID

**Responses:**

#### 200 - 적립 목표 목록 조회 성공

```json
{
  "id": "uuid-1234", // 적립 목표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "name": "여름 휴가 비용", // 이름 (string)
  "description": "제주도 여행", // 설명 (string | null)
  "targetAmount": 1000000, // 목표 금액 (number | null)
  "currentAmount": 350000, // 현재 적립 금액 (number)
  "autoDeposit": false, // 자동 적립 여부 (boolean)
  "monthlyAmount": 100000, // 매달 자동 적립 금액 (number | null)
  "status": null, // 상태 (SavingsGoalStatus)
  "achievementRate": 35, // 달성률 (targetAmount 없으면 null) (number | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `savings/:id`

**요약:** 적립 목표 상세 조회 (최근 내역 10건 포함)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 적립 목표 상세 조회 성공

```json
{
  "transactions": [
    {
      "id": "uuid-1234", // 트랜잭션 ID (string)
      "goalId": "uuid-5678", // 적립 목표 ID (string)
      "type": null, // 타입 (SavingsType)
      "amount": 50000, // 금액 (number)
      "description": "항공권 구매", // 메모 (string | null)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
    }
  ] // 최근 내역 목록 (SavingsTransactionDto[])
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `savings/:id`

**요약:** 적립 목표 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "여름 휴가 비용", // 적립 목표 이름 (string?)
  "description": "7월 제주도 여행 경비", // 설명 (string?)
  "targetAmount": 1500000, // 목표 금액 (number?)
  "autoDeposit": true, // 자동 적립 여부 (boolean?)
  "monthlyAmount": 150000 // 매달 자동 적립 금액 (autoDeposit=true 시 필수) (number?)
}
```

**Responses:**

#### 200 - 적립 목표 수정 성공

```json
{
  "id": "uuid-1234", // 적립 목표 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "name": "여름 휴가 비용", // 이름 (string)
  "description": "제주도 여행", // 설명 (string | null)
  "targetAmount": 1000000, // 목표 금액 (number | null)
  "currentAmount": 350000, // 현재 적립 금액 (number)
  "autoDeposit": false, // 자동 적립 여부 (boolean)
  "monthlyAmount": 100000, // 매달 자동 적립 금액 (number | null)
  "status": null, // 상태 (SavingsGoalStatus)
  "achievementRate": 35, // 달성률 (targetAmount 없으면 null) (number | null)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일시 (Date)
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### DELETE `savings/:id`

**요약:** 적립 목표 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 적립 목표 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `savings/:id/complete`

**요약:** 적립 목표 완료 처리 (수동 종료)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 완료 처리 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `savings/:id/pause`

**요약:** 자동 적립 일시 중지

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 일시 중지 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `savings/:id/resume`

**요약:** 자동 적립 재개

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 재개 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `savings/:id/deposit`

**요약:** 수동 입금

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 50000, // 입금 금액 (number)
  "description": "3월 추가 적립" // 메모 (string?)
}
```

**Responses:**

#### 201 - 입금 성공

```json
{
  "id": "uuid-1234", // 트랜잭션 ID (string)
  "goalId": "uuid-5678", // 적립 목표 ID (string)
  "type": null, // 타입 (SavingsType)
  "amount": 50000, // 금액 (number)
  "description": "항공권 구매", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `savings/:id/withdraw`

**요약:** 출금 (이벤트 사용)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 300000, // 출금 금액 (number)
  "description": "항공권 구매" // 사용 목적 (필수) (string)
}
```

**Responses:**

#### 201 - 출금 성공

```json
{
  "id": "uuid-1234", // 트랜잭션 ID (string)
  "goalId": "uuid-5678", // 적립 목표 ID (string)
  "type": null, // 타입 (SavingsType)
  "amount": 50000, // 금액 (number)
  "description": "항공권 구매", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `savings/:id/transactions`

**요약:** 적립/출금 내역 목록 (페이지네이션)

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `type` (`ChildcareTransactionType`) (Optional): 거래 유형 필터
- `month` (`string`) (Optional): 조회 월 (YYYY-MM)
- `year` (`string`) (Optional): 조회 연도 (YYYY)

**Responses:**

#### 200 - 내역 조회 성공

```json
{
  "items": [
    {
      "id": "uuid-1234", // 트랜잭션 ID (string)
      "goalId": "uuid-5678", // 적립 목표 ID (string)
      "type": null, // 타입 (SavingsType)
      "amount": 50000, // 금액 (number)
      "description": "항공권 구매", // 메모 (string | null)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
    }
  ], // 내역 목록 (SavingsTransactionDto[])
  "total": 42, // 전체 건수 (number)
  "page": 1, // 현재 페이지 (number)
  "limit": 20 // 페이지 크기 (number)
}
```

#### 404 - 적립 목표를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---
