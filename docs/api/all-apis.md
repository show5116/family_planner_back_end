# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

##

**Base Path:** `/`

### GET ``

---

## 인증

**Base Path:** `/auth`

### POST `auth/signup`

**요약:** 회원가입

**Request Body:**

```json
{
  "email": "user@example.com", // 이메일 (string)
  "password": "password123", // 비밀번호 (최소 6자) (string)
  "name": "홍길동" // 사용자 이름 (string)
}
```

**Responses:**

#### 201 - 회원가입 성공

```json
{
  "message": "회원가입 성공! 이메일을 확인하여 계정을 인증해주세요.", // 응답 메시지 (string)
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
  } // 생성된 사용자 정보 (UserDto)
}
```

#### 409 - 이미 사용 중인 이메일

---

### POST `auth/login`

**요약:** 로그인

**인증/권한:**

- LocalAuthGuard

**Responses:**

#### 200 - 로그인 성공, Access Token과 Refresh Token 반환

```json
{
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
  } // 사용자 정보 (UserDto)
}
```

#### 401 - 인증 실패

---

### POST `auth/refresh`

**요약:** Access Token 갱신 (RTR)

**Request Body:**

```json
{
  "refreshToken": "" // Refresh Token (웹 브라우저는 Cookie에서 자동으로 읽음, 모바일 앱은 필수) (string?)
}
```

**Responses:**

#### 200 - 토큰 갱신 성공, 새로운 Access Token과 Refresh Token 반환

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImlhdCI6MTYxNjIzOTAyMn0...", // Access Token (JWT) (string)
  "refreshToken": "refresh_token_abc123def456" // Refresh Token (RTR 방식) (string)
}
```

#### 401 - 유효하지 않거나 만료된 Refresh Token

---

### POST `auth/logout`

**요약:** 로그아웃

**Request Body:**

```json
{
  "refreshToken": "" // Refresh Token (웹 브라우저는 Cookie에서 자동으로 읽음, 모바일 앱은 필수) (string?)
}
```

**Responses:**

#### 200 - 로그아웃 성공

```json
{
  "message": "로그아웃되었습니다." // 응답 메시지 (string)
}
```

#### 404 - Refresh Token을 찾을 수 없음

---

### POST `auth/verify-email`

**요약:** 이메일 인증

**Request Body:**

```json
{
  "code": "123456" // 이메일 인증 코드 (6자리 숫자) (string)
}
```

**Responses:**

#### 200 - 이메일 인증 성공

```json
{
  "message": "이메일이 성공적으로 인증되었습니다!" // 응답 메시지 (string)
}
```

#### 400 - 유효하지 않거나 만료된 인증 코드

---

### POST `auth/resend-verification`

**요약:** 인증 이메일 재전송

**Request Body:**

```json
{
  "email": "user@example.com" // 이메일 (string)
}
```

**Responses:**

#### 200 - 인증 이메일 재전송 성공

```json
{
  "message": "인증 이메일이 재전송되었습니다." // 응답 메시지 (string)
}
```

#### 400 - 이미 인증된 이메일이거나 요청 실패

#### 404 - 사용자를 찾을 수 없음

---

### GET `auth/me`

**요약:** 현재 로그인한 사용자 정보 조회

**Responses:**

#### 200 - 사용자 정보 반환 (isAdmin, profileImage 포함)

```json
{}
```

---

### POST `auth/request-password-reset`

**요약:** 비밀번호 재설정 요청

**Request Body:**

```json
{
  "email": "user@example.com" // 비밀번호를 재설정할 계정의 이메일 (string)
}
```

**Responses:**

#### 200 - 인증 코드가 이메일로 전송됨

```json
{
  "message": "비밀번호 재설정 이메일이 전송되었습니다." // 응답 메시지 (string)
}
```

#### 400 - 요청 실패

#### 404 - 사용자를 찾을 수 없음

---

### POST `auth/reset-password`

**요약:** 비밀번호 재설정

**Request Body:**

```json
{
  "email": "user@example.com", // 이메일 (string)
  "code": "123456", // 이메일로 받은 6자리 인증 코드 (string)
  "newPassword": "newPassword123" // 새 비밀번호 (최소 6자) (string)
}
```

**Responses:**

#### 200 - 비밀번호 재설정 성공

```json
{
  "message": "비밀번호가 성공적으로 변경되었습니다." // 응답 메시지 (string)
}
```

#### 400 - 유효하지 않거나 만료된 인증 코드

---

### PATCH `auth/update-profile`

**요약:** 프로필 업데이트 (이름, 프로필 이미지, 전화번호, 비밀번호)

**Request Body:**

```json
{
  "currentPassword": "currentPassword123!", // 현재 비밀번호 (필수) (string)
  "name": "홍길동", // 이름 (string?)
  "phoneNumber": "010-1234-5678", // 전화번호 (string?)
  "newPassword": "newPassword123!" // 새 비밀번호 (선택, 변경 시에만) (string?)
}
```

**Responses:**

#### 200 - 프로필 업데이트 성공

```json
{
  "message": "프로필이 업데이트되었습니다.", // 응답 메시지 (string)
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
  } // 업데이트된 사용자 정보 (UserDto)
}
```

#### 400 - 업데이트할 정보가 없거나 비밀번호가 설정되지 않음

---

### POST `auth/upload-profile-photo`

**요약:** 프로필 사진 업로드

**설명:**
프로필 사진을 업로드합니다. 이미지는 자동으로 300x300px로 최적화되며, 기존 사진이 있으면 삭제됩니다.

**Responses:**

#### 201 - 프로필 사진 업로드 성공

#### 400 - 파일이 제공되지 않았거나 유효하지 않은 이미지

---

### GET `auth/google`

**요약:** Google 로그인 시작

**인증/권한:**

- GoogleAuthGuard

**Responses:**

#### 302 - Google OAuth 페이지로 리다이렉트

---

### GET `auth/google/callback`

**요약:** Google 로그인 콜백

**인증/권한:**

- GoogleAuthGuard

**Responses:**

#### 200 - Google 로그인 성공, 토큰 반환

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImlhdCI6MTYxNjIzOTAyMn0...", // Access Token (JWT) (string)
  "refreshToken": "refresh_token_abc123def456" // Refresh Token (RTR 방식) (string)
}
```

---

### GET `auth/kakao`

**요약:** Kakao 로그인 시작

**인증/권한:**

- KakaoAuthGuard

**Responses:**

#### 302 - Kakao OAuth 페이지로 리다이렉트

---

### GET `auth/kakao/callback`

**요약:** Kakao 로그인 콜백

**인증/권한:**

- KakaoAuthGuard

**Responses:**

#### 200 - Kakao 로그인 성공, 토큰 반환

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImlhdCI6MTYxNjIzOTAyMn0...", // Access Token (JWT) (string)
  "refreshToken": "refresh_token_abc123def456" // Refresh Token (RTR 방식) (string)
}
```

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

## Notifications

**Base Path:** `/notifications`

### POST `notifications/token`

**요약:** FCM 디바이스 토큰 등록

**설명:**
사용자의 FCM 디바이스 토큰을 등록합니다. 이미 등록된 토큰인 경우 마지막 사용 시간을 업데이트합니다.

**Request Body:**

```json
{
  "token": "fGw3ZJ0kRZe-Xz9YlK6J7M:APA91bH4...(생략)...k5L8mN9oP0qR1sT2u", // FCM 디바이스 토큰 (string)
  "platform": null // 디바이스 플랫폼 (DevicePlatform)
}
```

**Responses:**

#### 201 - 토큰이 성공적으로 등록되었습니다.

#### 409 - 토큰이 이미 다른 사용자에게 등록되어 있습니다.

---

### DELETE `notifications/token/:token`

**요약:** FCM 디바이스 토큰 삭제

**설명:**
로그아웃 또는 디바이스 변경 시 FCM 토큰을 삭제합니다.

**Path Parameters:**

- `token` (`string`)

**Responses:**

#### 200 - 토큰이 성공적으로 삭제되었습니다.

#### 404 - 토큰을 찾을 수 없습니다.

---

### GET `notifications/settings`

**요약:** 알림 설정 조회

**설명:**
사용자의 카테고리별 알림 설정을 조회합니다.

**Responses:**

#### 200 - 알림 설정 목록

---

### PUT `notifications/settings`

**요약:** 알림 설정 업데이트

**설명:**
특정 카테고리의 알림 활성화/비활성화를 설정합니다.

**Request Body:**

```json
{
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

**Responses:**

#### 200 - 알림 설정이 업데이트되었습니다.

---

### GET `notifications`

**요약:** 알림 목록 조회

**설명:**
사용자의 알림 히스토리를 페이지네이션으로 조회합니다.

**Query Parameters:**

- `query` (`QueryNotificationsDto`)

**Responses:**

#### 200 - 알림 목록 및 페이지네이션 정보

---

### GET `notifications/unread-count`

**요약:** 읽지 않은 알림 개수 조회

**설명:**
사용자의 읽지 않은 알림 개수를 조회합니다.

**Responses:**

#### 200 - 읽지 않은 알림 개수

---

### PUT `notifications/:id/read`

**요약:** 알림 읽음 처리

**설명:**
특정 알림을 읽음 상태로 변경합니다.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림이 읽음 처리되었습니다.

#### 404 - 알림을 찾을 수 없습니다.

---

### DELETE `notifications/:id`

**요약:** 알림 삭제

**설명:**
특정 알림을 삭제합니다.

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림이 삭제되었습니다.

#### 404 - 알림을 찾을 수 없습니다.

---

## permissions

**Base Path:** `/permissions`

### GET `permissions`

**요약:** 전체 권한 목록 조회

**설명:**
UI에서 권한 선택 시 사용. 카테고리별 필터링 가능

**Query Parameters:**

- `category` (`string`) - Optional

**Responses:**

#### 200 - 권한 목록 조회 성공

```json
{
  "permissions": [
    {
      "id": "perm_clxxx123", // 권한 ID (string)
      "code": "VIEW", // 권한 코드 (PermissionCode)
      "name": "그룹 조회", // 권한 이름 (string)
      "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
      "category": "GROUP", // 권한 카테고리 (PermissionCategory)
      "isActive": true, // 활성화 여부 (boolean)
      "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
      "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
      "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
    }
  ], // 전체 권한 목록 (PermissionDto[])
  "groupedByCategory": {
    "GROUP": [
      {
        "id": "perm_clxxx123",
        "code": "group:read",
        "name": "그룹 조회",
        "description": "그룹 정보를 조회할 수 있는 권한",
        "category": "GROUP"
      }
    ],
    "SCHEDULE": [
      {
        "id": "perm_clxxx456",
        "code": "schedule:read",
        "name": "일정 조회",
        "description": "일정 정보를 조회할 수 있는 권한",
        "category": "SCHEDULE"
      }
    ]
  }, // 카테고리별로 그룹화된 권한 (Record<string, PermissionDto[]>)
  "categories": ["GROUP", "SCHEDULE", "TASK", "BUDGET", "PHOTO", "ADMIN"] // 사용 가능한 카테고리 목록 (PermissionCategory[])
}
```

---

### POST `permissions`

**요약:** 권한 생성

**설명:**
새로운 권한을 생성합니다. 운영자 전용 API

**인증/권한:**

- AdminGuard

**Request Body:**

```json
{
  "code": "INVITE", // 권한 코드 (고유값) (PermissionCode)
  "name": "그룹 조회", // 권한 이름 (string)
  "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
  "category": "GROUP", // 권한 카테고리 (PermissionCategory)
  "isActive": true, // 활성화 여부 (boolean?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 201 -

```json
{
  "message": "권한이 생성되었습니다.", // 응답 메시지 (string)
  "permission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 생성된 권한 정보 (PermissionDto)
}
```

---

### PATCH `permissions/:id`

**요약:** 권한 수정

**설명:**
기존 권한 정보를 수정합니다. 운영자 전용 API

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "code": "VIEW", // 권한 코드 (고유값) (PermissionCode?)
  "name": "그룹 조회", // 권한 이름 (string?)
  "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
  "category": "GROUP", // 권한 카테고리 (PermissionCategory?)
  "isActive": true, // 활성화 여부 (boolean?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 200 - 권한 수정 성공

```json
{
  "message": "권한이 수정되었습니다.", // 응답 메시지 (string)
  "permission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 수정된 권한 정보 (PermissionDto)
}
```

---

### DELETE `permissions/:id`

**요약:** 권한 삭제 (소프트 삭제)

**설명:**
권한을 소프트 삭제합니다 (isActive=false). 운영자 전용 API

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 권한 삭제 성공

```json
{
  "message": "권한이 비활성화되었습니다.", // 응답 메시지 (string)
  "permission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 삭제된 권한 정보 (PermissionDto)
}
```

---

### DELETE `permissions/:id/hard`

**요약:** 권한 완전 삭제 (하드 삭제)

**설명:**
권한을 데이터베이스에서 완전히 삭제합니다. 위험한 작업이므로 주의 필요. 운영자 전용 API

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 권한 완전 삭제 성공

```json
{
  "message": "권한이 완전히 삭제되었습니다.", // 응답 메시지 (string)
  "deletedPermission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 삭제된 권한 정보 (PermissionDto)
}
```

---

### PATCH `permissions/bulk/sort-order`

**요약:** 권한 일괄 정렬 순서 업데이트 (운영자 전용)

**설명:**
여러 권한의 정렬 순서를 한 번에 업데이트합니다. 드래그 앤 드롭 후 사용하세요.

**인증/권한:**

- AdminGuard

**Request Body:**

```json
{
  "items": [
    { "id": "perm-1", "sortOrder": 0 },
    { "id": "perm-2", "sortOrder": 1 },
    { "id": "perm-3", "sortOrder": 2 }
  ] // 권한 ID와 정렬 순서 배열 (PermissionSortOrderItem[])
}
```

---

## 역할(Role) - 공통 역할 관리

**Base Path:** `/roles`

### GET `roles`

**요약:** 공통 역할 전체 조회 (운영자 전용)

**설명:**
⚠️ groupId=null인 공통 역할만 조회합니다. 그룹별 역할은 GET /groups/:groupId/roles 사용

**Responses:**

#### 200 - 공통 역할 목록 반환 (groupId=null)

```json
{
  "data": [
    {
      "id": "uuid", // 역할 ID (string)
      "name": "OWNER", // 역할명 (string)
      "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
      "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
    }
  ] // RoleDto[]
}
```

---

### POST `roles`

**요약:** 공통 역할 생성 (운영자 전용)

**설명:**
⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 생성합니다. 그룹별 역할은 POST /groups/:groupId/roles 사용

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

#### 201 -

```json
{
  "data": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  } // RoleDto
}
```

---

### PATCH `roles/:id`

**요약:** 공통 역할 수정 (운영자 전용)

**설명:**
⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 수정합니다. 그룹별 역할은 PATCH /groups/:groupId/roles/:id 사용

**Path Parameters:**

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

```json
{
  "data": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  } // RoleDto
}
```

---

### DELETE `roles/:id`

**요약:** 공통 역할 삭제 (운영자 전용)

**설명:**
⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 삭제합니다. 그룹별 역할은 DELETE /groups/:groupId/roles/:id 사용

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 역할 삭제 성공

```json
{
  "message": "역할이 삭제되었습니다", // string
  "deletedRole": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  } // RoleDto
}
```

---

### PATCH `roles/bulk/sort-order`

**요약:** 공통 역할 일괄 정렬 순서 업데이트 (운영자 전용)

**설명:**
여러 역할의 정렬 순서를 한 번에 업데이트합니다. 드래그 앤 드롭 후 사용하세요.

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

---

## Storage

**Base Path:** `/storage`

### POST `storage/upload`

**요약:** 파일 업로드

**설명:**
Cloudflare R2에 파일을 업로드합니다.

**Query Parameters:**

- `folder` (`string`)

**Responses:**

#### 201 - 파일 업로드 성공

#### 400 - 파일이 제공되지 않음

---

### GET `storage/download`

**요약:** 파일 다운로드 URL 생성

**설명:**
파일 다운로드를 위한 Presigned URL을 생성합니다.

**Query Parameters:**

- `key` (`string`)
- `expiresIn` (`number`) - Optional

**Responses:**

#### 200 - Presigned URL 생성 성공

---

### DELETE `storage`

**요약:** 파일 삭제

**설명:**
R2에서 파일을 삭제합니다.

**Query Parameters:**

- `key` (`string`)

**Responses:**

#### 200 - 파일 삭제 성공

---

### GET `storage/exists`

**요약:** 파일 존재 여부 확인

**설명:**
R2에 파일이 존재하는지 확인합니다.

**Query Parameters:**

- `key` (`string`)

**Responses:**

#### 200 - 파일 존재 여부

---
