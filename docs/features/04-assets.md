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

### 데이터 조회 및 분석
- 계좌별 원금, 수익금, 수익률 표시
- 시간별 자산 변화 추이
- 구성원별 자산 현황 및 포트폴리오
- 전체 통계 (유형별 분류)

---

## 데이터베이스

```prisma
model Account {
  id            String        @id @default(uuid())
  groupId       String
  userId        String
  name          String        @db.VarChar(100)
  accountNumber String?       @db.VarChar(50)
  institution   String        @db.VarChar(100)
  type          AccountType
  gramWeight    Decimal?      @db.Decimal(10, 4)   // GOLD 타입 전용: 보유 그램수
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  group         Group         @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  records       AccountRecord[]
  holdings      AccountHolding[]

  @@index([groupId])
  @@index([userId])
  @@map("accounts")
}

model AccountHolding {
  id        String   @id @default(uuid())
  accountId String
  name      String   @db.VarChar(100)
  ticker    String?  @db.VarChar(20)
  ratio     Decimal  @db.Decimal(5, 2)   // 비율 (%), 합계 100 이하
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  account   Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, sortOrder])
  @@map("account_holdings")
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
  note       String?  @db.VarChar(200)
  createdAt  DateTime @default(now())

  account    Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId, recordDate(sort: Desc)])
  @@map("account_records")
}
```

---

## 구현 상태

### ✅ 완료
- [x] 계좌 CRUD (생성, 조회, 수정, 삭제)
- [x] 계좌 유형 관리 (예금, 적금, 주식, 펀드, 부동산 등)
- [x] 자산 기록 추가 (원금, 수익금, 잔액)
- [x] 자산 기록 목록 조회 (시간별 추이)
- [x] 계좌별 수익률 계산
- [x] 구성원별 자산 현황 통계 (유형별 분류)
- [x] 실물 금 자산 (GOLD 타입): gramWeight 입력 → GOLD_KRW_SPOT 기준 매달 1일 자동 기록 생성
- [x] 계좌 내 포트폴리오 종목 관리 (AccountHolding): 종목명·티커·비율(%) 입력, 합계 100% 초과 방지
- [x] 통계 API byHolding: 전체 자산 기준 종목별 추정 금액 및 비율 집계

### ⬜ 향후 고려
- [ ] 월별/연별 자산 변화 추이
- [ ] 자산 목표 설정 및 달성률
- [ ] 자산 알림 (목표 달성, 손실 발생 등)

### 🟨 진행 예정
- [ ] 적립금 연동: 통계 API에 `savingsTotal`, `savingsGoals` 항목 추가

---

## API 엔드포인트

| Method | Endpoint                          | 설명           | 권한              |
| ------ | --------------------------------- | -------------- | ----------------- |
| POST   | `/assets/accounts`                | 계좌 생성      | JWT, Group Member |
| GET    | `/assets/accounts`                | 계좌 목록      | JWT, Group Member |
| GET    | `/assets/accounts/:id`            | 계좌 상세      | JWT, Group Member |
| PATCH  | `/assets/accounts/:id`            | 계좌 수정      | JWT, Owner        |
| DELETE | `/assets/accounts/:id`            | 계좌 삭제      | JWT, Owner        |
| POST   | `/assets/accounts/:id/records`    | 자산 기록 추가 | JWT, Owner        |
| GET    | `/assets/accounts/:id/records`    | 자산 기록 목록 | JWT, Group Member |
| GET    | `/assets/accounts/:id/holdings`              | 종목 목록 조회        | JWT, Group Member |
| POST   | `/assets/accounts/:id/holdings`              | 종목 추가             | JWT, Owner        |
| PATCH  | `/assets/accounts/:id/holdings/reorder`      | 종목 순서 변경        | JWT, Owner        |
| PATCH  | `/assets/accounts/:id/holdings/:holdingId`   | 종목 수정             | JWT, Owner        |
| DELETE | `/assets/accounts/:id/holdings/:holdingId`   | 종목 삭제             | JWT, Owner        |
| GET    | `/assets/gold/current-price`      | 금 현물가 조회 (원/g) | JWT        |
| GET    | `/assets/statistics`              | 통계 조회 (적립금·종목 포함) | JWT, Group Member |

---

## 구현 파일

```
src/assets/
  dto/
    create-account.dto.ts
    update-account.dto.ts
    create-account-record.dto.ts
    create-account-holding.dto.ts
    update-account-holding.dto.ts
    reorder-account-holdings.dto.ts
    account-query.dto.ts
    assets-response.dto.ts        — AccountHoldingDto, HoldingStatDto 포함
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
  "savingsTotal": "3500000.00",
  "savingsGoals": [
    { "id": "uuid-1", "name": "여름 휴가", "currentAmount": "1500000.00" },
    { "id": "uuid-2", "name": "비상금", "currentAmount": "2000000.00" }
  ]
}
```

### 권한 구조
- 계좌 목록/상세/기록 조회: 그룹 멤버 전체
- 계좌 생성: 그룹 멤버 전체 (본인 명의로 생성)
- 계좌 수정/삭제/기록 추가: 계좌 소유자만

---

### 실물 금 자산 (GOLD 타입)

- `type: GOLD` + `gramWeight` (g) 로 계좌 생성
- `GET /assets/gold/current-price` — 현재 GOLD_KRW_SPOT 가격(원/g) 반환. UI가 임시 원금 계산에 사용
- 사용자가 원금을 직접 수정하면 그 값이 최초 AccountRecord의 principal로 확정
- 스케줄러(`GoldAssetScheduler`): 매달 1일 00:00 KST — `gramWeight × GOLD_KRW_SPOT` = balance 로 AccountRecord 자동 생성
  - principal은 직전 기록의 principal 이어받음 (없으면 해당 달 balance로 초기화)
  - 이미 해당 날짜 기록 존재 시 스킵 (중복 방지)
  - Redis 분산 락 적용

### 포트폴리오 종목 (AccountHolding)

- 계좌 내 종목·자산 구성을 비율(%)로 기록
- `name` (필수) + `ticker` (선택, 표시용) + `ratio` (0.01~100%)
- 계좌 내 holding 비율 합계가 100%를 초과하면 400 오류
- 동일한 종목명+티커 조합은 `byHolding` 통계에서 합산됨
- 추정 금액 = `AccountRecord.balance × ratio / 100`
- `globalRatio` = 해당 종목 추정 금액 / 전체 자산 총잔액 × 100

**Last Updated**: 2026-05-11
