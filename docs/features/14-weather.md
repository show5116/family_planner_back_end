# 14. 날씨 (Weather)

> **상태**: ✅ 완료
> **Phase**: Phase 4

---

## 개요

기상청 Open API를 활용해 GPS 좌표(위경도) 기반 현재 날씨를 조회하는 기능입니다.
날씨 알림 스케줄러를 통해 강수/기온 변화 발생 시 FCM 푸시 알림을 발송합니다.

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
  "precipitationType": 0,
  "weatherDescription": "맑음",
  "baseDate": "20260314",
  "baseTime": "1200",
  "pm10": 35,
  "pm25": 18,
  "pm10Grade": 2,
  "pm25Grade": 1
}
```

**Response 필드 설명:**

| 필드 | 타입 | 설명 |
|------|------|------|
| temperature | number | 기온 (°C) |
| humidity | number | 상대 습도 (%) |
| windSpeed | number | 풍속 (m/s) |
| precipitation | number | 1시간 강수량 (mm) |
| precipitationType | number | 강수형태 코드 (0=없음, 1=비, 2=진눈깨비, 3=눈, 4=소나기) |
| weatherDescription | string | 날씨 설명 (한글) |
| baseDate | string | 기준 날짜 (YYYYMMDD) |
| baseTime | string | 기준 시각 (HHmm) |
| pm10 | number\|null | 미세먼지 농도 (㎍/㎥), API 키 미설정 시 null |
| pm25 | number\|null | 초미세먼지 농도 (㎍/㎥), API 키 미설정 시 null |
| pm10Grade | number\|null | 미세먼지 등급 (1=좋음, 2=보통, 3=나쁨, 4=매우나쁨) |
| pm25Grade | number\|null | 초미세먼지 등급 (1=좋음, 2=보통, 3=나쁨, 4=매우나쁨) |

**Errors:**
- 400: 잘못된 좌표 값
- 401: 인증 필요
- 502: 기상청 API 호출 실패

---

## 외부 API

### 기상청
- **서비스명**: 기상청_단기예보((구)_동네예보) 조회서비스
- **환경변수**: `KMA_SERVICE_KEY`

### 에어코리아 (미세먼지)
- **서비스명**: 한국환경공단_에어코리아_대기오염정보
- **환경변수**: `KMA_SERVICE_KEY` (기상청 키와 동일)

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

## 날씨 알림 스케줄러

### 개요
매 정시(`0 * * * *`)에 실행되며, `weatherAlertHour`가 설정된 유저를 대상으로 강수/기온 변화 조건 충족 시 FCM 알림을 발송합니다.

### 동작 방식
1. `NotificationSetting.category = WEATHER, enabled = true, weatherAlertHour = 현재시각`인 유저 조회 (`lastLat`/`lastLon` 및 디바이스 토큰 보유 필수)
2. 유저를 **시도 단위**로 그룹핑 (좌표 기반 sido 매핑 — 서울/인천/대전/대구/울산/부산/광주/세종/경기/강원/충북/충남/전북/전남/경북/경남/제주)
3. 시도별로 기상청 단기예보 조회 (Redis 캐시 1시간 TTL 우선)
4. **알림 조건** (하나라도 충족 시 발송):
   - 당일 강수 예보 있음 (PTY > 0)
   - 전일 대비 최저/최고 기온 변화 ≥ 5°C
5. 오늘 기온을 Redis에 저장 (TTL 48시간, 내일 비교용)
6. 유저별 언어(`user.language`)로 i18n 메시지 조합 후 `NotificationQueueService.enqueueImmediate()` 호출

### Redis 키
- `weather_alert_fcst:{sido}` — 시도별 예보 캐시 (TTL 1시간)
- `weather_temp:{sido}:{YYYYMMDD}` — 시도별 기온 (TTL 48시간)

---

## 구현 상태

### ✅ 완료
- [x] 현재 날씨 조회 (`GET /weather`)
- [x] 단기예보 조회 (`GET /weather/forecast`)
- [x] GPS 좌표 → 기상청 격자 변환 (LCC 투영법)
- [x] 미세먼지/초미세먼지 조회 (에어코리아)
- [x] 날씨 알림 스케줄러 (매 정시, 강수/기온 변화 시 FCM 발송)
- [x] 시도별 그룹핑으로 API 호출 최소화
- [x] Redis 캐시 (예보: 1시간, 기온 이력: 48시간)
- [x] 다국어 알림 메시지 (i18n)

### ⬜ 향후 고려
- [ ] `GET /weather/advice` — 날씨 기반 AI 조언 (옷차림, 우산 여부 등)

---

## 구현 파일

```
src/weather/
  dto/
    weather-query.dto.ts
    weather-response.dto.ts
    forecast-response.dto.ts
  weather.controller.ts
  weather.service.ts
  weather-alert.scheduler.ts   — 매 정시 날씨 알림 (강수/기온 변화 FCM 발송)
  weather.module.ts
src/config/
  weather.config.ts
```

**Last Updated**: 2026-05-26
