# 구독 기능 (Subscription)

## 개요

인앱 결제 기반 구독 티어 관리. 현재는 tier/만료일 저장 및 어드민 수동 관리까지 구현되어 있으며, 스토어 등록 후 실제 결제 검증 로직을 추가해야 한다.

## 구독 티어

| Tier | 설명 |
|------|------|
| `free` | 기본 (무료) |
| `ad_free` | 광고 제거 |
| `premium` | 프리미엄 전체 기능 |

## DB 필드 (users 테이블)

| 필드 | 타입 | 설명 |
|------|------|------|
| `subscriptionTier` | `SubscriptionTier` | 현재 티어 (기본값: `free`) |
| `subscriptionExpiresAt` | `DateTime?` | 만료일. null이면 무기한 |
| `inAppPurchaseToken` | `String?` | Apple receipt / Google purchaseToken |

## 구현된 API

### 일반 사용자

- `GET /subscription` — 현재 구독 상태 조회
- `POST /subscription/verify` — 인앱 결제 후 tier/토큰 저장 (현재 검증 없이 저장만)
- `POST /subscription/restore` — 만료된 경우 free로 다운그레이드

### 운영자 (AdminGuard)

- `GET /subscription/admin/users` — 사용자 목록 (검색/tier 필터/페이지네이션)
- `GET /subscription/admin/users/:userId` — 사용자 상세
- `PATCH /subscription/admin/users/:userId/subscription` — tier/만료일 직접 수정

### 웹훅 (Public, 스토어 등록 후 구현 예정)

- `POST /webhook/apple` — Apple App Store Server Notifications 수신 (미구현)
- `POST /webhook/google` — Google Play Real-time Developer Notifications 수신 (미구현)

## 만료 처리 방식

스케줄러 없음. API 호출 시마다 `subscriptionExpiresAt > now()` 실시간 체크.
`POST /subscription/restore` 호출 시 만료된 경우 자동으로 `free`로 전환.

---

## TODO: 스토어 등록 후 구현 필요

### 1. Apple App Store 검증 (`POST /subscription/verify`)

**필요한 것:**
- App Store Connect에서 발급한 in-app purchase 키 (`.p8` 파일)
- 환경변수: `APPLE_BUNDLE_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_PRIVATE_KEY`

**구현 내용:**
```
클라이언트 → POST /subscription/verify { purchaseToken, tier, expiresAt }
백엔드 → Apple App Store Server API 호출하여 transactionId 검증
  GET https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}
검증 성공 → DB 업데이트 (SubscriptionService.applyStoreSubscription)
```

**참고:** https://developer.apple.com/documentation/appstoreserverapi

---

### 2. Google Play 검증 (`POST /subscription/verify`)

**필요한 것:**
- Google Cloud 서비스 계정 키 (JSON)
- 환경변수: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Google Play Developer API 활성화

**구현 내용:**
```
클라이언트 → POST /subscription/verify { purchaseToken, productId, tier, expiresAt }
백엔드 → Google Play Developer API 호출
  GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}
검증 성공 → DB 업데이트 (SubscriptionService.applyStoreSubscription)
```

**참고:** https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/get

---

### 3. Apple 웹훅 구현 (`POST /webhook/apple`)

**필요한 것:**
- App Store Connect → App Information → App Store Server Notifications URL 등록
- 환경변수: `APPLE_WEBHOOK_SECRET` (App Store Connect에서 발급)

**구현 내용 (`WebhookService.handleAppleWebhook`):**
1. `signedPayload` (JWS) 서명 검증 — Apple Root CA로 검증
2. `notificationType` 파싱:
   - `SUBSCRIBED` / `DID_RENEW` → `applyStoreSubscription` 호출
   - `EXPIRED` / `REVOKE` / `REFUND` → `expireSubscription` 호출
3. `originalTransactionId`로 userId 매핑 (inAppPurchaseToken 기반 조회)

**알림 타입 전체 목록:** https://developer.apple.com/documentation/appstoreservernotifications/notificationtype

---

### 4. Google 웹훅 구현 (`POST /webhook/google`)

**필요한 것:**
- Google Cloud Pub/Sub 토픽 생성
- Google Play Console → Monetize → Monetization setup → Real-time developer notifications에 Pub/Sub 토픽 등록
- Push subscription 엔드포인트로 `/webhook/google` 등록

**구현 내용 (`WebhookService.handleGoogleWebhook`):**
1. Pub/Sub 메시지 base64 디코딩 (`body.message.data`)
2. `subscriptionNotification.notificationType` 파싱:
   - `1` RECOVERED, `2` RENEWED, `12` PURCHASED → `applyStoreSubscription` 호출
   - `3` CANCELED, `13` EXPIRED → `expireSubscription` 호출
3. `purchaseToken`으로 userId 매핑 (inAppPurchaseToken 기반 조회)

**알림 타입 전체 목록:** https://developer.android.com/google/play/billing/rtdn-reference#sub

---

## 구현 순서 (스토어 등록 시)

1. 스토어 심사용 샌드박스 환경에서 Apple/Google 검증 API 먼저 연동
2. `POST /subscription/verify`에 플랫폼별 분기 추가 (`platform: 'apple' | 'google'`)
3. 스토어 승인 후 웹훅 URL 등록 → 웹훅 핸들러 구현
4. `inAppPurchaseToken`으로 userId를 역조회하는 로직 추가 (웹훅은 userId를 안 줌)
