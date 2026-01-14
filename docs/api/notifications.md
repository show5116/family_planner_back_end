# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 알림

**Base Path:** `/notifications`

### POST `notifications/token`

**요약:** FCM 디바이스 토큰 등록

**Request Body:**

```json
{
  "token": "fGw3ZJ0kRZe-Xz9YlK6J7M:APA91bH4...(생략)...k5L8mN9oP0qR1sT2u", // FCM 디바이스 토큰 (string)
  "platform": null // 디바이스 플랫폼 (DevicePlatform)
}
```

**Responses:**

#### 201 - FCM 토큰 등록 성공

```json
{
  "id": "uuid", // 토큰 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "token": "dXNlci1kZXZpY2UtdG9rZW4tZXhhbXBsZQ", // FCM 디바이스 토큰 (string)
  "platform": null, // 플랫폼 (DevicePlatform)
  "lastUsed": "2025-12-27T00:00:00Z" // 마지막 사용 시간 (Date)
}
```

---

### DELETE `notifications/token/:token`

**요약:** FCM 디바이스 토큰 삭제

**Path Parameters:**

- `token` (`string`)

**Responses:**

#### 200 - FCM 토큰 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 토큰을 찾을 수 없음

---

### GET `notifications/settings`

**요약:** 알림 설정 조회

**Responses:**

#### 200 - 알림 설정 목록 반환

```json
{
  "id": "uuid", // 설정 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

---

### PUT `notifications/settings`

**요약:** 알림 설정 업데이트

**Request Body:**

```json
{
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

**Responses:**

#### 200 - 알림 설정 업데이트 성공

```json
{
  "id": "uuid", // 설정 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

---

### GET `notifications`

**요약:** 알림 목록 조회 (페이지네이션)

**Query Parameters:**

- `unreadOnly` (`boolean`) (Optional): 읽지 않은 알림만 조회 (true인 경우)
- `page` (`number`) (Optional): 페이지 번호 (1부터 시작)
- `limit` (`number`) (Optional): 페이지당 항목 수

**Responses:**

#### 200 - 알림 목록 및 페이지네이션 정보 반환

```json
{
  "data": [
    {
      "id": "uuid", // 알림 ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "category": null, // 알림 카테고리 (NotificationCategory)
      "title": "새로운 일정 알림", // 알림 제목 (string)
      "body": "내일 오후 3시에 회의가 예정되어 있습니다.", // 알림 내용 (string)
      "data": { "scheduleId": "uuid", "action": "view_schedule" }, // 추가 데이터 (JSON) (any)
      "isRead": false, // 읽음 여부 (boolean)
      "sentAt": "2025-12-27T00:00:00Z", // 발송 시간 (Date)
      "readAt": "2025-12-27T00:30:00Z" // 읽은 시간 (Date | null)
    }
  ], // NotificationDto[]
  "meta": {
    "page": 1, // 현재 페이지 (number)
    "limit": 20, // 페이지당 항목 수 (number)
    "total": 42, // 전체 항목 수 (number)
    "totalPages": 3 // 전체 페이지 수 (number)
  } // PaginationMetaDto
}
```

---

### GET `notifications/unread-count`

**요약:** 읽지 않은 알림 개수 조회

**Responses:**

#### 200 - 읽지 않은 알림 개수 반환

```json
{
  "count": 5 // 읽지 않은 알림 개수 (number)
}
```

---

### PUT `notifications/:id/read`

**요약:** 알림 읽음 처리

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림 읽음 처리 성공

```json
{
  "id": "uuid", // 알림 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "title": "새로운 일정 알림", // 알림 제목 (string)
  "body": "내일 오후 3시에 회의가 예정되어 있습니다.", // 알림 내용 (string)
  "data": { "scheduleId": "uuid", "action": "view_schedule" }, // 추가 데이터 (JSON) (any)
  "isRead": false, // 읽음 여부 (boolean)
  "sentAt": "2025-12-27T00:00:00Z", // 발송 시간 (Date)
  "readAt": "2025-12-27T00:30:00Z" // 읽은 시간 (Date | null)
}
```

#### 404 - 알림을 찾을 수 없음

---

### DELETE `notifications/:id`

**요약:** 알림 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 알림을 찾을 수 없음

---

### POST `notifications/test`

**요약:** 테스트 알림 전송 (운영자 전용)

**인증/권한:**

- AdminGuard

**Responses:**

#### 200 - 테스트 알림 전송 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 403 - 운영자 권한 필요

---

### POST `notifications/schedule`

**요약:** 예약 알림 전송 (특정 시간에 발송)

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000", // 알림 받을 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "title": "할 일 알림", // 알림 제목 (string)
  "body": "30분 후 회의 시작", // 알림 내용 (string)
  "scheduledTime": "2026-01-11T15:30:00Z", // 발송 예정 시간 (ISO 8601 형식) (string)
  "data": { "taskId": "123", "action": "view_task" } // 추가 데이터 (화면 이동용 payload 등) (Record<string, any>?)
}
```

**Responses:**

#### 201 - 예약 알림 등록 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

---
