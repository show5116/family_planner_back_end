# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 자산관리

**Base Path:** `/assets`

### POST `assets/accounts`

**요약:** 계좌 생성

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string?)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null // 계좌 유형 (AccountType)
}
```

**Responses:**

#### 201 - 계좌 생성 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/accounts`

**요약:** 계좌 목록 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID
- `userId` (`string`) (Optional): 특정 구성원 ID 필터

**Responses:**

#### 200 - 계좌 목록 조회 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/accounts/:id`

**요약:** 계좌 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 계좌 상세 조회 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `assets/accounts/:id`

**요약:** 계좌 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "주택청약", // 계좌명 (string?)
  "accountNumber": "123-456-789", // 계좌번호 (string?)
  "institution": "국민은행", // 금융기관명 (string?)
  "type": null // 계좌 유형 (AccountType?)
}
```

**Responses:**

#### 200 - 계좌 수정 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌만 수정할 수 있습니다

---

### DELETE `assets/accounts/:id`

**요약:** 계좌 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 계좌 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌만 삭제할 수 있습니다

---

### POST `assets/accounts/:id/records`

**요약:** 자산 기록 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "recordDate": "2026-03-01", // 기록 날짜 (YYYY-MM-DD) (string)
  "balance": 5000000, // 잔액 (number)
  "principal": 4800000, // 원금 (number)
  "profit": 200000, // 수익금 (number)
  "note": "이자 입금" // 메모 (string?)
}
```

**Responses:**

#### 201 - 자산 기록 추가 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-03-01", // 기록 날짜 (Date)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "note": "이자 입금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌에만 기록을 추가할 수 있습니다

---

### GET `assets/accounts/:id/records`

**요약:** 자산 기록 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 자산 기록 목록 조회 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-03-01", // 기록 날짜 (Date)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "note": "이자 입금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/statistics`

**요약:** 그룹 자산 통계 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID

**Responses:**

#### 200 - 자산 통계 조회 성공

```json
{
  "totalBalance": "50000000.00", // 총 잔액 (계좌) (string)
  "totalPrincipal": "48000000.00", // 총 원금 (string)
  "totalProfit": "2000000.00", // 총 수익금 (string)
  "profitRate": "4.17", // 전체 수익률 (%) (string)
  "accountCount": 5, // 총 계좌 수 (number)
  "byType": [
    {
      "type": null, // 계좌 유형 (AccountType)
      "balance": "10000000.00", // 총 잔액 (string)
      "count": 2 // 계좌 수 (number)
    }
  ], // 유형별 통계 (AccountTypeStatDto[])
  "savingsTotal": "3500000.00", // 자산 연동 적립금 합계 (includeInAssets=true인 목표) (string)
  "savingsGoals": [
    {
      "id": "uuid-1234", // 적립 목표 ID (string)
      "name": "비상금", // 적립 목표 이름 (string)
      "currentAmount": "2000000.00" // 현재 잔액 (string)
    }
  ] // 자산 연동 적립금 목록 (SavingsGoalSummaryDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---
