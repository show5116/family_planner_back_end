# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 그룹 멤버

**Base Path:** `/groups`

### POST `groups/join`

**요약:** 초대 코드로 그룹 가입

**Request Body:**

```json
{
  "inviteCode": "ABC123XYZ" // 그룹 초대 코드 (string)
}
```

**Responses:**

#### 201 - 그룹 가입 성공 또는 가입 요청 성공

```json
{
  "message": "그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요.", // 이메일 초대를 받은 경우: "그룹 가입이 완료되었습니다", 일반 요청: "그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요." (string)
  "joinRequestId": "uuid", // 가입 요청 ID (일반 요청인 경우만) (string?)
  "groupName": "우리 가족", // 그룹명 (일반 요청인 경우만) (string?)
  "status": "PENDING", // 요청 상태 (일반 요청인 경우만) (string?)
  "member": {
    "id": "uuid", // 멤버십 ID (string)
    "groupId": "uuid", // 그룹 ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "roleId": "uuid", // 역할 ID (string)
    "role": {
      "id": "uuid",
      "name": "OWNER",
      "color": "#6366F1",
      "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
    }, // RoleDto
    "user": {
      "id": "user_clxxx123",
      "email": "user@example.com",
      "name": "홍길동",
      "isEmailVerified": true,
      "isAdmin": false,
      "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
      "phoneNumber": "010-1234-5678",
      "socialProvider": "google",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }, // UserDto
    "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
    "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
  }, // 생성된 멤버 정보 (이메일 초대받은 경우만) (GroupMemberDto?)
  "group": {
    "id": "uuid", // 그룹 ID (string)
    "name": "우리 가족", // 그룹명 (string)
    "description": "가족 일정 관리", // 그룹 설명 (string | null)
    "inviteCode": "AbC123Xy", // 초대 코드 (string)
    "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
    "defaultColor": "#6366F1", // 그룹 기본 색상 (HEX 형식) (string)
    "createdAt": "2025-12-04T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-04T00:00:00Z", // 수정일 (Date)
    "members": {
      "id": "uuid",
      "groupId": "uuid",
      "userId": "uuid",
      "roleId": "uuid",
      "role": "<RoleDto>",
      "user": "<UserDto>",
      "customColor": "#FF5733",
      "joinedAt": "2025-12-04T00:00:00Z"
    } // GroupMemberDto[]
  } // 그룹 정보 (이메일 초대받은 경우만) (GroupDto?)
}
```

#### 404 - 유효하지 않은 초대 코드 또는 만료된 초대 코드

---

### POST `groups/:id/leave`

**요약:** 그룹 나가기

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 그룹 나가기 성공

```json
{
  "message": "그룹에서 나갔습니다" // string
}
```

#### 404 - 그룹 멤버를 찾을 수 없음

---

### GET `groups/:id/members`

**요약:** 그룹 멤버 목록 조회

**인증/권한:**

- GroupMembershipGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 멤버 목록 반환

```json
{
  "id": "uuid", // 멤버십 ID (string)
  "groupId": "uuid", // 그룹 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "roleId": "uuid", // 역할 ID (string)
  "role": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  }, // RoleDto
  "user": {
    "id": "user_clxxx123", // 사용자 ID (string)
    "email": "user@example.com", // 이메일 (string)
    "name": "홍길동", // 사용자 이름 (string)
    "isEmailVerified": true, // 이메일 인증 여부 (boolean)
    "isAdmin": false, // 운영자 여부 (boolean)
    "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg", // 프로필 이미지 URL (R2 public URL) (string?)
    "phoneNumber": "010-1234-5678", // 전화번호 (string?)
    "socialProvider": "google", // 소셜 로그인 제공자 (string?)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  }, // UserDto
  "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
  "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
}
```

#### 403 - 접근 권한 없음

---

### PATCH `groups/:id/members/:userId/role`

**요약:** 멤버 역할 변경 (MANAGE_MEMBER 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)
- `userId` (`string`)

**Request Body:**

```json
{
  "roleId": "550e8400-e29b-41d4-a716-446655440000" // 역할 ID (Role 테이블의 ID) (string)
}
```

**Responses:**

#### 200 - 역할 변경 성공

```json
{
  "id": "uuid", // 멤버십 ID (string)
  "groupId": "uuid", // 그룹 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "roleId": "uuid", // 역할 ID (string)
  "role": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  }, // RoleDto
  "user": {
    "id": "user_clxxx123", // 사용자 ID (string)
    "email": "user@example.com", // 이메일 (string)
    "name": "홍길동", // 사용자 이름 (string)
    "isEmailVerified": true, // 이메일 인증 여부 (boolean)
    "isAdmin": false, // 운영자 여부 (boolean)
    "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg", // 프로필 이미지 URL (R2 public URL) (string?)
    "phoneNumber": "010-1234-5678", // 전화번호 (string?)
    "socialProvider": "google", // 소셜 로그인 제공자 (string?)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  }, // UserDto
  "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
  "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
}
```

#### 403 - 권한 없음

#### 404 - 멤버를 찾을 수 없음

---

### PATCH `groups/:id/my-color`

**요약:** 개인 그룹 색상 설정

**인증/권한:**

- GroupMembershipGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "customColor": "#FF5733" // 개인 그룹 색상 (HEX 코드) (string)
}
```

**Responses:**

#### 200 - 색상 설정 성공

```json
{
  "message": "그룹 색상이 설정되었습니다", // string
  "customColor": "#FF5733" // 설정된 색상 (string | null)
}
```

#### 403 - 접근 권한 없음

---

### DELETE `groups/:id/members/:userId`

**요약:** 멤버 삭제 (MANAGE_MEMBER 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)
- `userId` (`string`)

**Responses:**

#### 200 - 멤버 삭제 성공

```json
{
  "message": "멤버가 삭제되었습니다" // string
}
```

#### 403 - 권한 없음

#### 404 - 멤버를 찾을 수 없음

---

### POST `groups/:id/regenerate-code`

**요약:** 초대 코드 재생성 (INVITE_MEMBER 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 초대 코드 재생성 성공

```json
{
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z" // 초대 코드 만료 시간 (Date)
}
```

#### 403 - 권한 없음

---

### POST `groups/:id/invite-by-email`

**요약:** 이메일로 그룹 초대 (INVITE_MEMBER 권한 필요)

**설명:**
초대할 사용자의 이메일로 초대 코드가 포함된 이메일을 발송합니다. 해당 이메일로 가입된 사용자가 있어야 합니다.

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "email": "user@example.com" // 초대할 사용자의 이메일 (string)
}
```

**Responses:**

#### 200 - 초대 이메일 발송 성공

```json
{
  "message": "초대 이메일이 발송되었습니다", // string
  "email": "user@example.com", // 초대받은 사용자의 이메일 (string)
  "groupName": "우리 가족", // 그룹명 (string)
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
  "joinRequestId": "uuid" // 가입 요청 ID (string)
}
```

#### 403 - 권한 없음

#### 404 - 그룹을 찾을 수 없음

---

### POST `groups/:id/transfer-ownership`

**요약:** OWNER 권한 양도 (현재 OWNER만 가능)

**설명:**
그룹의 OWNER 권한을 다른 멤버에게 양도합니다. 양도 후 현재 OWNER는 MEMBER 역할로 변경됩니다.

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "newOwnerId": "550e8400-e29b-41d4-a716-446655440000" // 새로운 OWNER가 될 사용자 ID (string)
}
```

**Responses:**

#### 200 - OWNER 권한 양도 성공

```json
{
  "message": "OWNER 권한이 성공적으로 양도되었습니다", // string
  "previousOwner": {
    "id": "uuid", // 멤버십 ID (string)
    "groupId": "uuid", // 그룹 ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "roleId": "uuid", // 역할 ID (string)
    "role": {
      "id": "uuid",
      "name": "OWNER",
      "color": "#6366F1",
      "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
    }, // RoleDto
    "user": {
      "id": "user_clxxx123",
      "email": "user@example.com",
      "name": "홍길동",
      "isEmailVerified": true,
      "isAdmin": false,
      "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
      "phoneNumber": "010-1234-5678",
      "socialProvider": "google",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }, // UserDto
    "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
    "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
  }, // GroupMemberDto
  "newOwner": {
    "id": "uuid", // 멤버십 ID (string)
    "groupId": "uuid", // 그룹 ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "roleId": "uuid", // 역할 ID (string)
    "role": {
      "id": "uuid",
      "name": "OWNER",
      "color": "#6366F1",
      "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
    }, // RoleDto
    "user": {
      "id": "user_clxxx123",
      "email": "user@example.com",
      "name": "홍길동",
      "isEmailVerified": true,
      "isAdmin": false,
      "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
      "phoneNumber": "010-1234-5678",
      "socialProvider": "google",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }, // UserDto
    "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
    "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
  } // GroupMemberDto
}
```

#### 403 - 현재 OWNER가 아니거나 그룹 멤버가 아님

#### 404 - 새로운 OWNER가 될 사용자를 그룹에서 찾을 수 없음

---

### GET `groups/:id/join-requests`

**요약:** 그룹 가입 요청 목록 조회 (INVITE_MEMBER 권한 필요)

**설명:**
status 쿼리 파라미터로 필터링 가능 (PENDING, ACCEPTED, REJECTED)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `status` (`string`) - Optional

**Responses:**

#### 200 - 가입 요청 목록 조회 성공

```json
{
  "id": "uuid", // 가입 요청 ID (string)
  "groupId": "uuid", // 그룹 ID (string)
  "type": "INVITE", // 요청 타입 (string)
  "email": "user@example.com", // 이메일 (string)
  "status": "PENDING", // 상태 (string)
  "createdAt": "2025-12-04T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-04T00:00:00Z" // 수정일 (Date)
}
```

#### 403 - 권한 없음

---

### POST `groups/:id/join-requests/:requestId/accept`

**요약:** 가입 요청 승인 (INVITE_MEMBER 권한 필요)

**설명:**
PENDING 상태의 가입 요청을 승인하고 그룹 멤버로 추가

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)
- `requestId` (`string`)

**Responses:**

#### 200 - 가입 요청 승인 성공

```json
{
  "message": "가입 요청이 승인되었습니다", // string
  "member": {
    "id": "uuid", // 멤버십 ID (string)
    "groupId": "uuid", // 그룹 ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "roleId": "uuid", // 역할 ID (string)
    "role": {
      "id": "uuid",
      "name": "OWNER",
      "color": "#6366F1",
      "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
    }, // RoleDto
    "user": {
      "id": "user_clxxx123",
      "email": "user@example.com",
      "name": "홍길동",
      "isEmailVerified": true,
      "isAdmin": false,
      "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
      "phoneNumber": "010-1234-5678",
      "socialProvider": "google",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }, // UserDto
    "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
    "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
  } // GroupMemberDto
}
```

#### 403 - 권한 없음

#### 404 - 가입 요청을 찾을 수 없음

---

### POST `groups/:id/join-requests/:requestId/reject`

**요약:** 가입 요청 거부 (INVITE_MEMBER 권한 필요)

**설명:**
PENDING 상태의 가입 요청을 거부

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)
- `requestId` (`string`)

**Responses:**

#### 200 - 가입 요청 거부 성공

```json
{
  "message": "가입 요청이 거부되었습니다" // string
}
```

#### 403 - 권한 없음

#### 404 - 가입 요청을 찾을 수 없음

---

### DELETE `groups/:id/invites/:requestId`

**요약:** 초대 취소 (INVITE_MEMBER 권한 필요)

**설명:**
INVITE 타입의 PENDING 상태 초대를 취소합니다

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)
- `requestId` (`string`)

**Responses:**

#### 200 - 초대 취소 성공

```json
{
  "message": "초대가 취소되었습니다" // string
}
```

#### 403 - 권한 없음

#### 404 - 초대 요청을 찾을 수 없음

---

### POST `groups/:id/invites/:requestId/resend`

**요약:** 초대 재전송 (INVITE_MEMBER 권한 필요)

**설명:**
INVITE 타입의 PENDING 상태 초대 이메일을 재전송합니다

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)
- `requestId` (`string`)

**Responses:**

#### 200 - 초대 이메일 재전송 성공

```json
{
  "message": "초대 이메일이 재전송되었습니다", // string
  "email": "user@example.com", // 초대받은 사용자의 이메일 (string)
  "groupName": "우리 가족", // 그룹명 (string)
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
  "joinRequestId": "uuid" // 가입 요청 ID (string)
}
```

#### 403 - 권한 없음

#### 404 - 초대 요청을 찾을 수 없음

---

## 그룹 역할

**Base Path:** `/groups`

### GET `groups/:groupId/roles`

**요약:** 그룹별 역할 전체 조회 (그룹 멤버 전용)

**설명:**
공통 역할 + 해당 그룹의 커스텀 역할 조회

**인증/권한:**

- GroupMembershipGuard

**Path Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 역할 목록 반환

#### 403 - 그룹 멤버가 아님

---

### POST `groups/:groupId/roles`

**요약:** 그룹별 커스텀 역할 생성 (MANAGE_ROLE 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "name": "ADMIN", // 역할명 (string)
  "groupId": null, // 그룹 ID (null이면 공통 역할) (string | null?)
  "isDefaultRole": false, // 기본 역할 여부 (초대 시 자동 부여) (boolean?)
  "permissions": ["VIEW", "CREATE", "UPDATE"], // 권한 배열 (PermissionCode[])
  "color": "#6366F1", // 역할 색상 (HEX 형식) (string?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 201 - 역할 생성 성공

#### 403 - MANAGE_ROLE 권한 없음

---

### PATCH `groups/:groupId/roles/:id`

**요약:** 그룹별 커스텀 역할 수정 (MANAGE_ROLE 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `groupId` (`string`)
- `id` (`string`)

**Request Body:**

```json
{
  "name": "ADMIN", // 역할명 (string?)
  "isDefaultRole": false, // 기본 역할 여부 (초대 시 자동 부여) (boolean?)
  "permissions": ["VIEW", "CREATE", "UPDATE"], // 권한 배열 (PermissionCode[]?)
  "color": "#6366F1", // 역할 색상 (HEX 형식) (string?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 200 - 역할 수정 성공

#### 403 - MANAGE_ROLE 권한 없음

#### 404 - 역할을 찾을 수 없음

---

### DELETE `groups/:groupId/roles/:id`

**요약:** 그룹별 커스텀 역할 삭제 (MANAGE_ROLE 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `groupId` (`string`)
- `id` (`string`)

**Responses:**

#### 200 - 역할 삭제 성공

#### 403 - MANAGE_ROLE 권한 없음

#### 404 - 역할을 찾을 수 없음

---

### PATCH `groups/:groupId/roles/bulk/sort-order`

**요약:** 그룹별 역할 일괄 정렬 순서 업데이트 (MANAGE_ROLE 권한 필요)

**설명:**
여러 역할의 정렬 순서를 한 번에 업데이트합니다. 드래그 앤 드롭 후 사용하세요.

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `groupId` (`string`)

**Request Body:**

```json
{
  "items": [
    { "id": "role-1", "sortOrder": 0 },
    { "id": "role-2", "sortOrder": 1 },
    { "id": "role-3", "sortOrder": 2 }
  ] // 역할 ID와 정렬 순서 배열 (RoleSortOrderItem[])
}
```

**Responses:**

#### 200 - 정렬 순서 업데이트 성공

#### 403 - MANAGE_ROLE 권한 없음

---

## 그룹

**Base Path:** `/groups`

### POST `groups`

**요약:** 그룹 생성

**Request Body:**

```json
{
  "name": "우리 가족", // 그룹명 (string)
  "description": "가족 일정 및 할일 공유 그룹", // 그룹 설명 (string?)
  "defaultColor": "#6366F1" // 그룹 기본 색상 (HEX 코드) (string?)
}
```

**Responses:**

#### 201 - 그룹 생성 성공

```json
{
  "id": "uuid", // 그룹 ID (string)
  "name": "우리 가족", // 그룹명 (string)
  "description": "가족 일정 관리", // 그룹 설명 (string | null)
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
  "defaultColor": "#6366F1", // 그룹 기본 색상 (HEX 형식) (string)
  "createdAt": "2025-12-04T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-04T00:00:00Z", // 수정일 (Date)
  "members": [
    {
      "id": "uuid", // 멤버십 ID (string)
      "groupId": "uuid", // 그룹 ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "roleId": "uuid", // 역할 ID (string)
      "role": {
        "id": "uuid",
        "name": "OWNER",
        "color": "#6366F1",
        "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
      }, // RoleDto
      "user": {
        "id": "user_clxxx123",
        "email": "user@example.com",
        "name": "홍길동",
        "isEmailVerified": true,
        "isAdmin": false,
        "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
        "phoneNumber": "010-1234-5678",
        "socialProvider": "google",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }, // UserDto
      "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
      "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
    }
  ] // GroupMemberDto[]
}
```

---

### GET `groups`

**요약:** 내가 속한 그룹 목록 조회

**Responses:**

#### 200 - 그룹 목록 반환

```json
{
  "id": "uuid", // 그룹 ID (string)
  "name": "우리 가족", // 그룹명 (string)
  "description": "가족 일정 관리", // 그룹 설명 (string | null)
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
  "defaultColor": "#6366F1", // 그룹 기본 색상 (HEX 형식) (string)
  "createdAt": "2025-12-04T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-04T00:00:00Z", // 수정일 (Date)
  "myColor": "#FF5733", // 내 색상 (개인 설정 또는 그룹 기본 색상) (string)
  "myRole": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  }, // 내 역할 (RoleDto)
  "_count": 5 // 그룹 멤버 수 ({ members: number; })
}
```

---

### GET `groups/:id`

**요약:** 그룹 상세 조회

**인증/권한:**

- GroupMembershipGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 그룹 상세 정보 반환

```json
{
  "id": "uuid", // 그룹 ID (string)
  "name": "우리 가족", // 그룹명 (string)
  "description": "가족 일정 관리", // 그룹 설명 (string | null)
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
  "defaultColor": "#6366F1", // 그룹 기본 색상 (HEX 형식) (string)
  "createdAt": "2025-12-04T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-04T00:00:00Z", // 수정일 (Date)
  "members": [
    {
      "id": "uuid", // 멤버십 ID (string)
      "groupId": "uuid", // 그룹 ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "roleId": "uuid", // 역할 ID (string)
      "role": {
        "id": "uuid",
        "name": "OWNER",
        "color": "#6366F1",
        "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
      }, // RoleDto
      "user": {
        "id": "user_clxxx123",
        "email": "user@example.com",
        "name": "홍길동",
        "isEmailVerified": true,
        "isAdmin": false,
        "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
        "phoneNumber": "010-1234-5678",
        "socialProvider": "google",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }, // UserDto
      "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
      "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
    }
  ] // GroupMemberDto[]
}
```

#### 403 - 접근 권한 없음

#### 404 - 그룹을 찾을 수 없음

---

### PATCH `groups/:id`

**요약:** 그룹 정보 수정 (UPDATE_GROUP 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "우리 가족", // 그룹명 (string?)
  "description": "가족 일정 및 할일 공유 그룹", // 그룹 설명 (string?)
  "defaultColor": "#6366F1" // 그룹 기본 색상 (HEX 코드) (string?)
}
```

**Responses:**

#### 200 - 그룹 수정 성공

```json
{
  "id": "uuid", // 그룹 ID (string)
  "name": "우리 가족", // 그룹명 (string)
  "description": "가족 일정 관리", // 그룹 설명 (string | null)
  "inviteCode": "AbC123Xy", // 초대 코드 (string)
  "inviteCodeExpiresAt": "2025-12-24T00:00:00Z", // 초대 코드 만료 시간 (Date)
  "defaultColor": "#6366F1", // 그룹 기본 색상 (HEX 형식) (string)
  "createdAt": "2025-12-04T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-04T00:00:00Z", // 수정일 (Date)
  "members": [
    {
      "id": "uuid", // 멤버십 ID (string)
      "groupId": "uuid", // 그룹 ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "roleId": "uuid", // 역할 ID (string)
      "role": {
        "id": "uuid",
        "name": "OWNER",
        "color": "#6366F1",
        "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"]
      }, // RoleDto
      "user": {
        "id": "user_clxxx123",
        "email": "user@example.com",
        "name": "홍길동",
        "isEmailVerified": true,
        "isAdmin": false,
        "profileImageUrl": "https://r2.yourdomain.com/profiles/google-123456.jpg",
        "phoneNumber": "010-1234-5678",
        "socialProvider": "google",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }, // UserDto
      "customColor": "#FF5733", // 개인 설정 색상 (HEX 형식) (string | null)
      "joinedAt": "2025-12-04T00:00:00Z" // 가입일 (Date)
    }
  ] // GroupMemberDto[]
}
```

#### 403 - 권한 없음

#### 404 - 그룹을 찾을 수 없음

---

### DELETE `groups/:id`

**요약:** 그룹 삭제 (DELETE_GROUP 권한 필요)

**인증/권한:**

- GroupPermissionGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 그룹 삭제 성공

```json
{
  "message": "그룹이 삭제되었습니다" // string
}
```

#### 403 - 권한 없음

#### 404 - 그룹을 찾을 수 없음

---
