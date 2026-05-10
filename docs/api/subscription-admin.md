# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Subscription (ADMIN)

**Base Path:** `/subscription/admin`

### GET `subscription/admin/users`

**요약:** 사용자 목록 조회 (ADMIN 전용)

**Query Parameters:**

- `page` (`number`) (Optional)
- `limit` (`number`) (Optional)
- `search` (`string`) (Optional): 이름 또는 이메일 검색
- `tier` (`SubscriptionTier`) (Optional): 구독 tier 필터

**Responses:**

#### 200 - 사용자 목록 조회 성공

```json
{
  "items": [
    {
      "id": "uuid-1234", // string
      "name": "홍길동", // string
      "email": "user@example.com", // string | null
      "subscriptionTier": null, // SubscriptionTier
      "subscriptionExpiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
      "isSubscriptionActive": false, // 구독 활성 여부 (boolean)
      "createdAt": "2025-01-01T00:00:00Z", // 가입일 (Date)
      "lastLoginAt": "2025-01-01T00:00:00Z" // 마지막 로그인 (Date | null)
    }
  ], // AdminUserDto[]
  "total": 120, // number
  "page": 1, // number
  "limit": 20 // number
}
```

---

### GET `subscription/admin/users/:userId`

**요약:** 사용자 상세 조회 (ADMIN 전용)

**Path Parameters:**

- `userId` (`string`)

**Responses:**

#### 200 - 사용자 조회 성공

```json
{
  "id": "uuid-1234", // string
  "name": "홍길동", // string
  "email": "user@example.com", // string | null
  "subscriptionTier": null, // SubscriptionTier
  "subscriptionExpiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isSubscriptionActive": false, // 구독 활성 여부 (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 가입일 (Date)
  "lastLoginAt": "2025-01-01T00:00:00Z" // 마지막 로그인 (Date | null)
}
```

#### 404 - 사용자를 찾을 수 없습니다

---

### PATCH `subscription/admin/users/:userId/subscription`

**요약:** 사용자 구독 직접 수정 (ADMIN 전용)

**Path Parameters:**

- `userId` (`string`)

**Request Body:**

```json
{
  "tier": null, // SubscriptionTier
  "expiresAt": "2026-12-31T23:59:59.000Z" // 구독 만료일 (ISO 8601). null이면 기간 무제한. (string | null?)
}
```

**Responses:**

#### 200 - 구독 수정 성공

```json
{
  "id": "uuid-1234", // string
  "name": "홍길동", // string
  "email": "user@example.com", // string | null
  "subscriptionTier": null, // SubscriptionTier
  "subscriptionExpiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isSubscriptionActive": false, // 구독 활성 여부 (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 가입일 (Date)
  "lastLoginAt": "2025-01-01T00:00:00Z" // 마지막 로그인 (Date | null)
}
```

#### 404 - 사용자를 찾을 수 없습니다

---
