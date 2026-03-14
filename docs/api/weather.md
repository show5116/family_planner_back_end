# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 날씨

**Base Path:** `/weather`

### GET `weather`

**요약:** 현재 위치 날씨 조회

**설명:**
GPS 좌표(위도/경도)로 현재 날씨를 조회합니다 (초단기실황)

**Query Parameters:**

- `lat` (`number`): 위도
- `lon` (`number`): 경도

**Responses:**

#### 200 - 날씨 조회 성공

```json
{
  "temperature": 22, // 기온 (°C) (number)
  "humidity": 60, // 상대 습도 (%) (number)
  "windSpeed": 3, // 풍속 (m/s) (number)
  "precipitation": 0, // 1시간 강수량 (mm) (number)
  "precipitationType": 0, // 강수형태 코드 (0=없음, 1=비, 2=진눈깨비, 3=눈, 4=소나기) (number)
  "weatherDescription": "맑음", // 날씨 설명 (string)
  "baseDate": "20260314", // 기준 날짜 (YYYYMMDD) (string)
  "baseTime": "1200" // 기준 시각 (HHmm) (string)
}
```

---

### GET `weather/forecast`

**요약:** 단기예보 조회

**설명:**
GPS 좌표(위도/경도)로 향후 3일간 시간별 날씨 예보를 조회합니다

**Query Parameters:**

- `lat` (`number`): 위도
- `lon` (`number`): 경도

**Responses:**

#### 200 - 단기예보 조회 성공

```json
{
  "baseDate": "20260314", // 기준 날짜 (YYYYMMDD) (string)
  "baseTime": "0500", // 기준 시각 (HHmm) (string)
  "forecasts": [
    {
      "fcstDate": "20260314", // 예보 날짜 (YYYYMMDD) (string)
      "fcstTime": "1500", // 예보 시각 (HHmm) (string)
      "temperature": 22, // 기온 (°C) (number)
      "minTemperature": 15, // 최저 기온 (°C) (number | null)
      "maxTemperature": 25, // 최고 기온 (°C) (number | null)
      "precipitationProbability": 30, // 강수 확률 (%) (number)
      "precipitation": 0, // 강수량 (mm) (number)
      "humidity": 60, // 습도 (%) (number)
      "windSpeed": 3, // 풍속 (m/s) (number)
      "sky": 1, // 하늘상태 코드 (1=맑음, 3=구름많음, 4=흐림) (number)
      "precipitationType": 0, // 강수형태 코드 (0=없음, 1=비, 2=진눈깨비, 3=눈, 4=소나기) (number)
      "weatherDescription": "맑음" // 날씨 설명 (string)
    }
  ] // 시간별 예보 목록 (ForecastItemDto[])
}
```

---
