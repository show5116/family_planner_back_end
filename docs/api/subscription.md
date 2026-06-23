# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Subscription

**Base Path:** `/subscription`

### GET `subscription`

**요약:** 구독 상태 조회

**Responses:**

#### 200 -

```json
{
  "tier": null, // SubscriptionTier
  "expiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isActive": false, // 구독 활성 여부 (boolean)
  "isTrial": true, // 무료 체험 여부 (결제 없이 부여된 ad_free) (boolean)
  "daysLeft": 14 // 구독 남은 일수 (만료됐거나 무료이면 0) (number)
}
```

---

### POST `subscription/verify`

**요약:** 구독 업데이트 (인앱 결제 후 tier/토큰 저장)

**Request Body:**

```json
{
  "tier": null, // SubscriptionTier
  "expiresAt": "2026-12-31T23:59:59.000Z", // 구독 만료일 (ISO 8601) (string?)
  "purchaseToken": "AEuhp4..." // 인앱 결제 토큰 (Apple receipt / Google purchase token) (string?)
}
```

**Responses:**

#### 200 -

```json
{
  "tier": null, // SubscriptionTier
  "expiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isActive": false, // 구독 활성 여부 (boolean)
  "isTrial": true, // 무료 체험 여부 (결제 없이 부여된 ad_free) (boolean)
  "daysLeft": 14 // 구독 남은 일수 (만료됐거나 무료이면 0) (number)
}
```

---

### POST `subscription/restore`

**요약:** 구독 복원 (만료 시 free로 다운그레이드)

**Responses:**

#### 200 -

```json
{
  "tier": null, // SubscriptionTier
  "expiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isActive": false, // 구독 활성 여부 (boolean)
  "isTrial": true, // 무료 체험 여부 (결제 없이 부여된 ad_free) (boolean)
  "daysLeft": 14 // 구독 남은 일수 (만료됐거나 무료이면 0) (number)
}
```

---
