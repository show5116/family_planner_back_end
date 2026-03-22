# 07. 투자 지표 (Investment Indicators)

> **상태**: ✅ 완료
> **Phase**: Phase 4

---

## 개요

KOSPI, NASDAQ, 환율, 원자재, 채권, 변동성 지수, 암호화폐 등 주요 투자 지표를 외부 API에서 주기적으로 수집하여 제공하는 시스템입니다.
사용자는 관심 지표를 즐겨찾기로 등록하고, 최신 시세 및 변동률을 한눈에 확인할 수 있습니다.

---

## 주요 기능

### 지표 조회
- 전체 지표 목록 조회 (카테고리별 분류)
- 지표별 현재 시세, 전일 대비 변동 (금액/퍼센트)
- 최근 N일 히스토리 조회 (차트용 시계열 데이터)

### 즐겨찾기
- 사용자별 관심 지표 등록/해제
- 즐겨찾기 지표 목록 조회

### 데이터 수집 (백엔드 내부)
- 외부 API를 통한 주기적 시세 수집 (스케줄러)
- 수집 실패 시 재시도 및 에러 로깅

---

## 지원 지표 목록 (19개)

| 카테고리 | 지표명 | 심볼 | 단위 | 데이터 소스 |
| -------- | ------ | ---- | ---- | ----------- |
| INDEX    | 코스피 | KOSPI | pt | Yahoo Finance `^KS11` |
| INDEX    | 코스닥 | KOSDAQ | pt | Yahoo Finance `^KQ11` |
| INDEX    | S&P 500 | SP500 | pt | Yahoo Finance `^GSPC` |
| INDEX    | 나스닥 | NASDAQ | pt | Yahoo Finance `^IXIC` |
| INDEX    | 다우존스 | DJI | pt | Yahoo Finance `^DJI` |
| INDEX    | 니케이 225 | NIKKEI225 | pt | Yahoo Finance `^N225` |
| INDEX    | 대만 가권 지수 | TWSE | pt | Yahoo Finance `^TWII` |
| CURRENCY | 원/달러 환율 | USD_KRW | 원 | Yahoo Finance `KRW=X` |
| CURRENCY | 달러 인덱스 | DXY | pt | Yahoo Finance `DX-Y.NYB` |
| COMMODITY | 금 (국제) | GOLD_USD | USD/oz | Yahoo Finance `GC=F` |
| COMMODITY | 금 (국내 현물) | GOLD_KRW_SPOT | 원/g | 한국금거래소 스크래핑 (koreagoldx.co.kr) |
| COMMODITY | 은 | SILVER | USD/oz | Yahoo Finance `SI=F` |
| COMMODITY | 국제 유가 (WTI) | WTI | USD/bbl | Yahoo Finance `CL=F` |
| COMMODITY | 구리 | COPPER | USD/lb | Yahoo Finance `HG=F` |
| BOND     | 미국채 10년물 | US10Y | % | Yahoo Finance `^TNX` |
| BOND     | 한국채 3년물 | KR3Y | % | 한국은행 경제통계시스템 (BOK Open API) |
| VOLATILITY | VIX 지수 | VIX | pt | Yahoo Finance `^VIX` |
| CRYPTO   | 비트코인 | BTC_KRW | 원 | CoinGecko `bitcoin` (vs KRW) |
| MACRO    | 버핏 지수 (미국) | BUFFETT_US | % | 계산값 — Wilshire 5000 / 미국 GDP × 100 |

> **국내 금값 수집 방식**: `GOLD_KRW_SPOT` — 한국금거래소(koreagoldx.co.kr) 순금 매수가(원/g) 스크래핑.
> KST 09:00~16:00 평일에만 15분 주기로 수집.

> **버핏 지수 산출 방식**: `BUFFETT_US = Wilshire 5000 지수(^W5000) / 미국 명목 GDP(FRED: GDP) × 100`
> Wilshire 5000은 Yahoo Finance에서 매일 수집, GDP는 FRED API(무료)에서 분기별 수집.
> **⚠️ GDP가 분기별 발표**이므로 지수는 분기 1회 갱신됨. 단, Wilshire 일별 변동은 분기 중간값으로 근사 계산 가능.

---

## 데이터베이스

```prisma
model Indicator {
  id          String        @id @default(uuid())
  symbol      String        @unique @db.VarChar(20)
  name        String        @db.VarChar(100)
  nameKo      String        @db.VarChar(100)
  category    IndicatorCategory
  unit        String        @db.VarChar(20)
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  prices      IndicatorPrice[]
  bookmarks   IndicatorBookmark[]

  @@index([category])
  @@index([isActive])
  @@map("indicators")
}

enum IndicatorCategory {
  INDEX
  CURRENCY
  COMMODITY
  BOND
  VOLATILITY
  CRYPTO
  MACRO
}

model IndicatorPrice {
  id          String    @id @default(uuid())
  indicatorId String
  price       Decimal   @db.Decimal(20, 6)
  prevPrice   Decimal?  @db.Decimal(20, 6)  // 전일 종가
  change      Decimal?  @db.Decimal(20, 6)  // 변동액
  changeRate  Decimal?  @db.Decimal(10, 4)  // 변동률 (%)
  recordedAt  DateTime                       // 수집 시각
  createdAt   DateTime  @default(now())

  indicator   Indicator @relation(fields: [indicatorId], references: [id], onDelete: Cascade)

  @@index([indicatorId, recordedAt(sort: Desc)])
  @@index([recordedAt(sort: Desc)])
  @@map("indicator_prices")
}

model IndicatorBookmark {
  id          String    @id @default(uuid())
  userId      String
  indicatorId String
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  indicator   Indicator @relation(fields: [indicatorId], references: [id], onDelete: Cascade)

  @@unique([userId, indicatorId])
  @@index([userId])
  @@map("indicator_bookmarks")
}
```

---

## 구현 상태

### ✅ 완료
- [x] DB 스키마 설계 및 마이그레이션
- [x] 외부 API 연동
  - [x] Yahoo Finance (지수, 환율, 원자재, 채권, VIX, Wilshire 5000)
  - [x] CoinGecko (비트코인 BTC/KRW)
  - [x] FRED API (미국 GDP — 버핏 지수 계산용)
  - [x] BOK Open API (한국채 3년물)
  - [x] 한국금거래소 스크래핑 (국내 금 현물가 GOLD_KRW_SPOT)
- [x] 스케줄러 구현 (Redis 분산 락 적용)
  - [x] Yahoo Finance 전체 수집 (5분마다)
  - [x] 비트코인 수집 (1시간마다)
  - [x] 버핏 지수 수집 (매일 06:00 KST)
  - [x] 국내 금 현물가 수집 (15분마다, 평일 장중)
  - [x] 한국채 3년물 수집 (매일 18:00 KST 장 마감 후)
- [x] 지표 목록 조회 API
- [x] 지표 상세 + 최신 시세 조회 API
- [x] 지표 시세 히스토리 조회 API (시계열)
- [x] 즐겨찾기 등록/해제 API
- [x] 즐겨찾기 목록 조회 API
- [x] 즐겨찾기 순서 변경 API
- [x] 어드민 과거 데이터 일괄 초기화 API

---

## API 엔드포인트

| Method | Endpoint                               | 설명                         | 권한        |
| ------ | -------------------------------------- | ---------------------------- | ----------- |
| GET    | `/indicators`                          | 전체 지표 목록 + 최신 시세   | JWT         |
| GET    | `/indicators/bookmarks`                | 즐겨찾기 목록 + 최신 시세    | JWT         |
| PATCH  | `/indicators/bookmarks/reorder`        | 즐겨찾기 순서 변경           | JWT         |
| GET    | `/indicators/:symbol`                  | 지표 상세 + 최신 시세        | JWT         |
| GET    | `/indicators/:symbol/history`          | 시세 히스토리 (시계열)       | JWT         |
| POST   | `/indicators/:symbol/bookmark`         | 즐겨찾기 등록                | JWT         |
| DELETE | `/indicators/:symbol/bookmark`         | 즐겨찾기 해제                | JWT         |
| POST   | `/indicators/admin/init-history`       | 과거 데이터 일괄 초기화      | JWT, Admin  |

---

## 외부 API 후보

### 국내 지수 (KOSPI, KOSDAQ)
- **한국투자증권 Open API** (KIS Developers) — 실시간/일별 시세
- **FinanceDataReader** (Python 라이브러리, 별도 서버 필요)
- **네이버 금융 비공개 API** — 비공식, 안정성 낮음

### 해외 지수 / 환율 / 원자재 / 암호화폐
- **Yahoo Finance API** (비공식, 무료) — `yahoo-finance2` npm 패키지 활용
- **Alpha Vantage** — 무료 티어 25req/day, 유료 플랜 있음
- **ExchangeRate-API** — 환율 전용, 무료 1500req/month
- **CoinGecko API** — 암호화폐 전용, 무료 티어 넉넉함
- **FRED API** (St. Louis Fed) — 미국 경제 지표, 무료 API 키 발급

### 권장 조합 (무료 티어 기준)

| 데이터 | 추천 API | 비고 |
| ------ | -------- | ---- |
| KOSPI / KOSDAQ | Yahoo Finance (`^KS11`, `^KQ11`) | 또는 KIS Developers |
| S&P500 / NASDAQ / DJI / VIX | Yahoo Finance (`^GSPC`, `^IXIC`, `^DJI`, `^VIX`) | — |
| 니케이 225 | Yahoo Finance (`^N225`) | — |
| 대만 가권 지수 | Yahoo Finance (`^TWII`) | — |
| 원/달러 환율 | Yahoo Finance (`KRW=X`) | — |
| 달러 인덱스 | Yahoo Finance (`DX-Y.NYB`) | — |
| 금(국제) / 은 / WTI / 구리 | Yahoo Finance (`GC=F`, `SI=F`, `CL=F`, `HG=F`) | — |
| 금(국내 현물, GOLD_KRW_SPOT) | 한국금거래소 스크래핑 (koreagoldx.co.kr) | 평일 장중 수집 |
| 미국채 10년물 | Yahoo Finance (`^TNX`) | — |
| 한국채 3년물 | BOK Open API | 한국은행 경제통계시스템 |
| 비트코인 | CoinGecko (`bitcoin`, vs KRW) | 무료 티어 충분 |
| 버핏 지수 | Yahoo Finance (`^W5000`) + FRED API (`GDP`) | 계산값, 분기 1회 갱신 |

> **핵심 전략**: Yahoo Finance로 대부분 커버, 한국채는 BOK API, 국내 금은 한국금거래소 스크래핑, 버핏 지수는 Yahoo Finance + FRED 조합

---

## 데이터 수집 전략

### 수집 주기 (실제 구현)
| 크론잡 | 대상 지표 | 수집 주기 | 비고 |
| ------ | --------- | --------- | ---- |
| `collectYahoo` | INDEX, CURRENCY, COMMODITY(국제), BOND(미국채), VOLATILITY | 5분마다 (`*/5 * * * *`) | Yahoo Finance, Redis 분산 락 |
| `collectCrypto` | BTC_KRW | 1시간마다 (`0 * * * *`) | CoinGecko, Redis 분산 락 |
| `collectMacro` | BUFFETT_US | 매일 06:00 KST (`0 21 * * *` UTC) | Yahoo Wilshire + FRED GDP, Redis 분산 락 |
| `collectGoldSpot` | GOLD_KRW_SPOT | 15분마다, 평일 장중 (`*/15 0-7 * * 1-5` UTC) | 한국금거래소 스크래핑, Redis 분산 락 |
| `collectBond` | KR3Y | 매일 18:00 KST 장 마감 후 (`0 9 * * 1-5` UTC) | BOK Open API, Redis 분산 락 |

### 캐싱 전략
- 최신 시세: Redis 캐시 (TTL 5분)
- 히스토리 데이터: DB 직접 조회 (인덱스 활용)
- 지표 목록: Redis 캐시 (TTL 1시간, 거의 변하지 않음)

### 스케줄러 구조 (실제 구현)
```
InvestmentScheduler (Redis 분산 락으로 중복 실행 방지)
  ├ collectYahoo()     — Yahoo Finance 전체 (5분마다) — 지수, 환율, 원자재, 미국채, VIX
  ├ collectCrypto()    — CoinGecko BTC/KRW (1시간마다)
  ├ collectMacro()     — 버핏 지수 (매일 06:00 KST) — Yahoo Wilshire + FRED GDP 계산
  ├ collectGoldSpot()  — 국내 금 현물가 (15분마다, 평일 장중) — 한국금거래소 스크래핑
  └ collectBond()      — 한국채 3년물 (매일 18:00 KST) — BOK Open API
```

---

## 응답 예시

### GET /indicators (목록 + 최신 시세)
```json
[
  {
    "symbol": "KOSPI",
    "name": "KOSPI",
    "nameKo": "코스피",
    "category": "INDEX",
    "unit": "pt",
    "price": "2580.34",
    "prevPrice": "2550.12",
    "change": "30.22",
    "changeRate": "1.19",
    "recordedAt": "2026-03-01T09:05:00.000Z",
    "isBookmarked": false
  },
  {
    "symbol": "USD_KRW",
    "name": "USD/KRW",
    "nameKo": "원/달러 환율",
    "category": "CURRENCY",
    "unit": "원",
    "price": "1320.50",
    "prevPrice": "1315.00",
    "change": "5.50",
    "changeRate": "0.42",
    "recordedAt": "2026-03-01T09:10:00.000Z",
    "isBookmarked": true
  }
]
```

### GET /indicators/:symbol/history?days=30
```json
{
  "symbol": "KOSPI",
  "nameKo": "코스피",
  "history": [
    { "price": "2580.34", "recordedAt": "2026-03-01T00:00:00.000Z" },
    { "price": "2550.12", "recordedAt": "2026-02-28T00:00:00.000Z" }
  ]
}
```

---

## 구현 파일

```
src/investment/
  dto/
    indicator-response.dto.ts
    indicator-history-query.dto.ts
    historical-init-query.dto.ts
    reorder-bookmarks.dto.ts
  scheduler/
    investment.scheduler.ts
    collectors/
      yahoo.collector.ts      — 지수, 환율, 원자재, 미국채, VIX, Wilshire 5000 (Yahoo Finance)
      coingecko.collector.ts  — 비트코인 BTC/KRW (CoinGecko)
      fred.collector.ts       — 미국 GDP (FRED API — 버핏 지수 계산용)
      bok.collector.ts        — 한국채 3년물 KR3Y (BOK Open API)
      korea-gold.collector.ts — 국내 금 현물가 GOLD_KRW_SPOT (한국금거래소 스크래핑)
  investment.controller.ts
  investment.service.ts
  investment.module.ts
```

---

**Last Updated**: 2026-03-22
