# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 투자지표

**Base Path:** `/indicators`

### GET `indicators`

**요약:** 전체 지표 목록 + 최신 시세

**Responses:**

#### 200 - 지표 목록 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

---

### GET `indicators/bookmarks`

**요약:** 즐겨찾기 목록 + 최신 시세

**Responses:**

#### 200 - 즐겨찾기 목록 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

---

### PATCH `indicators/bookmarks/reorder`

**요약:** 즐겨찾기 순서 변경

**설명:**
즐겨찾기된 symbol 배열을 원하는 순서대로 전달하면 해당 순서로 저장됩니다.

**Request Body:**

```json
{
  "symbols": ["KOSPI", "BTC", "GOLD_USD"] // 즐겨찾기 symbol 배열 (순서대로) (string[])
}
```

**Responses:**

#### 200 - 즐겨찾기 순서 변경 성공

---

### GET `indicators/:symbol`

**요약:** 지표 상세 + 최신 시세

**Path Parameters:**

- `symbol` (`string`)

**Responses:**

#### 200 - 지표 상세 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

#### 404 - 지표를 찾을 수 없음

---

### GET `indicators/:symbol/history`

**요약:** 지표 시세 히스토리 (시계열)

**Path Parameters:**

- `symbol` (`string`)

**Query Parameters:**

- `days` (`number`) (Optional): 조회 일수 (1~365)

**Responses:**

#### 200 - 히스토리 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "nameKo": "코스피", // 한글명 (string)
  "history": [
    {
      "price": "2580.34", // 시세 (string)
      "recordedAt": "2025-01-01T00:00:00Z" // 수집 시각 (Date)
    }
  ], // 시계열 데이터 (IndicatorPricePointDto[])
  "spreadHistory": [
    {
      "spread": "3.21", // 이격률 (%) (string)
      "recordedAt": "2025-01-01T00:00:00Z" // 수집 시각 (Date)
    }
  ] // GOLD_KRW_SPOT 전용: 현물가 vs 환산가(GOLD_USD×USD_KRW÷31.1035) 이격률 시계열 (SpreadPointDto[]?)
}
```

#### 404 - 지표를 찾을 수 없음

---

### POST `indicators/:symbol/bookmark`

**요약:** 즐겨찾기 등록

**Path Parameters:**

- `symbol` (`string`)

**Responses:**

#### 201 - 즐겨찾기 등록 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

#### 404 - 지표를 찾을 수 없음

---

### DELETE `indicators/:symbol/bookmark`

**요약:** 즐겨찾기 해제

**Path Parameters:**

- `symbol` (`string`)

**Responses:**

#### 200 - 즐겨찾기 해제 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

#### 404 - 지표를 찾을 수 없음

---

### POST `indicators/admin/init-history`

**요약:** [어드민] 과거 데이터 일괄 초기화

**설명:**
배포 후 1회 실행. Yahoo/CoinGecko/BOK에서 지정 기간 과거 시세를 백그라운드로 수집합니다. 결과는 서버 로그에서 확인하세요.

**인증/권한:**

- AdminGuard

**Query Parameters:**

- `days` (`number`) (Optional): 수집할 과거 일수 (1~5000, 기본 3650). Yahoo/BOK만 적용되며 CoinGecko는 365일, GOLD_KRW_SPOT은 전체 기간 고정.

**Responses:**

#### 200 - 히스토리 초기화 시작됨 (백그라운드 실행)

---
