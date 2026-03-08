# NestJS 연동 가이드라인 (Family Planner AI)

본 문서는 메인 백엔드(NestJS)에서 현재 제공되는 FastAPI 기반 AI 에이전트 마이크로서비스에 요청을 보낼 때 지켜야 할 규약과 가이드라인을 설명합니다.

---

## 1. 기본 통신 규약
- **Base URL:** `http://[fastapi-host]:8000`
- **통신 방식:** REST API (JSON)
- **보안/인증:** 사전에 공유된 **API Key** 필수

---

## 2. 보안 및 트레이싱 (필수 헤더)

FastAPI 서비스는 무단 접근 방지 및 통합 로깅 추적을 위해 특정 Header를 요구합니다.

### 🔑 `X-API-Key` (필수)
모든 에이전트 호출 엔드포인트는 `X-API-Key`가 필수로 요구됩니다.
- 본 서버(`FastAPI`)의 `.env` 파일에 기록된 `APP_API_KEY` 값을, NestJS 서버가 요청 시마다 이 헤더에 담아 전송해야 합니다.
- **오류 응답:** 
  - 누락 시: `401 Unauthorized`
  - 불일치 시: `403 Forbidden`

### 🆔 `X-Request-ID` (강력 권장)
분산 시스템 환경에서 NestJS 쪽 오류 로그와 FastAPI 쪽 오류 로그를 이어주기 위해 **요청 추적 ID**를 전송해 주시기 바랍니다.
- NestJS 쪽에서 만든 고유 로그 식별자(UUID 등)를 그대로 이 헤더에 담아 전달해 주시면, FastAPI 서버 `app.log`에도 해당 ID가 똑같이 찍혀서 이슈 추적이 100배 쉬워집니다.
- 누락하더라도 작동은 하며, 이 경우 FastAPI 서버가 자체적으로 UUID를 생성하여 로그를 남깁니다.

---

## 3. 주요 엔드포인트 명세

### 🤖 플래너 에이전트 채팅
**`POST /api/v1/planner/chat`**
이 엔드포인트는 Google Gemini를 통해 사용자 일정 및 제안을 수립해주는 실시간 에이전트를 호출합니다.

#### Request Example (Axios / NestJS HttpService)
```typescript
import { HttpService } from '@nestjs/axios';

// 1. 헤더 세팅
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.AI_MICROSERVICE_API_KEY, 
  'X-Request-ID': currentRequestContext.getTraceId(), // 추적 아이디
};

// 2. 바디 세팅
const body = {
  message: "이번 주말 우리 가족 식사할당 일정을 추천해줘.",
};

// 3. 호출
const response = await this.httpService.post('http://fastapi:8000/api/v1/planner/chat', body, { headers }).toPromise();
```

#### Response Example
```json
{
  "response": "이번 주말 메뉴로는 파스타 어떠신가요? 제안해 드리는 레스토랑은...",
  "plan": null
}
```

---

### 🏥 헬스 체크
**`GET /health`**
오케스트레이터 및 NestJS가 서비스가 살아있는지 검증할 때 사용합니다. API 키 불필요.
- **반환값:** `{"status": "ok"}` (HTTP 200 OK)

---

## 4. 로컬 환경 테스트 팁 (cURL)

개발 중 NestJS를 통하지 않고 터미널에서 FastAPI에 다이렉트로 요청해보고 싶다면 아래 명령어를 사용하세요.

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/planner/chat" \
     -H "Content-Type: application/json" \
     -H "X-API-Key: my-super-secret-api-key-for-nestjs" \
     -H "X-Request-ID: test-req-12345" \
     -d '{"message": "안녕, 에이전트!"}'
```
