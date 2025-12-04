# 04. 자산 관리 (Assets Management)

> **상태**: ⬜ 시작 안함
> **우선순위**: Medium
> **담당 Phase**: Phase 3

---

## 📋 개요

가족 구성원별 계좌 자산을 관리하고 원금, 수익금, 수익률을 추적하는 시스템입니다.

---

## ⬜ 데이터 입력

### 계좌별 자산 데이터 입력
- 매달 일정한 날마다 계좌별 자산 데이터 입력
- 추가한 원금 입력
- 수익금 입력 (이자나 주식 수익금)

### 필요한 정보
- 계좌 이름/번호
- 금융 기관
- 계좌 유형 (예금, 적금, 주식, 펀드 등)
- 현재 잔액
- 원금 추가 내역
- 수익/손실 금액

---

## ⬜ 데이터 조회 및 분석

### 계좌별 통계
- 계좌별 원금, 수익금, 수익률 표시
- 시간별 자산 변화 추이

### 구성원별 통계
- 가족 구성원별 자산 현황
- 개인별 포트폴리오

### 전체 통계
- 전체 원금 및 수익률 통계
- 표 및 차트 형식으로 시각화
- 월별/연별 비교

---

## 🗄️ 데이터베이스 스키마 (예상)

```prisma
model Account {
  id              String   @id @default(uuid())
  groupId         String
  userId          String
  name            String
  accountNumber   String?
  institution     String
  type            AccountType
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  group           Group    @relation(fields: [groupId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
  records         AccountRecord[]
}

enum AccountType {
  SAVINGS
  DEPOSIT
  STOCK
  FUND
  REAL_ESTATE
  OTHER
}

model AccountRecord {
  id              String   @id @default(uuid())
  accountId       String
  recordDate      DateTime
  balance         Decimal  @db.Decimal(15, 2)
  principal       Decimal  @db.Decimal(15, 2)
  profit          Decimal  @db.Decimal(15, 2)
  note            String?
  createdAt       DateTime @default(now())

  account         Account  @relation(fields: [accountId], references: [id])
}
```

---

## 📝 API 엔드포인트 (예상)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/assets/accounts` | 계좌 생성 | JWT, Group Member |
| GET | `/assets/accounts` | 계좌 목록 | JWT, Group Member |
| GET | `/assets/accounts/:id` | 계좌 상세 | JWT, Group Member |
| PATCH | `/assets/accounts/:id` | 계좌 수정 | JWT, Owner |
| DELETE | `/assets/accounts/:id` | 계좌 삭제 | JWT, Owner |
| POST | `/assets/accounts/:id/records` | 자산 기록 추가 | JWT, Owner |
| GET | `/assets/accounts/:id/records` | 자산 기록 목록 | JWT, Group Member |
| GET | `/assets/statistics` | 통계 조회 | JWT, Group Member |

---

## 🔮 향후 계획

1. Prisma 스키마 설계
2. 자산 관리 모듈 생성
3. CRUD API 구현
4. 통계 및 분석 로직 구현
5. 차트 데이터 제공 API

---

**Last Updated**: 2025-12-04
