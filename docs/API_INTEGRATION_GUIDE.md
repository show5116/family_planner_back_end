# Family Planner AI - API 연동 가이드 (NestJS 용)

본 문서는 NestJS 백엔드 애플리케이션에서 `Family Planner AI` (FastAPI + LangGraph) 서버와 통신하기 위한 규격 및 가이드를 제공합니다.

---

## 1. 기본 정보

- **Base URL**: `http://<실제_FastAPI_서버_주소>` (로컬 테스트 시 `http://localhost:8000`)
- **주요 엔드포인트**: `POST /api/v1/planner/chat`
- **인증(Auth)**: 헤더 기반 API Key 인증 방식 (`X-API-Key`)

---

## 2. 보안 및 인증 (Authentication)

모든 API 요청 헤더에는 사전에 발급된 **API 인증키**를 포함해야 합니다.

- **Header Name**: `X-API-Key`
- **Header Value**: `.env` 파일의 `APP_API_KEY` 값과 동일 (`8f39a7b42c16e50d89f71a43b2d5e6c9f0a8d7e2b1c4f5a6b7c8d9e0f1a2b3c4`)

_(참고: NestJS 측 환경변수에 이 값을 등록해두고 Axios/Fetch 요청 시 공통 헤더로 주입해 사용하시기 바랍니다.)_

---

## 3. 핵심 API 명세: AI 채팅 연동

LangGraph를 기반으로 구동되는 AI 에이전트와 대화하기 위한 엔드포인트입니다.
이 엔드포인트는 **Redis 기반의 대화 이력(Memory) 기능** 및 **다중 에이전트 선택(Hybrid Routing) 기능**을 지원합니다.

### Request Info

- **URL**: `/api/v1/planner/chat`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body (JSON)

| 필드명         | 타입     | 필수여부 | 기본값           | 설명                                                                                                                                                      |
| -------------- | -------- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message`      | `string` | **Yes**  | -                | 사용자가 AI에게 보내는 실제 발화 메시지 (예: "안녕?", "이번 달 예산 어떻게 짤까?")                                                                        |
| `user_id`      | `string` | No       | `"default_user"` | 사용자를 식별하는 고유 ID (NestJS DB의 uuid 등)                                                                                                           |
| `room_id`      | `string` | No       | `null`           | 채팅방을 식별하는 고유 ID. 값이 없으면(새 대화) **서버에서 자동으로 UUID를 생성해 응답**합니다.                                                           |
| `target_agent` | `string` | No       | `"supervisor"`   | 명시적으로 호출하고자 하는 AI 에이전트 노드 이름. 지정하지 않으면 자동으로 스마트 라우터인 **supervisor** 가 응답합니다. (예: `planner`, `finance_agent`) |

_💡 대화 이력 작동 원리: `user_id`와 `room_id`를 조합해 스레드(Thread)를 식별합니다. 새 대화를 시작할 때는 `room_id` 없이 보내면 서버가 방금 만든 `room_id`를 응답으로 줍니다. 이어지는 대화에서는 받은 `room_id`를 계속 포함해 전송해야 AI가 문맥을 기억합니다._

### Request Example (Axios in NestJS)

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiFamilyPlannerService {
  private readonly baseUrl = 'http://localhost:8000/api/v1/planner/chat';
  private readonly apiKey = process.env.APP_API_KEY;

  async sendMessageToAi(
    userId: string,
    roomId: string,
    message: string,
    agent?: string,
  ) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          message: message,
          user_id: userId,
          room_id: roomId,
          target_agent: agent || 'supervisor',
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data; // PlannerResponse 반환
    } catch (error) {
      // 401 Unauthorized 또는 403 Forbidden 에러 헨들링
      console.error('Failed to communicate with AI Server', error);
      throw error;
    }
  }
}
```

### Response Body (JSON)

정상 처리 시 반환되는 형식입니다.

| 필드명     | 타입              | 설명                                                         |
| ---------- | ----------------- | ------------------------------------------------------------ |
| `response` | `string`          | AI 에이전트가 생성한 최종 텍스트 답변                        |
| `room_id`  | `string`          | 생성되었거나 전송받았던 해당 대화방의 고유 식별자(UUID 등)   |
| `plan`     | `string` \ `null` | (선택) 에이전트가 생성한 상태(State) 기반의 진행 플랜 텍스트 |

### Response Example

```json
{
  "response": "가족 계획을 세우는 데 도움을 드릴게요! 첫 번째로 어떤 항목(예: 예산 캘린더, 일정 관리 등)에 대해 이야기해 볼까요?",
  "room_id": "c7b5b597-9d41-4de2-b258-f996d941865c",
  "plan": "1. 예산 수집, 2. 목표치 할당"
}
```

---

## 4. 참고 사항 요약

- **다중 에이전트 아키텍처 지원**: 클라이언트 화면이 아예 '특화된 봇(예: 재무 봇)'과 1:1 대화하는 구조라면 `target_agent: 'finance_agent'`를 주입하세요. 반면, 하나의 통합 채팅창에서 만능 비서가 필요하다면 `target_agent` 필드를 전송하지 않고(기본값 `supervisor`) AI가 알아서 도구를 호출하게 둡니다.
- **헬스체크**: `GET /health` 엔드포인트는 인증(`X-API-Key`) 없이 접속 가능하므로 NestJS나 인프라스트럭처(Railway, K8s 등) 모니터링 시 활용 가능합니다.
