# 17. 구독 관리 (Subscription)

> **상태**: 🟢 구현 완료 (스토어 서버 검증 + 웹훅 연동)
> **Phase**: Phase 6

---

## 개요

인앱 결제 기반 구독 티어 관리 시스템입니다. 클라이언트 영수증을 Google Play Developer API /
App Store Server API로 서버 검증하고, 스토어 웹훅(RTDN · ASSN V2)으로 갱신·유예·보류·환불을 반영합니다.

---

## 상품 정보

| 항목 | 값 |
| --- | --- |
| 상품 ID | `family_planner_ad_free_monthly` |
| 요금제 ID (Google) | `monthly-autorenew` |
| Tier | `ad_free` |
| 가격 | 월 ₩1,900 (대한민국) |
| 패키지명 / 번들 ID | `com.hmncorp.familyplanner` |

`family_planner_premium_monthly`(premium)은 아직 스토어 미등록 상태이며, ADMIN 수동 부여로만 사용합니다.
상품 ID → tier 매핑: [src/subscription/subscription-product.map.ts](../../src/subscription/subscription-product.map.ts)

---

## 구독 티어

| Tier | 설명 |
| --- | --- |
| `free` | 기본 (무료) |
| `ad_free` | 광고 제거 |
| `premium` | 프리미엄 전체 기능 |

응답의 `tier`는 Prisma enum 값(`free` / `ad_free` / `premium`)을 그대로 내려줍니다.
프론트는 대소문자·언더스코어를 무시하고 비교하므로 `ad_free` = `adFree`로 인식됩니다.

---

## 응답 형식

```json
{
  "tier": "ad_free",
  "expiresAt": "2026-09-27T00:00:00Z",
  "isActive": true,
  "isTrial": false,
  "daysLeft": 30
}
```

만료된 구독은 `tier: "free"`, `expiresAt: null`, `daysLeft: 0`으로 응답합니다.
(만료 후에도 tier가 남아 있으면 프론트가 혜택이 유지되는 것으로 오인하기 때문)

---

## 검증 실패 응답 정책 (중요)

프론트는 422를 받으면 `completePurchase`를 호출하지 않고 재시도 가능한 상태로 남깁니다.
일시적 오류에 422를 주면 정상 구매가 재시도 없이 실패하므로 반드시 아래 기준을 지킵니다.

| 상황 | 응답 | 예외 클래스 |
| --- | --- | --- |
| 영수증 무효 / 스토어에 없음 (400·404·410) | **422** | `PurchaseVerificationFailedException` |
| 다른 계정이 이미 사용한 영수증 | **422** | `PurchaseVerificationFailedException` |
| 매핑되지 않은 상품 ID | **422** | `PurchaseVerificationFailedException` |
| 결제 미확정 (`SUBSCRIPTION_STATE_PENDING`) | **422** | `PurchaseVerificationFailedException` |
| 스토어 API 장애·네트워크 오류 (5xx·타임아웃) | **503** | `PurchaseVerificationUnavailableException` |
| 서비스 계정 인증 실패 (401·403), 환경변수 누락 | **503** | `PurchaseVerificationUnavailableException` |
| 알 수 없는 구독 상태 | **503** | `PurchaseVerificationUnavailableException` |

구현: [src/subscription/verifiers/verification-error.ts](../../src/subscription/verifiers/verification-error.ts)

---

## 결제 실패 / 취소 / 환불 처리

Play Console의 유예 기간과 계정 보류가 활성화되어 있다는 전제로 동작합니다.

| 상황 | 내부 status | tier | isActive |
| --- | --- | --- | --- |
| 정상 구독 | `active` | 유지 | `true` |
| 유예 기간 (결제 재시도 중) | `grace_period` | **유지** | `true` |
| 계정 보류 (유예 만료) | `on_hold` | `free` | `false` |
| 일시중지 (사용자 pause) | `paused` | `free` | `false` |
| 구독 취소 (자동 갱신 해제) | `canceled` | **만료일까지 유지** | 만료 전 `true` |
| 만료 | `expired` | `free` | `false` |
| 환불 / 취소 처리 | `revoked` | `free` (즉시) | `false` |
| 결제 재성공 | `active` | 즉시 복구 | `true` |

유예 기간에는 `expiresAt`을 유예 종료 시점까지 연장해 저장하므로 `isActive`가 `true`로 유지됩니다.

### 플랫폼별 상태 매핑

**Google Play** (`purchases.subscriptionsv2.get`의 `subscriptionState`)

| Google 상태 | 내부 status |
| --- | --- |
| `SUBSCRIPTION_STATE_ACTIVE` | `active` |
| `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` | `grace_period` |
| `SUBSCRIPTION_STATE_CANCELED` | `canceled` |
| `SUBSCRIPTION_STATE_ON_HOLD` | `on_hold` |
| `SUBSCRIPTION_STATE_PAUSED` | `paused` |
| `SUBSCRIPTION_STATE_EXPIRED` | `expired` |

환불은 RTDN의 `voidedPurchaseNotification`으로 수신해 즉시 `revoked` 처리합니다.

**App Store** (App Store Server API의 `status` + `signedRenewalInfo`)

| Apple 상태 | 내부 status |
| --- | --- |
| `ACTIVE(1)` | `active` (자동 갱신 OFF면 `canceled`) |
| `EXPIRED(2)` | `expired` |
| `BILLING_RETRY(3)` | `on_hold` |
| `BILLING_GRACE_PERIOD(4)` | `grace_period` |
| `REVOKED(5)` | `revoked` |

웹훅 알림에는 `status`가 없으므로 `revocationDate` / `gracePeriodExpiresDate` /
`isInBillingRetryPeriod` / `autoRenewStatus`로 동일한 상태를 계산합니다.

---

## 무료 체험

신규 가입자에게 서버가 2주 `ad_free`를 부여합니다 ([src/auth/auth.service.ts](../../src/auth/auth.service.ts)).
스토어 Introductory Offer는 사용하지 않습니다.

- `isTrial`은 "tier가 `ad_free`인데 `inAppPurchaseToken`이 없음"으로 판정합니다.
- 체험 중 실제 구독을 구매하면 검증 시 `inAppPurchaseToken`이 저장되고 만료일이 스토어 기준으로 갱신되므로
  자동으로 `isTrial: false`로 전환됩니다.

---

## 환경변수

```bash
# Android (Google Play Developer API)
ANDROID_PACKAGE_NAME="com.hmncorp.familyplanner"
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL="...@....iam.gserviceaccount.com"
GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# iOS (App Store Server API)
IOS_BUNDLE_ID="com.hmncorp.familyplanner"
APPLE_APP_APPLE_ID="1234567890"        # App Store Connect의 숫자 Apple ID (Production 검증 필수)
APPLE_IAP_ISSUER_ID="..."
APPLE_IAP_KEY_ID="..."
APPLE_IAP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APPLE_IAP_ENVIRONMENT="Production"     # 우선 조회 환경. 실패 시 나머지 환경도 자동 시도
```

`APPLE_IAP_ENVIRONMENT`는 **우선순위**일 뿐이며, Sandbox와 Production 양쪽을 모두 시도합니다.
따라서 양산 서버에서도 Sandbox 테스터 계정의 구매가 그대로 검증됩니다.

---

## 스토어 콘솔 설정 절차

### 1. Google Play

1. Google Cloud Console에서 서비스 계정 생성 → JSON 키 발급
2. Play Console > 설정 > API 액세스에서 해당 서비스 계정 연결
3. 서비스 계정에 **"재무 데이터, 주문, 구독 취소 설문 응답 보기"** 권한 부여
4. JSON 키의 `client_email` / `private_key`를 환경변수에 주입
   (`private_key`의 줄바꿈은 `\n` 문자열 그대로 넣으면 됩니다)

> 권한 반영에 최대 24시간이 걸릴 수 있습니다. 그 사이 호출은 401/403 → **503**으로 응답됩니다.

### 2. Google RTDN (웹훅)

1. Google Cloud Console에서 Pub/Sub 토픽 생성 (예: `play-rtdn`)
2. 토픽 권한에 `google-play-developer-notifications@system.gserviceaccount.com`을
   **Pub/Sub 게시자(Publisher)** 로 추가
3. 푸시 구독 생성 → 엔드포인트 URL: `https://<서버 도메인>/v1/webhook/google`
4. Play Console > 수익 창출 설정 > 실시간 개발자 알림에 토픽 이름 등록 후 **"테스트 알림 보내기"** 로 확인

### 3. App Store Server API

1. App Store Connect > 사용자 및 액세스 > 통합 > **In-App Purchase** 키 발급 (.p8)
   - Sign in with Apple 키(`APPLE_KEY_ID`)와는 별개의 키입니다
2. Issuer ID, Key ID, .p8 본문을 환경변수에 주입
3. Apple 루트 인증서는 [assets/apple-root-certs/](../../assets/apple-root-certs/)에 커밋되어 있습니다
   (`AppleRootCA-G3.cer`, `AppleRootCA-G2.cer`)

### 4. App Store Server Notifications V2 (웹훅)

App Store Connect > 앱 > 일반 > App Store 서버 알림에서 **버전 2**로 등록합니다.

| 환경 | URL |
| --- | --- |
| Production | `https://<서버 도메인>/v1/webhook/apple` |
| Sandbox | `https://<서버 도메인>/v1/webhook/apple` |

두 URL을 각각 등록해야 하며, 같은 엔드포인트를 써도 서버가 서명 환경을 자동 판별합니다.

> ⚠️ `main.ts`의 `enableVersioning(defaultVersion: '1')` 때문에 모든 경로에 `/v1` 접두사가 붙습니다.
> 콘솔에 `/webhook/apple`로 등록하면 404가 됩니다.

### Google 웹훅 인증

Apple의 `signedPayload`는 JWS 서명이라 그 자체로 인증이 되지만, Google RTDN 페이로드는
서명되어 있지 않습니다. `purchaseToken`을 Google Play API로 재검증하므로 위조 페이로드로
tier를 얻을 수는 없으나, 검증 자체가 낭비되는 것을 막기 위해 공유 시크릿을 둔다.

- `GOOGLE_WEBHOOK_SECRET` 환경변수 설정 시, Pub/Sub 구독의 엔드포인트 URL에
  `?token=<같은 값>`을 붙여야 요청이 통과한다 (`crypto.timingSafeEqual`로 비교)
- 환경변수가 없으면 검증을 생략한다 (경고 로그만 남김) — 기존 배포와의 하위 호환용
- dev/production에 서로 다른 값을 쓴다. Pub/Sub 구독은 앱당 토픽이 하나뿐이라
  dev·production 두 서버 모두 모든 알림을 받으므로, URL의 토큰으로만 구분한다

```
https://<서버 도메인>/v1/webhook/google?token=<GOOGLE_WEBHOOK_SECRET 값>
```

---

## 웹훅 재시도 정책

| 상황 | 응답 | 결과 |
| --- | --- | --- |
| 정상 처리 | 200 | 완료 |
| 테스트 알림 | 200 | 로그만 기록 |
| 서명·영수증 검증 실패 (영구) | 200 | 재시도해도 동일하므로 종료 |
| 미등록 거래 (`/subscription/verify` 미도착) | 200 | 클라이언트 검증 시 반영됨 |
| 스토어 API·DB 일시 장애 | **5xx** | Apple/Pub-Sub이 재시도 |

웹훅이 유실되어도 매일 새벽 3시 재검증 스케줄러가 안전망 역할을 합니다
([subscription-reconcile.scheduler.ts](../../src/subscription/subscription-reconcile.scheduler.ts)).

---

## 데이터베이스

```prisma
// users 테이블 내 구독 필드 (빠른 조회용 캐시)
subscriptionTier      SubscriptionTier @default(free)
subscriptionExpiresAt DateTime?
inAppPurchaseToken    String?          @db.VarChar(500)

model Subscription {        // 사용자당 1건, 스토어 원본 상태
  originalTransactionId  // Android: purchaseToken / iOS: originalTransactionId
  status, tier, expiresAt, autoRenewing, lastVerifiedAt
}

model SubscriptionEvent {   // 검증·웹훅 이벤트 감사 로그
  eventType, rawPayload, processedAt
}

enum SubscriptionStatus {
  active
  expired
  canceled
  grace_period
  revoked
  on_hold
  paused
}
```

`lastVerifiedAt`보다 과거의 이벤트는 무시해 웹훅 순서 역전 시 상태가 되돌아가지 않도록 합니다.

---

## API 엔드포인트

### 일반 사용자

| Method | Endpoint | 설명 | Guard |
| --- | --- | --- | --- |
| GET | `/subscription` | 구독 상태 조회 | JWT |
| POST | `/subscription/verify` | 인앱 구매 검증 후 tier 반영 | JWT |
| POST | `/subscription/restore` | 구독 복원 (스토어 재검증) | JWT |

`POST /subscription/verify` 요청 본문:

```json
{
  "platform": "ANDROID",
  "purchaseToken": "AEuhp4...",      // platform=ANDROID
  "signedTransaction": "eyJhbG..."   // platform=IOS
}
```

### 웹훅 (인증 없음)

| Method | Endpoint | 설명 |
| --- | --- | --- |
| POST | `/v1/webhook/google` | Google Play RTDN (Pub/Sub 푸시) |
| POST | `/v1/webhook/apple` | App Store Server Notifications V2 |

RTDN 페이로드는 서명되어 있지 않으므로 `purchaseToken`을 Google Play Developer API로 **재검증한 뒤**
반영합니다. Apple 알림은 JWS 서명을 Apple 루트 인증서로 검증합니다.

### 운영자 (ADMIN)

| Method | Endpoint | 설명 | Guard |
| --- | --- | --- | --- |
| GET | `/subscription/admin/users` | 사용자 목록 (검색/필터) | JWT, Admin |
| GET | `/subscription/admin/users/:userId` | 사용자 상세 조회 | JWT, Admin |
| PATCH | `/subscription/admin/users/:userId/subscription` | tier/만료일 직접 수정 | JWT, Admin |

---

## 테스트

| 플랫폼 | 계정 | 비고 |
| --- | --- | --- |
| Android | Play Console 라이선스 테스터 | 실결제 없음. 갱신 주기가 분 단위로 단축됨 |
| iOS | App Store Sandbox 테스터 | 실결제 없음. `APPLE_IAP_ENVIRONMENT="Sandbox"`로 두면 조회가 빨라짐 |

dev 환경에서 재검증 스케줄러를 켜려면 `ENABLE_SCHEDULER=subscription`을 설정합니다.

### 자격증명 점검

실제 구매 없이 스토어 연동 상태를 확인합니다.

```bash
npm run check:iap                        # 키·권한·상품 매핑 점검 (읽기 전용)
npm run check:iap -- --test-notification # Apple에 테스트 알림 발송 요청 (Sandbox)
npm run check:iap -- --test-notification --production
```

점검 항목과 실패 시 의미:

| 항목 | 실패 시 원인 |
| --- | --- |
| Google Play — 앱 접근 | 서비스 계정 앱 권한 없음 / AAB 미업로드 / androidpublisher API 미사용 설정 |
| Google Play — 재무 데이터 권한 | "재무 데이터, 주문, 구독 취소 설문 응답 보기" 권한 누락 (반영까지 최대 24시간) |
| 상품 ID 매핑 | 스토어 상품이 `subscription-product.map.ts`에 없음 |
| App Store (Sandbox/Production) | Issuer ID·Key ID·`.p8` 오류. Issuer ID는 Team ID가 아닌 UUID |
| 웹훅 테스트 알림 | 등록 URL 오타(`/v1` 누락 등), 서버가 2xx를 반환하지 않음 |

> 앱 접근은 성공하는데 재무 데이터 권한만 실패하는 경우가 흔합니다.
> 두 권한은 별개이며 반영 시점도 다릅니다.

Google RTDN은 앱당 토픽이 하나뿐이라 dev/양산 구분이 없습니다.
같은 토픽에 push 구독을 두 개 붙여 양쪽 서버가 모든 알림을 각각 받고,
자기 DB에 없는 `purchaseToken`은 로그만 남기고 무시합니다.

---

## 구현 파일

```
src/subscription/
  dto/
    verify-purchase.dto.ts           — VerifyPurchaseDto (platform, purchaseToken, signedTransaction)
    subscription-response.dto.ts     — SubscriptionStatusDto
    admin-subscription.dto.ts        — ADMIN 전용 DTO
  verifiers/
    subscription-verifier.interface.ts — SubscriptionVerifier, VerifiedPurchase
    android-subscription.verifier.ts   — Google Play Developer API 검증
    ios-subscription.verifier.ts       — App Store Server API / JWS 검증 (Sandbox·Production 모두 시도)
    verification-error.ts              — 422 / 503 구분용 예외
  subscription-product.map.ts        — 상품 ID → tier 매핑
  subscription.controller.ts
  subscription.service.ts            — 검증·반영·복원
  subscription-admin.controller.ts
  subscription-admin.service.ts
  subscription-reconcile.scheduler.ts — 매일 새벽 재검증 안전망
scripts/
  check-iap-credentials.ts           — 스토어 자격증명·웹훅 점검 (npm run check:iap)
src/webhook/
  webhook.controller.ts              — /v1/webhook/google, /v1/webhook/apple
  webhook.service.ts                 — RTDN / ASSN V2 처리
```

**Last Updated**: 2026-08-27
