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
  "daysLeft": 14, // 구독 남은 일수 (만료됐거나 무료이면 0) (number)
  "autoRenewing": true // 자동 갱신 예약 여부 (false면 해지·체험 상태로, expiresAt에 혜택이 끝난다) (boolean)
}
```

---

### GET `subscription/quota-plans`

**요약:** 등급별 미디어 용량 한도표 (플랜 비교 카드용)

**Responses:**

#### 200 -

```json
{
  "plans": [
    {
      "tier": null, // 구독 등급 (SubscriptionTier)
      "monthlyBytes": 0, // 월간 업로드 한도 (bytes) (number)
      "totalBytes": 0, // 계정 누적 한도 (bytes) (number)
      "perFileBytes": 0, // 파일 1개 최대 크기 (bytes) (number)
      "videoAllowed": false, // 영상 첨부 가능 여부 (boolean)
      "maxVideoDurationMs": null // 영상 최대 길이 (ms) (number | null)
    }
  ] // 등급별 한도표 (MediaQuotaPlanDto[])
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
  "daysLeft": 14, // 구독 남은 일수 (만료됐거나 무료이면 0) (number)
  "autoRenewing": true // 자동 갱신 예약 여부 (false면 해지·체험 상태로, expiresAt에 혜택이 끝난다) (boolean)
}
```

#### 422 - 영수증이 무효하거나 이미 사용됨 (재시도해도 동일하므로 completePurchase 호출 금지)

#### 503 - 스토어 검증 서버 일시 장애 (네트워크 오류로 처리 후 재시도 가능)

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
  "daysLeft": 14, // 구독 남은 일수 (만료됐거나 무료이면 0) (number)
  "autoRenewing": true // 자동 갱신 예약 여부 (false면 해지·체험 상태로, expiresAt에 혜택이 끝난다) (boolean)
}
```

---
