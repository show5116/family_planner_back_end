# 07. 투자 지표 - 외부 API 전략

> 관련 기능 문서: [07-investment-indicators.md](07-investment-indicators.md)

---

## 사용 외부 API 목록

| API | 용도 | 비용 | 인증 |
| --- | ---- | ---- | ---- |
| Yahoo Finance (비공식) | 주식 지수, 환율, 원자재, 채권, VIX, Wilshire | 무료 | 불필요 |
| CoinGecko API | 비트코인 (원화) | 무료 | 불필요 (Pro는 키) |
| FRED API | 미국 GDP (버핏 지수용) | 무료 | API 키 필요 |
| KIS Developers | 한국채 3년물 | 무료 | API 키 필요 |

---

## Yahoo Finance

### 패키지
```bash
npm install yahoo-finance2
```

### 지원 티커 목록

| 심볼 | Yahoo 티커 | 카테고리 |
| ---- | ---------- | -------- |
| KOSPI | `^KS11` | INDEX |
| KOSDAQ | `^KQ11` | INDEX |
| SP500 | `^GSPC` | INDEX |
| NASDAQ | `^IXIC` | INDEX |
| DJI | `^DJI` | INDEX |
| NIKKEI225 | `^N225` | INDEX |
| TWSE | `^TWII` | INDEX |
| USD_KRW | `KRW=X` | CURRENCY |
| DXY | `DX-Y.NYB` | CURRENCY |
| GOLD_USD | `GC=F` | COMMODITY |
| SILVER | `SI=F` | COMMODITY |
| WTI | `CL=F` | COMMODITY |
| COPPER | `HG=F` | COMMODITY |
| US10Y | `^TNX` | BOND |
| VIX | `^VIX` | VOLATILITY |
| BUFFETT_US (Wilshire) | `^W5000` | MACRO |

### 사용 예시
```typescript
import yahooFinance from 'yahoo-finance2';

// 단일 조회
const quote = await yahooFinance.quote('^KS11');
console.log(quote.regularMarketPrice);   // 현재가
console.log(quote.regularMarketChange);  // 변동액
console.log(quote.regularMarketChangePercent); // 변동률 (%)
console.log(quote.regularMarketPreviousClose); // 전일 종가

// 다중 조회 (배치)
const quotes = await yahooFinance.quote(['^KS11', '^KQ11', '^GSPC']);
```

### 주요 응답 필드
| 필드 | 설명 |
| ---- | ---- |
| `regularMarketPrice` | 현재가 |
| `regularMarketChange` | 변동액 (전일 대비) |
| `regularMarketChangePercent` | 변동률 % |
| `regularMarketPreviousClose` | 전일 종가 |
| `regularMarketTime` | 마지막 갱신 시각 (Unix timestamp) |
| `currency` | 통화 단위 |

### 주의사항
- **비공식 API**: Yahoo Finance 공식 지원 없음, 구조 변경 가능
- **Rate Limit**: 과도한 요청 시 IP 차단 위험 → 배치 요청 + 적절한 간격 유지
- **장외 시간**: `regularMarketPrice`는 최근 거래가 반환 (실시간 아님)

---

## CoinGecko API

### 엔드포인트 (무료, 키 불필요)
```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=krw
```

### 응답 예시
```json
{
  "bitcoin": {
    "krw": 142500000
  }
}
```

### 변동률 조회 (24h 포함)
```
GET https://api.coingecko.com/api/v3/simple/price
  ?ids=bitcoin
  &vs_currencies=krw
  &include_24hr_change=true
  &include_last_updated_at=true
```

```json
{
  "bitcoin": {
    "krw": 142500000,
    "krw_24h_change": 2.35,
    "last_updated_at": 1740823200
  }
}
```

### 주의사항
- 무료 티어: **30 req/min** (초과 시 429)
- Pro 키 없이도 운영 가능 (5분 주기 수집이면 충분)

---

## FRED API (버핏 지수 — GDP)

### 환경변수
```env
FRED_API_KEY=your_32char_api_key
```

API 키 발급: https://fred.stlouisfed.org/docs/api/api_key.html (무료)

### GDP 조회 엔드포인트
```
GET https://api.stlouisfed.org/fred/series/observations
  ?series_id=GDP
  &api_key={FRED_API_KEY}
  &file_type=json
  &sort_order=desc
  &limit=1
```

### 응답 예시
```json
{
  "observations": [
    {
      "date": "2024-10-01",
      "value": "29890.4"   // 단위: 십억 달러 (Billions USD)
    }
  ]
}
```

### 버핏 지수 계산 로직
```typescript
// Wilshire 5000은 "시가총액 / 기준값" 지수 (단위: 십억 달러로 환산 필요)
// Wilshire Full Cap Index는 총 시가총액(조 달러) 근사값으로 사용
// GDP는 FRED에서 분기별 십억 달러 단위로 제공

const wilshire = quote.regularMarketPrice;  // ^W5000 지수값
const gdpBillions = parseFloat(fredObservation.value); // 십억 달러

// Wilshire 지수 * 1.2 ≈ 미국 시가총액 (조 달러)  → 스케일링 계수는 초기화 시 보정
// 버핏 지수 = 시가총액 / GDP × 100
const buffettIndex = (wilshire / gdpBillions) * 100;
```

> **⚠️ 주의**: GDP 시리즈 `GDP`는 명목 GDP (Nominal), 분기별 발표.
> 최신 GDP 발표일: 매 분기 말로부터 약 4주 후 (BEA 발표 일정 참고).

### 업데이트 전략
1. 앱 시작 시 FRED에서 최신 GDP 값 로드 → Redis/메모리 캐시 저장
2. 매 분기 체크 (1월/4월/7월/10월 첫째 주) → GDP 갱신 시 Redis 업데이트
3. 일별 Wilshire 수집 시 캐시된 GDP로 버핏 지수 자동 재계산

---

## KIS Developers (한국채 3년물)

### 환경변수
```env
KIS_APP_KEY=your_app_key
KIS_APP_SECRET=your_app_secret
```

API 키 발급: https://apiportal.koreainvestment.com

### 토큰 발급
```
POST https://openapi.koreainvestment.com:9443/oauth2/tokenP
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "appkey": "{KIS_APP_KEY}",
  "appsecret": "{KIS_APP_SECRET}"
}
```

### 채권 금리 조회 (KIS)
- **API**: 국내주식 시세 → 채권 시세 조회 활용
- 한국채 3년물 종목코드: `KR103501GCC9` (최근 발행분 기준, 주기적 확인 필요)
- 또는 한국거래소(KRX) 데이터 포털 대체 검토

> **⚠️ 주의**: KIS API는 토큰이 24시간 유효하므로 매일 갱신 필요.
> 한국채 종목코드는 신규 발행 시 변경되므로 관리 필요.

---

## 국내 금값 계산 (별도 API 없음)

```typescript
// GOLD_KRW 자동 계산
// GOLD_USD: Yahoo Finance GC=F (USD/troy oz)
// USD_KRW: Yahoo Finance KRW=X (원/달러)
// 1 troy oz = 31.1035 g

const goldPerGram = (goldUsd * usdKrw) / 31.1035;
// 예: 2650 USD/oz × 1320 원/달러 ÷ 31.1035 = 112,500 원/g
```

---

## 환경변수 요약

```env
# FRED API (버핏 지수 — GDP 수집)
FRED_API_KEY=

# KIS Developers (한국채 3년물)
KIS_APP_KEY=
KIS_APP_SECRET=

# CoinGecko, Yahoo Finance — 키 불필요
```

---

## 패키지 의존성

```bash
npm install yahoo-finance2
# axios는 이미 설치되어 있으므로 FRED, CoinGecko, KIS는 axios로 직접 호출
```

---

## NestJS 구현 구조

```typescript
// src/investment/scheduler/collectors/index.collector.ts
// Yahoo Finance 배치 호출 — 16개 티커 한 번에

const YAHOO_TICKERS = [
  '^KS11', '^KQ11', '^GSPC', '^IXIC', '^DJI',
  '^N225', '^TWII', 'KRW=X', 'DX-Y.NYB',
  'GC=F', 'SI=F', 'CL=F', 'HG=F',
  '^TNX', '^VIX', '^W5000',
];

// CoinGecko — 비트코인 단독
// FRED — GDP 분기별
// KIS — 한국채 3년물 일별
// 국내 금값, 버핏 지수 — 계산값 (별도 수집 없음)
```

---

**Last Updated**: 2026-03-01
