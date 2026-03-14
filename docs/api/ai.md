# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## AI

**Base Path:** `/ai`

### POST `ai/chat`

**요약:** 플래너 AI 채팅

**Request Body:**

```json
{
  "message": "이번 주말 가족 일정을 추천해줘.", // 사용자 메시지 (string)
  "room_id": "room-uuid-5678", // 채팅방 고유 ID (대화 이력 구분) (string?)
  "target_agent": "planner" // 호출할 AI 에이전트 (기본값: supervisor) (string?)
}
```

**Responses:**

#### 200 - AI 응답 성공

```json
{
  "response": "이번 주말 메뉴로는 파스타 어떠신가요?", // AI 응답 메시지 (string)
  "plan": null, // 생성된 플랜 (없을 경우 null) (string | null)
  "room_id": "room-uuid-5678" // 채팅방 ID (클라이언트가 다음 요청 시 재사용) (string)
}
```

---
