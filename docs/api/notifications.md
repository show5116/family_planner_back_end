# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Notifications

**Base Path:** `/notifications`

### POST `notifications/token`

**요약:** FCM 디바이스 토큰 등록

**설명:**
사용자의 FCM 디바이스 토큰을 등록합니다. 이미 등록된 토큰인 경우 마지막 사용 시간을 업데이트합니다.

**Request Body:**

```json
{
  "token": "fGw3ZJ0kRZe-Xz9YlK6J7M:APA91bH4...(생략)...k5L8mN9oP0qR1sT2u", // FCM 디바이스 토큰 (string)
  "platform": null // 디바이스 플랫폼 (DevicePlatform)
}
```

**Responses:**

#### 201 - 토큰이 성공적으로 등록되었습니다.

#### 409 - 토큰이 이미 다른 사용자에게 등록되어 있습니다.

---

### DELETE `notifications/token/:token`

**요약:** FCM 디바이스 토큰 삭제

**설명:**
로그아웃 또는 디바이스 변경 시 FCM 토큰을 삭제합니다.

**Path Parameters:**

- `token` (`string`)

**Responses:**

#### 200 - 토큰이 성공적으로 삭제되었습니다.

#### 404 - 토큰을 찾을 수 없습니다.

---

### GET `notifications/settings`

**요약:** 알림 설정 조회

**설명:**
사용자의 카테고리별 알림 설정을 조회합니다.

**Responses:**

#### 200 - 알림 설정 목록

---

### PUT `notifications/settings`

**요약:** 알림 설정 업데이트

**설명:**
특정 카테고리의 알림 활성화/비활성화를 설정합니다.

**Request Body:**

```json
{
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

**Responses:**

#### 200 - 알림 설정이 업데이트되었습니다.

---

### GET `notifications`

**요약:** 알림 목록 조회

**설명:**
사용자의 알림 히스토리를 페이지네이션으로 조회합니다.

**Query Parameters:**

- `query` (`QueryNotificationsDto`)

**Responses:**

#### 200 - 알림 목록 및 페이지네이션 정보

---

### GET `notifications/unread-count`

**요약:** 읽지 않은 알림 개수 조회

**설명:**
사용자의 읽지 않은 알림 개수를 조회합니다.

**Responses:**

#### 200 - 읽지 않은 알림 개수

---

### PUT `notifications/:id/read`

**요약:** 알림 읽음 처리

**설명:**
특정 알림을 읽음 상태로 변경합니다.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림이 읽음 처리되었습니다.

#### 404 - 알림을 찾을 수 없습니다.

---

### DELETE `notifications/:id`

**요약:** 알림 삭제

**설명:**
특정 알림을 삭제합니다.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림이 삭제되었습니다.

#### 404 - 알림을 찾을 수 없습니다.

---
