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
  "isBookmarked": false // 즐겨찾기 여부 (boolean)
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
  "isBookmarked": false // 즐겨찾기 여부 (boolean)
}
```

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
  "isBookmarked": false // 즐겨찾기 여부 (boolean)
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
  ] // 시계열 데이터 (IndicatorPricePointDto[])
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
  "isBookmarked": false // 즐겨찾기 여부 (boolean)
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
  "isBookmarked": false // 즐겨찾기 여부 (boolean)
}
```

#### 404 - 지표를 찾을 수 없음

---
