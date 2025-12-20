# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

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
