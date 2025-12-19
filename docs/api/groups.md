# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

생성일: 2025-12-19T15:05:41.930Z

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
        "permissions": ["INVITE_MEMBER","UPDATE_GROUP"]
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
    "permissions": ["INVITE_MEMBER","UPDATE_GROUP"] // 권한 배열 (string[])
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

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | - |

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
        "permissions": ["INVITE_MEMBER","UPDATE_GROUP"]
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

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | - |

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
        "permissions": ["INVITE_MEMBER","UPDATE_GROUP"]
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

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | - |

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

