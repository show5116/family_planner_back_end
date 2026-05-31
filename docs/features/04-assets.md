# 04. 자산 관리 (Assets Management)

> **상태**: ✅ 완료
> **Phase**: Phase 4

---

## 개요

가족 구성원별 계좌 자산을 관리하고 원금, 수익금, 수익률을 추적하는 시스템입니다.

---

## 주요 기능

### 데이터 입력
- 계좌별 자산 데이터 입력 (계좌명, 금융 기관, 유형, 잔액)
- 원금 및 수익금 내역 기록
- 출금 기록 추가 (출금일 이후 원금/수익 자동 재계산)

### 데이터 조회 및 분석
- 계좌별 원금, 수익금, 수익률 표시
- 시간별 자산 변화 추이 (월별/연도별 기간 통계)
- 구성원별 자산 현황 및 포트폴리오
- 전체 통계 (유형별 분류, 종목별 집계, 적립금 연동)

---

## 데이터베이스

```prisma
model Account {
  id            String              @id @default(uuid())
  groupId       String
  userId        String
  name          String              @db.VarChar(100)
  accountNumber String?             @db.VarChar(50)
  institution   String?             @db.VarChar(100)
  type          AccountType
  sortOrder     Int                 @default(0)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  group         Group               @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  records       AccountRecord[]
  withdrawals   AccountWithdrawal[]
  holdings      AccountHolding[]

  @@index([groupId, sortOrder])
  @@index([userId])
  @@map("accounts")
}

enum AccountType {
  SAVINGS
  DEPOSIT
  STOCK
  FUND
  REAL_ESTATE
  OTHER
  GOLD         // 실물 금 — gramWeight × GOLD_KRW_SPOT으로 매달 자동 계산
}

model AccountRecord {
  id         String   @id @default(uuid())
  accountId  String
  recordDate DateTime @db.Date
  balance    Decimal  @db.Decimal(15, 2)
  principal  Decimal  @db.Decimal(15, 2)
  profit     Decimal  @db.Decimal(15, 2)
  gramWeight Decimal? @db.Decimal(10, 4)   // GOLD 타입 기록 전용: 보유 그램수
  note       String?  @db.VarChar(200)
  createdAt  DateTime @default(now())

  account    Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, recordDate])
  @@index([accountId, recordDate(sort: Desc)])
  @@map("account_records")
}

model AccountWithdrawal {
  id             String   @id @default(uuid())
  accountId      String
  withdrawalDate DateTime @db.Date
  amount         Decimal  @db.Decimal(15, 2)
  note           String?  @db.VarChar(200)
  createdAt      DateTime @default(now())

  account        Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, withdrawalDate(sort: Desc)])
  @@map("account_withdrawals")
}

model AccountHoldingRecord {
  id         String   @id @default(uuid())
  accountId  String
  recordDate DateTime @db.Date
  name       String   @db.VarChar(100)
  ticker     String?  @db.VarChar(20)
  amount     Decimal  @db.Decimal(15, 2)
  ratio      Decimal  @db.Decimal(5, 2)   // amount / 해당 날짜 AccountRecord.balance × 100 자동 계산
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  account    Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, recordDate, name])
  @@index([accountId, recordDate(sort: Desc)])
  @@map("account_holding_records")
}
```

---

## 구현 상태

### ✅ 완료
- [x] 계좌 CRUD (생성, 조회, 수정, 삭제)
- [x] 계좌 순서 변경 (`sortOrder`)
- [x] 계좌 유형 관리 (예금, 적금, 주식, 펀드, 부동산 등)
- [x] 자산 기록 추가/삭제 (원금, 수익금, 잔액)
- [x] 자산 기록 목록 조회 (시간별 추이)
- [x] 계좌별 수익률 계산
- [x] 출금 기록 CRUD (출금일 이후 원금/수익 자동 재계산 및 원복)
- [x] 구성원별 자산 현황 통계 (유형별 분류)
- [x] 그룹/계좌별 기간 통계 (월별/연도별)
- [x] 실물 금 자산 (GOLD 타입): gramWeight 입력 → GOLD_KRW_SPOT 기준 매달 1일 자동 기록 생성
- [x] 포트폴리오 종목 기록 (AccountHoldingRecord): 날짜·종목명·금액 입력 → ratio 자동 계산, 종목 사전 등록 불필요
- [x] 종목명 자동완성용 API: 해당 계좌에서 사용된 종목명 목록 반환
- [x] 통계 API byHolding: 계좌+종목명별 최신 기록 금액 합산 (금액 내림차순 정렬)
- [x] 적립금 연동: 통계 API에 `savingsTotal`, `savingsGoals` 항목 포함

### ⬜ 향후 고려
- [ ] 자산 목표 설정 및 달성률
- [ ] 자산 알림 (목표 달성, 손실 발생 등)

---

## API 엔드포인트

| Method | Endpoint                                    | 설명                              | 권한              |
| ------ | ------------------------------------------- | --------------------------------- | ----------------- |
| POST   | `/assets/accounts`                          | 계좌 생성                         | JWT, Group Member |
| GET    | `/assets/accounts`                          | 계좌 목록                         | JWT, Group Member |
| GET    | `/assets/accounts/:id`                      | 계좌 상세                         | JWT, Group Member |
| PATCH  | `/assets/accounts/reorder`                  | 그룹 계좌 순서 변경               | JWT, Group Member |
| PATCH  | `/assets/accounts/:id`                      | 계좌 수정                         | JWT, Owner        |
| DELETE | `/assets/accounts/:id`                      | 계좌 삭제                         | JWT, Owner        |
| POST   | `/assets/accounts/:id/records`              | 자산 기록 추가                    | JWT, Owner        |
| GET    | `/assets/accounts/:id/records`              | 자산 기록 목록                    | JWT, Group Member |
| DELETE | `/assets/accounts/:id/records/:recordId`    | 자산 기록 삭제                    | JWT, Owner        |
| POST   | `/assets/accounts/:id/withdrawals`          | 출금 기록 추가 (이후 기록 재계산) | JWT, Owner        |
| GET    | `/assets/accounts/:id/withdrawals`          | 출금 기록 목록                    | JWT, Group Member |
| DELETE | `/assets/accounts/:id/withdrawals/:wId`     | 출금 기록 삭제 (이후 기록 원복)   | JWT, Owner        |
| GET    | `/assets/accounts/:id/holding-records/names`              | 종목명 목록 조회 (자동완성용)                              | JWT, Group Member |
| GET    | `/assets/accounts/:id/holding-records`                    | 종목 기록 목록 (recordDate 쿼리로 날짜 필터 가능)          | JWT, Group Member |
| POST   | `/assets/accounts/:id/holding-records`                    | 종목 기록 추가 (name·ticker·amount → ratio 자동 계산)     | JWT, Owner        |
| PATCH  | `/assets/accounts/:id/holding-records/:recordId`          | 종목 기록 수정 (name·ticker·amount)                       | JWT, Owner        |
| DELETE | `/assets/accounts/:id/holding-records/:recordId`          | 종목 기록 삭제                                             | JWT, Owner        |
| GET    | `/assets/gold/current-price`                | 금 현물가 조회 (원/g)             | JWT               |
| GET    | `/assets/statistics`                        | 통계 조회 (적립금·종목 포함)      | JWT, Group Member |
| GET    | `/assets/statistics/trend`                  | 그룹 전체 자산 기간 통계          | JWT, Group Member |
| GET    | `/assets/accounts/:id/statistics/trend`     | 계좌별 자산 기간 통계             | JWT, Group Member |

### 쿼리 파라미터

**`GET /assets/statistics/trend`**
| 파라미터   | 필수 | 설명                                              |
| ---------- | ---- | ------------------------------------------------- |
| `groupId`  | ✅   | 그룹 ID                                           |
| `period`   | ✅   | `monthly` 또는 `yearly`                           |
| `year`     | monthly 시 ✅ | 조회 연도 (YYYY)                        |
| `accountIds` | ❌ | 콤마 구분 계좌 ID 목록 (미입력 시 그룹 전체)     |

**`GET /assets/accounts/:id/statistics/trend`**
| 파라미터 | 필수 | 설명                            |
| -------- | ---- | ------------------------------- |
| `period` | ✅   | `monthly` 또는 `yearly`         |
| `year`   | monthly 시 ✅ | 조회 연도 (YYYY)   |

---

## 구현 파일

```
src/assets/
  dto/
    create-account.dto.ts
    update-account.dto.ts
    create-account-record.dto.ts
    create-account-withdrawal.dto.ts
    create-account-holding.dto.ts
    update-account-holding.dto.ts
    reorder-accounts.dto.ts
    reorder-account-holdings.dto.ts
    account-query.dto.ts
    assets-query.dto.ts          — StatisticsQueryDto, TrendQueryDto, AccountTrendQueryDto
    assets-response.dto.ts       — AccountHoldingDto, HoldingStatDto, AccountWithdrawalDto, TrendItemDto 포함
  scheduler/
    gold-asset.scheduler.ts  — 매달 1일 KST 금 자산 자동 기록 생성
  assets.controller.ts
  assets.service.ts
  assets.module.ts
```

---

## 주요 구현 내용

### 수익률 계산
```typescript
profitRate = principal > 0 ? (profit / principal) * 100 : 0
```

### 통계 로직
- 계좌별 최신 기록(balance, principal, profit) 기준 집계
- `AccountType` 기준 유형별 그룹핑
- 전체 총합 계산
- **적립금 연동**: `includeInAssets = true`인 `SavingsGoal`의 `currentAmount`를 별도 항목으로 포함
  - `savingsTotal`: 연동된 적립금 합계
  - `savingsGoals`: 목표별 이름 + 잔액 상세 목록
  - 기존 `totalBalance`와 별도 표시 (이중 계산 방지)

**응답 예시 (`GET /assets/statistics`)**
```json
{
  "totalBalance": "50000000.00",
  "totalPrincipal": "48000000.00",
  "totalProfit": "2000000.00",
  "profitRate": "4.17",
  "accountCount": 5,
  "byType": [...],
  "byHolding": [...],
  "savingsTotal": "3500000.00",
  "savingsGoals": [
    { "id": "uuid-1", "name": "여름 휴가", "currentAmount": "1500000.00" },
    { "id": "uuid-2", "name": "비상금", "currentAmount": "2000000.00" }
  ]
}
```

### 기간 통계 로직
- 각 기간(월/연)마다 계좌별 마지막 기록을 합산
- `period=monthly` 시 `year` 파라미터 필수
- `accountIds` 파라미터로 특정 계좌만 필터링 가능

### 권한 구조
- 계좌 목록/상세/기록 조회: 그룹 멤버 전체
- 계좌 생성, 순서 변경: 그룹 멤버 전체
- 계좌 수정/삭제/기록 추가·삭제/출금 CRUD: 계좌 소유자만

---

### 실물 금 자산 (GOLD 타입)

- `type: GOLD`로 계좌 생성 (gramWeight는 AccountRecord에 기록)
- `GET /assets/gold/current-price` — 현재 GOLD_KRW_SPOT 가격(원/g) 반환. UI가 임시 원금 계산에 사용
- 사용자가 원금을 직접 수정하면 그 값이 최초 AccountRecord의 principal로 확정
- 스케줄러(`GoldAssetScheduler`): 매달 1일 00:00 KST — `gramWeight × GOLD_KRW_SPOT` = balance 로 AccountRecord 자동 생성
  - principal은 직전 기록의 principal 이어받음 (없으면 해당 달 balance로 초기화)
  - 이미 해당 날짜 기록 존재 시 스킵 (중복 방지)
  - Redis 분산 락 적용

### 출금 기록 (AccountWithdrawal)

- 출금 추가 시 출금일 이후의 모든 AccountRecord에 대해 `principal` 및 `profit` 자동 재계산
- 출금 삭제 시 출금일 이후 기록 원복
- 동일 날짜에 여러 출금 기록 허용

### 포트폴리오 종목 기록 (AccountHoldingRecord)

- 종목 사전 등록 없이 기록 추가 시 name·ticker·amount를 직접 입력
- `ratio` = `amount / 해당 날짜 AccountRecord.balance × 100` 자동 계산
- 해당 `recordDate`의 `AccountRecord`가 반드시 먼저 존재해야 함 (없으면 400)
- amount가 계좌 잔액을 초과하면 400 오류
- 동일 `accountId + recordDate + name` 중복 불가 (409 오류)
- 수정 시: name 변경 → 같은 날짜 중복 검사, amount 변경 → ratio 재계산
- `GET .../holding-records/names`: 해당 계좌의 종목명+티커 목록 반환 (UI 자동완성용)

**통계 byHolding**
- 계좌+종목명별 **최신 recordDate** 기준 amount를 그룹 전체 합산
- `estimatedAmount` = 최신 기록 amount 합산
- `globalRatio` = estimatedAmount / 전체 자산 총잔액 × 100
- 금액 내림차순 정렬

**Last Updated**: 2026-05-31
