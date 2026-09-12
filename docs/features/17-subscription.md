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

> 📌 **티어별 혜택·가격은 프리미엄 출시를 앞두고 재설계 중입니다.**
> 제안과 원가 근거는 아래 [프리미엄 출시 설계](#프리미엄-출시-설계-미확정-제안),
> 코드 갭과 작업 순서는
> [maintenance/subscription-open-issues.md](../maintenance/subscription-open-issues.md) 참고.

---

## 응답 형식

```json
{
  "tier": "ad_free",
  "expiresAt": "2026-09-27T00:00:00Z",
  "isActive": true,
  "isTrial": false,
  "daysLeft": 30,
  "autoRenewing": true
}
```

만료된 구독은 `tier: "free"`, `expiresAt: null`, `daysLeft: 0`으로 응답합니다.
(만료 후에도 tier가 남아 있으면 프론트가 혜택이 유지되는 것으로 오인하기 때문)

`expiresAt` / `daysLeft`는 **체험 이월분이 반영된 값**입니다 (아래 [무료 체험](#무료-체험) 참고).

`autoRenewing`은 스토어에 자동 갱신이 예약돼 있는지입니다. 해지(자동 갱신 OFF)한 사용자는
만료일까지 `isActive: true`이지만 `autoRenewing: false`이므로 프론트가 "다음 갱신일"과
"해지됨 · ~까지 이용 가능"을 구분해 표시할 수 있습니다. 무료 체험 중이거나(스토어 구독 없음)
혜택이 없는 상태면 `false`입니다.

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
| 만료 | `expired` | `free` (체험 이월분이 남았으면 그때까지 유지) | `false` |
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

### 체험 잔여일 이월 (`trialCarryoverDays`)

앱은 체험 중에도 구매 버튼을 노출합니다. 체험이 남은 상태에서 결제하면 스토어 만료일로 덮어써져
잔여 체험일이 사라지므로, **결제 시점의 체험 잔여일을 적립해 두고 만료일 계산에 더합니다.**

| 시점 | 값 |
| --- | --- |
| 체험 만료일 | 2026-09-14 (가입 + 14일) |
| 2026-09-04 결제 (스토어 만료 2026-10-04) | `trialCarryoverDays = 10` |
| `users.subscriptionExpiresAt` | 2026-10-14 (= 스토어 만료일 + 10일) |

- 적립은 **최초 결제 때 1회만** 합니다. 이미 `trialCarryoverDays > 0`이면 다시 계산하지 않습니다
  (갱신마다 더하면 무한히 늘어남).
- 갱신 웹훅·재검증 스케줄러도 같은 `applyVerifiedPurchase`를 타므로,
  갱신될 때마다 `스토어 만료일 + trialCarryoverDays`로 다시 계산됩니다.
- `subscriptions.expiresAt`에는 **스토어 원본 만료일**을, `users.subscriptionExpiresAt`에는
  **이월분이 더해진 혜택 만료일**을 저장합니다. `GET /subscription`은 후자를 내려줍니다.
- 이월분은 `ENTITLED_STATUSES` 판정을 뒤집지 않습니다. 환불(`revoked`)·계정 보류(`on_hold`)·
  일시중지(`paused`)는 이월분과 무관하게 즉시 회수됩니다.
- 단, 자연 만료(`expired`)는 이월분이 남아 있는 동안 혜택을 유지합니다
  (해지한 사용자가 이월분을 잃지 않도록).
- `free`로 내려갈 때 `trialCarryoverDays`를 0으로 초기화합니다 (재구독 시 옛 체험분 재적립 방지).

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

## 해지 감지와 만료 임박 알림

### 자동 갱신 해제는 직접 잡아야 한다

스토어는 "해지 버튼을 누른 순간"을 별도 이벤트로 주지 않습니다. Google은 `SUBSCRIPTION_STATE_CANCELED`,
Apple은 `autoRenewStatus`로 **현재 상태만** 알려주므로, 언제 꺼졌는지는 이전 값과 비교해야 합니다.

`applyVerifiedPurchase`가 트랜잭션 안에서 직전 `autoRenewing`과 비교해 `true → false`일 때만
`AUTO_RENEW_OFF` 이벤트를 `subscription_events`에 남깁니다.

- 첫 구매(기존 구독 없음)는 해제가 아니므로 남기지 않습니다.
- 이미 꺼진 상태로 들어오는 재검증·웹훅은 값이 그대로라 걸리지 않습니다(중복 없음).
- 웹훅이 유실돼도 새벽 3시 재검증이 같은 경로를 타므로 늦게라도 잡힙니다.

**왜 이 시점이 중요한가** — 해지해도 만료일까지는 `isActive: true`입니다(`canceled`는 entitled).
즉 **혜택이 살아있는 동안 되돌릴 수 있는 유일한 창**이고, 그게 지나면 회수할 방법이 없습니다.

### 왜 떠나는지 — Google 취소 설문

`AUTO_RENEW_OFF` 이벤트의 `rawPayload.cancellation`에 해지 맥락을 함께 남깁니다.
Google Play의 `canceledStateContext`에서 읽으며, **서비스 계정의 "구독 취소 설문 응답 보기" 권한**이
있어야 설문까지 내려옵니다(스토어 콘솔 설정 절차 1-3에서 이미 부여).

| `initiator` | 의미 | 이탈로 세야 하나 |
| --- | --- | --- |
| `USER` | 사용자가 직접 해지 | ✅ **자발적 이탈** |
| `SYSTEM` | 결제 실패로 시스템이 종료 | 비자발적 이탈 (별도 집계) |
| `DEVELOPER` | 운영자가 취소 | ❌ |
| `REPLACEMENT` | 업그레이드·플랜 변경으로 교체 | ❌ **이걸 이탈로 세면 통계가 망가집니다** |

`USER`인 경우에만 설문이 따라옵니다.

| 필드 | 값 |
| --- | --- |
| `surveyReason` | `CANCEL_SURVEY_REASON_COST_RELATED` 등. **설문 응답은 선택이라 비어 있는 경우가 많습니다** |
| `surveyUserInput` | `CANCEL_SURVEY_REASON_OTHERS`일 때만. 사용자 자유 입력이라 **500자로 자릅니다** |
| `canceledAt` | 해지를 누른 시각 (만료일과 다릅니다) |

```sql
-- 자발적 이탈 사유 분포
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(rawPayload, '$.cancellation.surveyReason')) AS reason,
  COUNT(*) AS cnt
FROM subscription_events
WHERE eventType = 'AUTO_RENEW_OFF'
  AND JSON_EXTRACT(rawPayload, '$.cancellation.initiator') = 'USER'
GROUP BY reason ORDER BY cnt DESC;
```

> **⚠️ Android 전용입니다.** Apple은 취소 설문 자체가 없습니다. 가장 가까운 신호는
> `signedRenewalInfo`의 `expirationIntent`(1=사용자 해지, 2=결제 오류, 3=가격 인상 미동의,
> 4=상품 미제공, 5=기타)인데 아직 읽지 않습니다. iOS 구독의 `cancellation`은 항상 비어 있습니다.

### 만료 7일 전 알림

[subscription-expiry.scheduler.ts](../../src/subscription/subscription-expiry.scheduler.ts) —
매일 오전 10시(KST), **자동 갱신을 끈 사용자**에게만 발송합니다. 갱신될 사람에게 "곧 만료됩니다"를
보내는 건 거짓말이고 되돌릴 것도 없습니다.

| 항목 | 값 |
| --- | --- |
| 대상 | `subscriptionTier != free` + `subscriptionExpiresAt`이 7일 이내 + `autoRenewing: false` |
| 기준 만료일 | `users.subscriptionExpiresAt` (**체험 이월분이 반영된 혜택 만료일**) |
| 중복 방지 | `subscription_events`의 `EXPIRY_NOTICE` 기록 — 최근 8일 내 있으면 건너뜀 |
| 카테고리 | `SYSTEM` / `data: { action: "view_subscription" }` |

본문은 두 가지입니다. 저장 중인 용량이 free 누적 한도를 넘게 되는 사용자에게는
**얼마가 한도를 넘는지** 알려줍니다 — 단순 만료 안내보다 강하고, 실제로 확인이 필요한 정보입니다.

```
일반   : "7일 뒤 무료 요금제로 전환돼요. 계속 이용하시려면 갱신해 주세요."
초과   : "7일 뒤 무료 요금제로 전환되면, 저장 중인 12.4GB 중 11.9GB가 한도를 넘게 돼요."
```

> **⚠️ 2주 무료 체험자는 대상이 아닙니다.** 체험은 `Subscription` 행이 없어 관계 필터에서 빠집니다.
> 체험 종료 안내는 성격이 다른(해지가 아니라 전환 유도) 별개 과제입니다.
>
> **⚠️ 용량 집계가 다이어리 게이지와 미세하게 다를 수 있습니다.** `SubscriptionModule`이
> `DiaryModule`을 import하면 순환이라 직접 집계하며, 최대 15분짜리 `PENDING` 예약분은 세지 않습니다.

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

## 프리미엄 출시 설계 (미확정 제안)

> **확정 상태 (2026-09-12)** — **용량 한도와 그룹 수는 확정**되었습니다(아래 표의 해당 값 적용).
> **가격과 AI 크레딧은 아직 미확정**이니 그 수치를 보고 구현하지 마세요.
> 코드에 존재하는 갭과 작업 순서는
> [maintenance/subscription-open-issues.md](../maintenance/subscription-open-issues.md)에 있습니다.

### 배경

프리미엄 출시 목적은 두 가지입니다.

1. 다이어리 출시에 따른 **버킷 용량 제한** (지금)
2. AI 서비스 확장 시 **AI 사용량 제한** (추후 — 계량 자체가 아직 불가능. 위 문서 D-1)

### 티어 라인업 (제안)

| | `free` | `ad_free` | `premium` |
| --- | --- | --- | --- |
| 월 | ₩0 | ₩1,900 *(현행)* | **₩4,900** *(미확정)* |
| 연 | — | — | **₩49,000** *(미확정)* |
| 그룹 수 | **1** | **1** | **5** |
| 월 업로드 | 100 MB | 300 MB | 3 GB |
| 누적 저장 | 500 MB | **4 GB** | **40 GB** |
| 파일 1개 최대 | 20 MB | 50 MB | 200 MB |
| 영상 | ❌ | 60초 | 5분 |
| 광고 제거 | ❌ | ✅ | ✅ |
| *AI 대화/월 (추후)* | *10회* | *30회* | *150회* |

가격 포인트는 3개(`ad_free` 월 / `premium` 월 / `premium` 연)이며, 연간권이 실질적인
"더 싼 가격대"(월 환산 ₩4,083) 역할을 합니다.

`premium` 상품은 현재 스토어 미등록 상태이고, 연간권 상품 ID를
[subscription-product.map.ts](../../src/subscription/subscription-product.map.ts)에 미리 매핑해도
무해합니다(만료일은 스토어가 주는 값을 그대로 쓰므로 연간권 대응에 코드 변경이 사실상 없습니다).

> **⚠️ enum과 config는 같은 커밋에.** `SubscriptionTier`에 티어를 추가하고
> [diary-media.config.ts](../../src/config/diary-media.config.ts)에 plan을 넣지 않으면,
> [diary-media-quota.service.ts:26](../../src/diary/media/diary-media-quota.service.ts#L26)의
> `plans[tier] ?? plans[free]` 폴백 때문에 **에러 없이 조용히 free 한도가 적용**됩니다.
> 결제한 유저가 100MB만 쓸 수 있는 상태로 배포될 수 있습니다.

### 원가 근거

실수령 = 정가 ÷ 1.1(VAT) × 0.85(스토어 소규모 사업자 15%) = **정가 × 0.773**

**스토리지 (Cloudflare R2)** — 저장 $0.015/GB·월 ≈ **₩21/GB·월**, **이그레스 $0**, 무료 10GB.
조회 트래픽이 공짜라 저장량만 보면 됩니다. `premium` 40GB를 꽉 채워도 ₩840/월.

**AI (Gemini, 2026-09 기준)** — 환율 ₩1,400/$, 턴당 프로필: 입력 5,400tok(캐시 히트) +
출력 3,200tok(**사고 2,000 + 응답 1,200**)

| 모델 | 입력 $/MTok | 출력 $/MTok | 턴당 |
| --- | --- | --- | --- |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | ₩2.5 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | ₩9 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | ₩13 |
| Gemini 3.7 Flash | $0.75 | $3.75 | ₩22 |
| Gemini 3.1 Pro | $2.00 | $12.00 | ₩69 |
| *(참고) Claude Sonnet 5* | *$2.00* | *$10.00* | *₩60* |

- **⚠️ Flash 계열 프로모션 가격은 2026-12-31까지입니다.** 이후 2배($1.50/$7.50).
  여기에 요금제를 앵커링하면 원가가 두 배가 됩니다.
- **사고 토큰이 출력으로 과금됩니다.** 위 표는 사고 2,000토큰 포함이며, 빼면 3.7 Flash가 ₩22 → ₩8입니다.
- **provider보다 모델 선택이 10배 중요합니다.** 같은 Gemini 안에서 2.5 Flash-Lite(₩2.5)와
  3.1 Pro(₩69)가 28배 차이인 반면, Claude Sonnet(₩60) vs Gemini 3.7 Flash(₩22)는 3배입니다.
  Gemini로 가되 Pro를 기본으로 쓰면 절감 효과가 없습니다.
- 설계 기준은 **평균 ₩10/턴**(Flash-Lite 주력 + 복잡한 요청만 Flash). 2027년 인상분까지 흡수됩니다.

**원가율 검산** (한도를 100% 소진하는 헤비 유저 기준)

| tier | 실수령 | 저장 상한 | AI 상한 | 원가율 |
| --- | --- | --- | --- | --- |
| `ad_free` | ₩1,469 | ₩84 | ₩300 | 26% |
| `premium` 월 | ₩3,788 | ₩840 | ₩1,500 | **62%** |
| `premium` 연 | ₩3,157 | ₩840 | ₩1,500 | 74% |

한도를 전원이 다 태워도 흑자입니다. 실제 평균 사용은 한도의 20~30%라 평균 원가율은 15~20% 수준입니다.
그룹 수 제한은 원가가 0이라 마진에 영향이 없습니다.

### 결정된 판단

**패밀리 티어를 만들지 않는다 (지금은)**

가족 단위 결제가 성립하려면 혜택이 **1인 귀속**이어야 하는데, 현재 그런 혜택이 없습니다.

- **용량** — 명목상 1인 귀속이지만, 다이어리 미디어 한도는 업로더(`userId`) 기준이고 그룹 일기의
  첨부는 **그룹원 누구나 조회**합니다. 사진을 주로 올리는 한 명만 `premium`이면 가족 전체가 봅니다.
  나머지가 돈 낼 이유가 없습니다.
- **광고 제거** — `ad_free` 4명 = ₩7,600으로, 어떤 가족 플랜 가격보다도 쌉니다. **자기 상품에 집니다.**

**AI가 붙으면 성립합니다.** AI 크레딧은 용량과 달리 우회가 안 됩니다(남이 대신 물어봐 줄 수 없음).
그때 재검토합니다.

**어느 티어에도 "무제한"을 두지 않는다**

한 명이 500GB를 올리면 ₩10,500/월이고 막을 방법이 없어집니다. 상위 티어를 만들더라도 그 위에
또 상한을 둡니다. `premium` 그룹 수도 "무제한"이 아니라 5개로 표기합니다.

**「누적 ≥ 월 × 13」**

연간 구독자가 갱신 전에 막히지 않도록 하는 원칙입니다. 상세는
[open-issues A-1](../maintenance/subscription-open-issues.md) 참고.

**한도는 올리기 쉽고 내리기 어렵다**

AI 크레딧 수치를 스토어 상품 설명·앱 플랜 카드에 **지금 쓰지 않습니다.**
"AI 기능 출시 시 우선 제공" 정도로만 둡니다. 숫자를 한 번 박으면 못 내립니다.
가격 인상도 어려우므로(Google은 기존 구독자 동의 절차 필요) 인상 대신 상위 티어 추가로 대응합니다.

### 40GB를 넘는 유저가 생기면

40GB는 사진 13,000장 또는 압축 영상 11시간이고, 매달 한도를 13개월 꽉 채운 사람입니다.
이 지점부터 경쟁 상대는 Google Photos(2TB ₩11,400/월)이며, **이길 필요가 없는 싸움**입니다.

- **하드 상한은 유지하고, 그 지점에서 상위 티어를 제안**합니다.
- **상위 티어는 도달자가 실제로 나온 뒤에 만듭니다.** 빨라야 13개월 뒤이고, 그 사이 실사용 분포가
  쌓입니다. 지금 만들면 SKU만 늘고 살 사람이 없습니다.
  만들 때 값(안): 월 10GB / 누적 130GB / ₩9,900 (13배 원칙 유지, 원가율 36%).
- 그러려면 **관측 수단이 먼저** 필요합니다 → [open-issues C-1](../maintenance/subscription-open-issues.md).

### 해지 대응 (제안)

두 층위로 나뉩니다. 상세와 코드 근거는
[open-issues A-3 / A-4 / B](../maintenance/subscription-open-issues.md) 참고.

- **해지 전** — `autoRenewing`이 `true → false`로 바뀌는 순간이 되돌릴 여지가 있는 유일한 창입니다.
  현재 이 전이를 감지하지 않습니다. 만료 D-7 알림 + 스토어 윈백 오퍼로 대응합니다.
  Google 취소 설문 응답은 **권한이 이미 있는데** 읽지 않고 버리고 있습니다.
- **해지 후** — 초과 저장분에 D+90 유예 정책. 단 **미디어 내보내기 경로가 선행 조건**이고,
  그룹 일기에 붙은 첨부는 삭제 대상에서 제외해야 합니다.

> **해지 대응의 8할은 해지 전에 끝납니다.** 확인된 구조적 해지 트리거는 "돈 냈는데 못 올림"
> (누적 한도 도달)이었고, 그건 A-1로 해결됩니다. 나머지는 참여 이탈이라 요금제로 풀 문제가 아닙니다.

### 미확정 항목

- [x] 누적 한도 상향 (`premium` 20GB → 40GB, `ad_free` 2GB → 4GB) 및 「누적 ≥ 월 × 13」 원칙 채택 — *2026-09-12 확정·적용 (A-1)*
- [x] `premium` 월 업로드 2GB → 3GB — *2026-09-12 확정·적용 (A-1)*
- [x] 그룹 수 제한값 (`free` 1 / `ad_free` 1 / `premium` 5) — *2026-09-12 확정, 구현은 A-2*
- [ ] `premium` 가격 (₩4,900) 및 연간권 (₩49,000)
- [ ] 해지 후 정리 유예 기간 (D+90) 및 그룹 첨부 예외 범위
- [ ] AI 크레딧 수치 — **계량 가능해진 뒤에 정함**

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

**Last Updated**: 2026-09-10
