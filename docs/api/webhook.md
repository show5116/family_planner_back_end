# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Webhook

**Base Path:** `/webhook`

### POST `webhook/sentry`

**요약:** Sentry Webhook 수신

**Responses:**

#### 200 - Webhook 처리 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

---
### POST `webhook/apple`

**요약:** Apple App Store 구독 Webhook (미구현)

**설명:**
스토어 등록 후 구현 예정. Apple App Store Server Notifications V2 수신.

**Responses:**

#### 200 - Webhook 수신 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

---
### POST `webhook/google`

**요약:** Google Play 구독 Webhook (미구현)

**설명:**
스토어 등록 후 구현 예정. Google Play Real-time Developer Notifications 수신.

**Responses:**

#### 200 - Webhook 수신 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

---
