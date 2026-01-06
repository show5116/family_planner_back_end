# 04. 자산 관리 (Assets Management)

> **상태**: ⬜ 시작 안함
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
- 전체 통계 (월별/연별 비교)

---

## 데이터베이스 (예상)

```prisma
model Account {
  id              String      @id @default(uuid())
  groupId         String
  userId          String
  name            String
  accountNumber   String?
  institution     String
  type            AccountType
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  records         AccountRecord[]
}

enum AccountType {
  SAVINGS, DEPOSIT, STOCK, FUND, REAL_ESTATE, OTHER
}

model AccountRecord {
  id        String   @id @default(uuid())
  accountId String
  recordDate DateTime
  balance   Decimal  @db.Decimal(15, 2)
  principal Decimal  @db.Decimal(15, 2)
  profit    Decimal  @db.Decimal(15, 2)
  note      String?
  createdAt DateTime @default(now())
}
```

---

## 구현 상태

### ⬜ TODO / 향후 고려
- [ ] 계좌 CRUD (생성, 조회, 수정, 삭제)
- [ ] 계좌 유형 관리 (예금, 적금, 주식, 펀드, 부동산 등)
- [ ] 자산 기록 추가 (원금, 수익금, 잔액)
- [ ] 자산 기록 목록 조회 (시간별 추이)
- [ ] 계좌별 수익률 계산
- [ ] 구성원별 자산 현황 통계
- [ ] 월별/연별 자산 변화 추이
- [ ] 포트폴리오 분석
- [ ] 자산 목표 설정 및 달성률
- [ ] 자산 알림 (목표 달성, 손실 발생 등)

---

## API 엔드포인트 (예상)

| Method | Endpoint                       | 설명           | 권한              |
| ------ | ------------------------------ | -------------- | ----------------- |
| POST   | `/assets/accounts`             | 계좌 생성      | JWT, Group Member |
| GET    | `/assets/accounts`             | 계좌 목록      | JWT, Group Member |
| GET    | `/assets/accounts/:id`         | 계좌 상세      | JWT, Group Member |
| PATCH  | `/assets/accounts/:id`         | 계좌 수정      | JWT, Owner        |
| DELETE | `/assets/accounts/:id`         | 계좌 삭제      | JWT, Owner        |
| POST   | `/assets/accounts/:id/records` | 자산 기록 추가 | JWT, Owner        |
| GET    | `/assets/accounts/:id/records` | 자산 기록 목록 | JWT, Group Member |
| GET    | `/assets/statistics`           | 통계 조회      | JWT, Group Member |

---

**Last Updated**: 2025-12-04
