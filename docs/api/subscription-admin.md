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
- `deleteStatus` (`UserDeleteStatus`) (Optional): 삭제 상태 필터 (all: 전체, active: 정상, pending_delete: 삭제 유예 중)

**Responses:**

#### 200 - 사용자 목록 조회 성공

```json
{
  "items": [
    {
      "id": "uuid-1234", // string
      "name": "홍길동", // string
      "email": "user@example.com", // string | null
      "isAdmin": false, // 운영자 여부 (boolean)
      "provider": "LOCAL", // 소셜 로그인 제공자 (string)
      "subscriptionTier": null, // SubscriptionTier
      "subscriptionExpiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
      "isSubscriptionActive": false, // 구독 활성 여부 (boolean)
      "createdAt": "2025-01-01T00:00:00Z", // 가입일 (Date)
      "lastLoginAt": "2025-01-01T00:00:00Z", // 마지막 로그인 (Date | null)
      "deletedAt": "2024-01-08T00:00:00.000Z", // 삭제 예약 일시 (null이면 정상 계정) (Date | null)
      "storageUsedBytes": 1073741824 // 다이어리 미디어 저장 사용량 (bytes). R2에 실제 올라간 것만 세므로 앱의 한도 게이지보다 작을 수 있다 (number)
    }
  ], // AdminUserDto[]
  "total": 120, // number
  "page": 1, // number
  "limit": 20 // number
}
```

---

### GET `subscription/admin/storage-stats`

**요약:** 저장 사용량 분포 (ADMIN 전용) — 등급별 요약 + 구간별 인원. 상위 등급 신설 판단용

**Responses:**

#### 200 - 분포 조회 성공

```json
{
  "totalStoredBytes": 128849018880, // 전체 저장량 합 (bytes) (number)
  "usersWithMedia": 412, // 미디어를 1건이라도 올린 전체 사용자 수 (number)
  "tiers": [
    {
      "tier": null, // SubscriptionTier
      "userCount": 1200, // 해당 등급 전체 사용자 수 (number)
      "usersWithMedia": 340, // 미디어를 1건이라도 올린 사용자 수 (number)
      "totalBytes": 53687091200, // 등급 합계 저장량 (bytes) (number)
      "medianBytes": 314572800, // 미디어가 있는 사용자 기준 중앙값 (bytes) (number)
      "maxBytes": 39728447488, // 최대 사용자의 저장량 (bytes) (number)
      "limitBytes": 42949672960, // 등급 누적 한도 (bytes) (number)
      "nearLimitCount": 12, // 한도의 80% 이상 100% 미만 사용자 수 (상위 등급 수요 신호) (number)
      "overLimitCount": 3 // 한도를 이미 넘긴 사용자 수 (number)
    }
  ], // 등급별 요약 (AdminTierStorageDto[])
  "buckets": [
    {
      "label": "~500MB", // 구간 이름 (string)
      "maxBytes": 524288000, // 구간 상한 (bytes). null이면 상한 없음 (number | null)
      "userCount": 87 // 구간에 속한 사용자 수 (number)
    }
  ] // 저장량 구간별 사용자 분포 (미디어가 있는 사용자만) (AdminStorageBucketDto[])
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
  "isAdmin": false, // 운영자 여부 (boolean)
  "provider": "LOCAL", // 소셜 로그인 제공자 (string)
  "subscriptionTier": null, // SubscriptionTier
  "subscriptionExpiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isSubscriptionActive": false, // 구독 활성 여부 (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 가입일 (Date)
  "lastLoginAt": "2025-01-01T00:00:00Z", // 마지막 로그인 (Date | null)
  "deletedAt": "2024-01-08T00:00:00.000Z", // 삭제 예약 일시 (null이면 정상 계정) (Date | null)
  "storageUsedBytes": 1073741824 // 다이어리 미디어 저장 사용량 (bytes). R2에 실제 올라간 것만 세므로 앱의 한도 게이지보다 작을 수 있다 (number)
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
  "expiresAt": "2026-12-31T23:59:59.000Z" // 구독 만료일 (ISO 8601). null이면 기간 무제한. 과거 날짜도 허용된다 (만료 상태 데모 계정용). (string | null?)
}
```

**Responses:**

#### 200 - 구독 수정 성공

```json
{
  "id": "uuid-1234", // string
  "name": "홍길동", // string
  "email": "user@example.com", // string | null
  "isAdmin": false, // 운영자 여부 (boolean)
  "provider": "LOCAL", // 소셜 로그인 제공자 (string)
  "subscriptionTier": null, // SubscriptionTier
  "subscriptionExpiresAt": "2025-01-01T00:00:00Z", // 구독 만료일 (Date | null)
  "isSubscriptionActive": false, // 구독 활성 여부 (boolean)
  "createdAt": "2025-01-01T00:00:00Z", // 가입일 (Date)
  "lastLoginAt": "2025-01-01T00:00:00Z", // 마지막 로그인 (Date | null)
  "deletedAt": "2024-01-08T00:00:00.000Z", // 삭제 예약 일시 (null이면 정상 계정) (Date | null)
  "storageUsedBytes": 1073741824 // 다이어리 미디어 저장 사용량 (bytes). R2에 실제 올라간 것만 세므로 앱의 한도 게이지보다 작을 수 있다 (number)
}
```

#### 404 - 사용자를 찾을 수 없습니다

---
