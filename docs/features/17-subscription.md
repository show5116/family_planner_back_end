# 17. 구독 관리 (Subscription)

> **상태**: 🟡 구현 중 (기본 구조 완료, 스토어 검증 미구현)
> **Phase**: Phase 6

---

## 개요

인앱 결제 기반 구독 티어 관리 시스템입니다. 현재는 tier/만료일 저장 및 ADMIN 수동 관리까지 구현되어 있으며, 스토어 등록 후 실제 결제 검증 로직을 추가해야 합니다.

---

## 구독 티어

| Tier      | 설명              |
| --------- | ----------------- |
| `free`    | 기본 (무료)       |
| `ad_free` | 광고 제거         |
| `premium` | 프리미엄 전체 기능 |

---

## 데이터베이스

`User` 모델에 구독 관련 필드가 포함됩니다.

```prisma
// users 테이블 내 구독 필드
subscriptionTier      SubscriptionTier @default(free)
subscriptionExpiresAt DateTime?
inAppPurchaseToken    String?          @db.VarChar(500)

enum SubscriptionTier {
  free
  ad_free
  premium
}
```

---

## 구현 상태

### ✅ 완료
- [x] 구독 상태 조회 (`GET /subscription`)
- [x] 구독 업데이트 (`POST /subscription/verify`) — 검증 없이 tier/토큰 저장
- [x] 구독 복원 (`POST /subscription/restore`) — 만료 시 free 다운그레이드
- [x] ADMIN 사용자 목록 조회 (검색/tier 필터/페이지네이션)
- [x] ADMIN 사용자 상세 조회
- [x] ADMIN 구독 직접 수정 (tier/만료일)
- [x] 만료 체크 (스케줄러 없음, API 호출 시 실시간 체크)

### ⬜ TODO (스토어 등록 후 구현 필요)
- [ ] Apple App Store 결제 검증 (`POST /subscription/verify` — Apple StoreKit API 연동)
- [ ] Google Play 결제 검증 (`POST /subscription/verify` — Google Play Developer API 연동)
- [ ] Apple 웹훅 (`POST /webhook/apple`) — App Store Server Notifications
- [ ] Google 웹훅 (`POST /webhook/google`) — Google Play Real-time Developer Notifications

---

## API 엔드포인트

### 일반 사용자

| Method | Endpoint                 | 설명                              | Guard |
| ------ | ------------------------ | --------------------------------- | ----- |
| GET    | `/subscription`          | 구독 상태 조회                    | JWT   |
| POST   | `/subscription/verify`   | 구독 업데이트 (인앱 결제 후 저장) | JWT   |
| POST   | `/subscription/restore`  | 구독 복원 (만료 시 free 전환)     | JWT   |

### 운영자 (ADMIN)

| Method | Endpoint                                      | 설명                      | Guard      |
| ------ | --------------------------------------------- | ------------------------- | ---------- |
| GET    | `/subscription/admin/users`                   | 사용자 목록 (검색/필터)   | JWT, Admin |
| GET    | `/subscription/admin/users/:userId`           | 사용자 상세 조회          | JWT, Admin |
| PATCH  | `/subscription/admin/users/:userId/subscription` | tier/만료일 직접 수정  | JWT, Admin |

---

## 만료 처리 방식

스케줄러 없음. API 호출 시마다 `subscriptionExpiresAt > now()` 실시간 체크.
`POST /subscription/restore` 호출 시 만료된 경우 자동으로 `free`로 전환.

---

## 향후 구현 가이드 (스토어 등록 시)

### Apple App Store 검증
- 환경변수: `APPLE_BUNDLE_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_PRIVATE_KEY`
- `POST /subscription/verify` 에 `platform: 'apple'` 분기 추가
- Apple App Store Server API로 transactionId 검증

### Google Play 검증
- 환경변수: `GOOGLE_SERVICE_ACCOUNT_JSON`
- `POST /subscription/verify` 에 `platform: 'google'` 분기 추가
- Google Play Developer API로 purchaseToken 검증

### 웹훅
- Apple: App Store Connect에 `/webhook/apple` 등록
- Google: Google Cloud Pub/Sub → `/webhook/google` 등록
- 웹훅 수신 시 `inAppPurchaseToken`으로 userId 역조회

---

## 구현 파일

```
src/subscription/
  dto/
    update-subscription.dto.ts
    subscription-response.dto.ts   — SubscriptionStatusDto
    admin-subscription.dto.ts      — AdminUpdateSubscriptionDto, AdminUserQueryDto, AdminUserDto, AdminUserPageDto
  subscription.controller.ts       — 일반 사용자 API
  subscription.service.ts
  subscription-admin.controller.ts — ADMIN 전용 API
  subscription-admin.service.ts
  subscription.module.ts
```

**Last Updated**: 2026-05-26
