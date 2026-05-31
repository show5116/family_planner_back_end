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
  "institution": "국민은행", // 금융기관명 (string?)
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
  "institution": "국민은행", // 금융기관명 (string | null)
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
  "institution": "국민은행", // 금융기관명 (string | null)
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
  "institution": "국민은행", // 금융기관명 (string | null)
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

### PATCH `assets/accounts/reorder`

**요약:** 그룹 계좌 순서 변경

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "accountIds": ["uuid-a", "uuid-b", "uuid-c"] // 순서대로 정렬된 계좌 ID 목록 (string[])
}
```

**Responses:**

#### 200 - 계좌 순서 변경 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

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
  "institution": "국민은행", // 금융기관명 (string | null)
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
  "inputMode": null, // 입력 방식 (manual: 직접 입력, auto: 자동 계산, gold: 금 무게 기반 자동 계산) (RecordInputMode?)
  "balance": 5000000, // [manual] 잔액 (number?)
  "principal": 4800000, // [manual] 원금 (number?)
  "profit": 200000, // [manual] 수익금 (number?)
  "currentBalance": 5000000, // [auto] 현재 잔액 (number?)
  "additionalPrincipal": 300000, // [auto] 이번 달 추가 원금 (첫 기록이면 초기 원금) (number?)
  "gramWeight": 37, // [gold] 보유 금 무게 (g) — balance는 gramWeight × 현재 GOLD_KRW_SPOT으로 자동 계산 (number?)
  "purchaseCost": 4500000, // [gold] 매입 원가 — 미입력 시 gramWeight × 현재 GOLD_KRW_SPOT으로 임시 채움 (number?)
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
  "profitRate": "4.17", // 수익률 (%) (string)
  "gramWeight": "37.5000", // 보유 금 무게 (g) — GOLD 타입 기록 전용 (string | null)
  "note": "이자 입금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌에만 기록을 추가할 수 있습니다

---

### GET `assets/accounts/:id/records`

**요약:** 자산 기록 목록 조회 (스냅샷 + 출금 통합)

**설명:**
entryType=SNAPSHOT: 잔액 스냅샷, entryType=WITHDRAWAL: 출금 기록. 날짜 내림차순 정렬.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 자산 기록 목록 조회 성공

```json
{
  "entryType": "SNAPSHOT", // 항목 유형 ('SNAPSHOT')
  "date": "2026-05-01", // 날짜 (Date)
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-03-01", // 기록 날짜 (Date)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "profitRate": "4.17", // 수익률 (%) (string)
  "gramWeight": "37.5000", // 보유 금 무게 (g) — GOLD 타입 기록 전용 (string | null)
  "note": "이자 입금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 200 - 자산 기록 목록 조회 성공

```json
{
  "entryType": "WITHDRAWAL", // 항목 유형 ('WITHDRAWAL')
  "date": "2026-04-27", // 날짜 (Date)
  "id": "uuid-1234", // 출금 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "withdrawalDate": "2026-04-27", // 출금 날짜 (Date)
  "amount": "500000.00", // 출금 금액 (string)
  "type": null, // 출금 유형 (PRINCIPAL: 원금 인출, PROFIT: 수익 인출) (WithdrawalType)
  "note": "생활비 출금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### DELETE `assets/accounts/:id/records/:recordId`

**요약:** 자산 기록 삭제

**Path Parameters:**

- `id` (`string`)
- `recordId` (`string`)

**Responses:**

#### 200 - 자산 기록 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 계좌 또는 기록을 찾을 수 없습니다

#### 403 - 본인의 계좌 기록만 삭제할 수 있습니다

---

### POST `assets/accounts/:id/withdrawals`

**요약:** 출금 기록 추가 (출금일 이후 원금/수익 자동 재계산)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "withdrawalDate": "2026-04-27", // 출금 날짜 (YYYY-MM-DD) (string)
  "amount": 500000, // 출금 금액 (number)
  "type": null, // 출금 유형 (PRINCIPAL: 원금 인출, PROFIT: 수익 인출) (WithdrawalType)
  "note": "생활비 출금" // 메모 (string?)
}
```

**Responses:**

#### 201 - 출금 기록 추가 성공

```json
{
  "id": "uuid-1234", // 출금 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "withdrawalDate": "2026-04-27", // 출금 날짜 (Date)
  "amount": "500000.00", // 출금 금액 (string)
  "type": null, // 출금 유형 (PRINCIPAL: 원금 인출, PROFIT: 수익 인출) (WithdrawalType)
  "note": "생활비 출금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌에만 출금 기록을 추가할 수 있습니다

---

### DELETE `assets/accounts/:id/withdrawals/:withdrawalId`

**요약:** 출금 기록 삭제 (출금일 이후 원금/수익 원복)

**Path Parameters:**

- `id` (`string`)
- `withdrawalId` (`string`)

**Responses:**

#### 200 - 출금 기록 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 출금 기록을 찾을 수 없습니다

#### 403 - 본인의 계좌 출금 기록만 삭제할 수 있습니다

---

### GET `assets/accounts/:id/holding-records/names`

**요약:** 계좌 종목명 목록 조회 (자동완성용)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 종목명 목록 조회 성공

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/accounts/:id/holding-records`

**요약:** 종목 기록 목록 조회

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `recordDate` (`string`) - Optional

**Responses:**

#### 200 - 종목 기록 목록 조회 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-05-01", // 기록 날짜 (Date)
  "name": "나스닥 ETF", // 종목/자산명 (string)
  "ticker": "QQQ", // 티커 심볼 (string | null)
  "amount": "2000000.00", // 금액 (string)
  "ratio": "40.00", // 비율 (%, 해당 날짜 계좌 잔액 기준) (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `assets/accounts/:id/holding-records`

**요약:** 종목 기록 추가

**설명:**
금액 입력 시 해당 날짜의 AccountRecord.balance 기준으로 비율(ratio) 자동 계산. 해당 날짜의 자산 기록이 먼저 존재해야 합니다.

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "recordDate": "2026-05-01", // 기록 날짜 (AccountRecord와 동일한 날짜여야 함) (string)
  "name": "나스닥 ETF", // 종목/자산명 (string)
  "ticker": "QQQ", // 티커 심볼 (선택) (string?)
  "amount": 2000000 // 해당 종목 금액 (number)
}
```

**Responses:**

#### 201 - 종목 기록 추가 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-05-01", // 기록 날짜 (Date)
  "name": "나스닥 ETF", // 종목/자산명 (string)
  "ticker": "QQQ", // 티커 심볼 (string | null)
  "amount": "2000000.00", // 금액 (string)
  "ratio": "40.00", // 비율 (%, 해당 날짜 계좌 잔액 기준) (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일시 (Date)
}
```

#### 404 - 계좌 또는 해당 날짜 자산 기록을 찾을 수 없습니다

#### 403 - 본인의 계좌에만 기록을 추가할 수 있습니다

---

### PATCH `assets/accounts/:id/holding-records/:recordId`

**요약:** 종목 기록 수정 (종목명·티커·금액)

**Path Parameters:**

- `id` (`string`)
- `recordId` (`string`)

**Request Body:**

```json
{
  "name": "나스닥 ETF", // 종목/자산명 (string?)
  "ticker": "QQQ", // 티커 심볼 (string?)
  "amount": 2000000 // 해당 종목 금액 (number?)
}
```

**Responses:**

#### 200 - 종목 기록 수정 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-05-01", // 기록 날짜 (Date)
  "name": "나스닥 ETF", // 종목/자산명 (string)
  "ticker": "QQQ", // 티커 심볼 (string | null)
  "amount": "2000000.00", // 금액 (string)
  "ratio": "40.00", // 비율 (%, 해당 날짜 계좌 잔액 기준) (string)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일시 (Date)
}
```

#### 404 - 기록을 찾을 수 없습니다

#### 403 - 본인의 계좌 기록만 수정할 수 있습니다

---

### DELETE `assets/accounts/:id/holding-records/:recordId`

**요약:** 종목 기록 삭제

**Path Parameters:**

- `id` (`string`)
- `recordId` (`string`)

**Responses:**

#### 200 - 종목 기록 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 기록을 찾을 수 없습니다

#### 403 - 본인의 계좌 기록만 삭제할 수 있습니다

---

### GET `assets/gold/current-price`

**요약:** 현재 금 현물가 조회 (원/g)

**설명:**
GOLD 타입 계좌 생성 시 원금 임시값 계산용. GOLD_KRW_SPOT 지표의 최신 시세를 반환합니다.

**Responses:**

#### 200 - 금 현물가 조회 성공

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
  ], // 자산 연동 적립금 목록 (SavingsGoalSummaryDto[])
  "byHolding": [
    {
      "name": "나스닥 ETF", // 종목/자산명 (string)
      "ticker": "QQQ", // 티커 심볼 (string | null)
      "estimatedAmount": "2000000.00", // 종목 금액 합계 (최신 기록 기준) (string)
      "globalRatio": "4.00" // 전체 자산 대비 비율 (%) (string)
    }
  ] // 전체 자산 기준 종목별 통계 (HoldingStatDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/statistics/trend`

**요약:** 그룹 전체 자산 기간 통계 (월별/연도별)

**설명:**
period=monthly 시 year 필수. 각 기간마다 계좌별 마지막 기록 합산.

**Query Parameters:**

- `groupId` (`string`): 그룹 ID
- `period` (`TrendPeriod`): 기간 단위 (monthly: 월별, yearly: 연도별)
- `year` (`string`) (Optional): [monthly 전용] 조회 연도 (YYYY)
- `accountIds` (`string[]`) (Optional): 조회할 계좌 ID 목록 (콤마 구분, 미입력 시 그룹 전체)

**Responses:**

#### 200 - 그룹 자산 기간 통계 조회 성공

```json
{
  "period": "2026-03", // 기간 (monthly: YYYY-MM, yearly: YYYY) (string)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "profitRate": "4.17" // 수익률 (%) (string)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/accounts/:id/statistics/trend`

**요약:** 계좌별 자산 기간 통계 (월별/연도별)

**설명:**
period=monthly 시 year 필수.

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `period` (`TrendPeriod`): 기간 단위 (monthly: 월별, yearly: 연도별)
- `year` (`string`) (Optional): [monthly 전용] 조회 연도 (YYYY)

**Responses:**

#### 200 - 계좌 자산 기간 통계 조회 성공

```json
{
  "period": "2026-03", // 기간 (monthly: YYYY-MM, yearly: YYYY) (string)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "profitRate": "4.17" // 수익률 (%) (string)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---
