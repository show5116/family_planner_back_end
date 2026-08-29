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

**요약:** 인앱 구매 검증 (Google Play / App Store 서버 검증 후 tier 반영)

**Request Body:**

```json
{
  "platform": null, // SubscriptionPlatform
  "purchaseToken": "", // Google Play 구매 토큰 (platform=ANDROID일 때 필수) (string?)
  "signedTransaction": "" // App Store signedTransaction (JWS, platform=IOS일 때 필수) (string?)
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
