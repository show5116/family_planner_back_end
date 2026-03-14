# 날씨 기능

## 개요

기상청 Open API를 활용해 GPS 좌표(위경도) 기반 현재 날씨를 조회하는 기능입니다.
추후 AI 서비스 연동을 통해 날씨 기반 옷차림 추천 등 부가 기능을 제공할 예정입니다.

---

## API 엔드포인트

### GET /weather/forecast

향후 3일간 시간별(3시간 단위) 날씨 예보를 조회합니다.

**인증**: JWT 필요

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| lat | number | ✅ | 위도 (-90 ~ 90) |
| lon | number | ✅ | 경도 (-180 ~ 180) |

**Request 예시:**
```
GET /weather/forecast?lat=37.5665&lon=126.9780
```

**Response (200 OK):**
```json
{
  "baseDate": "20260314",
  "baseTime": "0500",
  "forecasts": [
    {
      "fcstDate": "20260314",
      "fcstTime": "0600",
      "temperature": 15.0,
      "minTemperature": 12.0,
      "maxTemperature": 24.0,
      "precipitationProbability": 20,
      "precipitation": 0,
      "humidity": 70,
      "windSpeed": 2.5,
      "sky": 1,
      "precipitationType": 0,
      "weatherDescription": "맑음"
    }
  ]
}
```

**Errors:**
- 400: 잘못된 좌표 값
- 401: 인증 필요
- 502: 기상청 API 호출 실패

---

### GET /weather

현재 위치의 날씨를 조회합니다.

**인증**: JWT 필요

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| lat | number | ✅ | 위도 (-90 ~ 90) |
| lon | number | ✅ | 경도 (-180 ~ 180) |

**Request 예시:**
```
GET /weather?lat=37.5665&lon=126.9780
```

**Response (200 OK):**
```json
{
  "temperature": 22.5,
  "humidity": 60,
  "windSpeed": 3.2,
  "precipitation": 0,
  "sky": 1,
  "precipitationType": 0,
  "weatherDescription": "맑음",
  "baseDate": "20260314",
  "baseTime": "1200"
}
```

**Response 필드 설명:**

| 필드 | 타입 | 설명 |
|------|------|------|
| temperature | number | 기온 (°C) |
| humidity | number | 상대 습도 (%) |
| windSpeed | number | 풍속 (m/s) |
| precipitation | number | 1시간 강수량 (mm) |
| sky | number | 하늘상태 코드 (1=맑음, 3=구름많음, 4=흐림) |
| precipitationType | number | 강수형태 코드 (0=없음, 1=비, 2=진눈깨비, 3=눈, 4=소나기) |
| weatherDescription | string | 날씨 설명 (한글) |
| baseDate | string | 기준 날짜 (YYYYMMDD) |
| baseTime | string | 기준 시각 (HHmm) |

**Errors:**
- 400: 잘못된 좌표 값
- 401: 인증 필요
- 502: 기상청 API 호출 실패

---

## 외부 API

- **서비스명**: 기상청_단기예보((구)_동네예보) 조회서비스
- **환경변수**: `KMA_SERVICE_KEY`

### 초단기실황조회 (getUltraSrtNcst)

- **엔드포인트**: `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`
- **발표 주기**: 매시 정각 (약 10분 후 제공)
- **제공 데이터**: 현재 관측값 (기온, 습도, 풍속, 강수량, 하늘상태, 강수형태)

### 단기예보조회 (getVilageFcst)

- **엔드포인트**: `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`
- **발표 주기**: 하루 8회 (02, 05, 08, 11, 14, 17, 20, 23시)
- **제공 데이터**: 향후 3일간 3시간 단위 예보 (기온, 최저/최고기온, 강수확률, 습도, 풍속 등)

### 격자 좌표 변환

기상청은 위경도 대신 격자좌표(nx, ny)를 사용합니다.
Lambert Conformal Conic Projection 알고리즘으로 변환합니다.

```
위경도 (lat, lon) → 격자좌표 (nx, ny)
예: (37.5665, 126.9780) → (60, 127) // 서울
```

---

## 구현 파일

```
src/weather/
  weather.module.ts
  weather.controller.ts
  weather.service.ts
  dto/
    weather-query.dto.ts
    weather-response.dto.ts
    forecast-response.dto.ts
src/config/
  weather.config.ts
```

---

## 향후 계획

- ⬜ `GET /weather/advice` — 날씨 기반 AI 조언 (옷차림, 우산 여부 등)
- ⬜ 날씨 알림 연동 (특보/경보 시 FCM 발송)
