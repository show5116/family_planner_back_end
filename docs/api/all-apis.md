# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 공지사항

**Base Path:** `/announcements`

### GET `announcements`

**요약:** 공지사항 목록 조회

**Query Parameters:**

- `page` (`number`) (Optional): 페이지 번호
- `limit` (`number`) (Optional): 페이지 크기
- `category` (`AnnouncementCategory`) (Optional): 카테고리 필터
- `pinnedOnly` (`boolean`) (Optional): 고정 공지만 조회

**Responses:**

#### 200 - 공지사항 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // 공지사항 ID (string)
      "title": "시스템 점검 안내", // 제목 (string)
      "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
      "category": null, // 카테고리 (AnnouncementCategory)
      "isPinned": false, // 고정 여부 (boolean)
      "author": {
        "id": "uuid",
        "name": "관리자"
      }, // 작성자 정보 (AnnouncementAuthorDto)
      "readCount": 42, // 읽은 사람 수 (number)
      "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 공지사항 목록 (AnnouncementDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `announcements/:id`

**요약:** 공지사항 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 공지사항 상세 조회 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "category": null, // 카테고리 (AnnouncementCategory)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

### POST `announcements`

**요약:** 공지사항 작성 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Request Body:**

```json
{
  "title": "v2.0 업데이트 안내", // 공지사항 제목 (string)
  "content": "새로운 기능이 추가되었습니다...", // 공지사항 내용 (Markdown 지원) (string)
  "category": null, // 공지사항 카테고리 (AnnouncementCategory)
  "isPinned": false, // 상단 고정 여부 (boolean?)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ] // 첨부파일 목록 (AttachmentDto[]?)
}
```

**Responses:**

#### 201 - 공지사항 작성 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "category": null, // 카테고리 (AnnouncementCategory)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `announcements/:id`

**요약:** 공지사항 수정 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 공지사항 수정 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "category": null, // 카테고리 (AnnouncementCategory)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

### DELETE `announcements/:id`

**요약:** 공지사항 삭제 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 공지사항 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

### PATCH `announcements/:id/pin`

**요약:** 공지사항 고정/해제 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "isPinned": true // 고정 여부 (boolean)
}
```

**Responses:**

#### 200 - 공지사항 고정/해제 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "category": null, // 카테고리 (AnnouncementCategory)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

##

**Base Path:** `/`

### GET ``

---

## 자산관리

**Base Path:** `/assets`

### POST `assets/accounts`

**요약:** 계좌 생성

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string?)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null // 계좌 유형 (AccountType)
}
```

**Responses:**

#### 201 - 계좌 생성 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/accounts`

**요약:** 계좌 목록 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID
- `userId` (`string`) (Optional): 특정 구성원 ID 필터

**Responses:**

#### 200 - 계좌 목록 조회 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/accounts/:id`

**요약:** 계좌 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 계좌 상세 조회 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `assets/accounts/:id`

**요약:** 계좌 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "주택청약", // 계좌명 (string?)
  "accountNumber": "123-456-789", // 계좌번호 (string?)
  "institution": "국민은행", // 금융기관명 (string?)
  "type": null // 계좌 유형 (AccountType?)
}
```

**Responses:**

#### 200 - 계좌 수정 성공

```json
{
  "id": "uuid-1234", // 계좌 ID (string)
  "groupId": "uuid-5678", // 그룹 ID (string)
  "userId": "uuid-9012", // 소유자 ID (string)
  "name": "주택청약", // 계좌명 (string)
  "accountNumber": "123-456-789", // 계좌번호 (string | null)
  "institution": "국민은행", // 금융기관명 (string)
  "type": null, // 계좌 유형 (AccountType)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일시 (Date)
  "updatedAt": "2025-01-01T00:00:00Z", // 수정일시 (Date)
  "latestBalance": "5000000.00", // 최신 잔액 (string | null)
  "profitRate": "4.17" // 수익률 (%) (string | null)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌만 수정할 수 있습니다

---

### DELETE `assets/accounts/:id`

**요약:** 계좌 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 계좌 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌만 삭제할 수 있습니다

---

### POST `assets/accounts/:id/records`

**요약:** 자산 기록 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "recordDate": "2026-03-01", // 기록 날짜 (YYYY-MM-DD) (string)
  "balance": 5000000, // 잔액 (number)
  "principal": 4800000, // 원금 (number)
  "profit": 200000, // 수익금 (number)
  "note": "이자 입금" // 메모 (string?)
}
```

**Responses:**

#### 201 - 자산 기록 추가 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-03-01", // 기록 날짜 (Date)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "note": "이자 입금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 본인의 계좌에만 기록을 추가할 수 있습니다

---

### GET `assets/accounts/:id/records`

**요약:** 자산 기록 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 자산 기록 목록 조회 성공

```json
{
  "id": "uuid-1234", // 기록 ID (string)
  "accountId": "uuid-5678", // 계좌 ID (string)
  "recordDate": "2026-03-01", // 기록 날짜 (Date)
  "balance": "5000000.00", // 잔액 (string)
  "principal": "4800000.00", // 원금 (string)
  "profit": "200000.00", // 수익금 (string)
  "note": "이자 입금", // 메모 (string | null)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일시 (Date)
}
```

#### 404 - 계좌를 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `assets/statistics`

**요약:** 그룹 자산 통계 조회

**Query Parameters:**

- `query` (`StatisticsQueryDto`)

**Responses:**

#### 200 - 자산 통계 조회 성공

```json
{
  "totalBalance": "50000000.00", // 총 잔액 (string)
  "totalPrincipal": "48000000.00", // 총 원금 (string)
  "totalProfit": "2000000.00", // 총 수익금 (string)
  "profitRate": "4.17", // 전체 수익률 (%) (string)
  "accountCount": 5, // 총 계좌 수 (number)
  "byType": [
    {
      "type": null, // 계좌 유형 (AccountType)
      "balance": "10000000.00", // 총 잔액 (string)
      "count": 2 // 계좌 수 (number)
    }
  ] // 유형별 통계 (AccountTypeStatDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

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
  "email": "user@example.com", // 이메일 (string)
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

## 육아 포인트

**Base Path:** `/childcare`

### POST `childcare/accounts`

**요약:** 육아 계정 생성 (부모만 가능)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsInterestRate": 2 // 적금 이자율 (%) (number)
}
```

**Responses:**

#### 201 - 육아 계정 생성 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `childcare/accounts`

**요약:** 육아 계정 목록 조회

**Query Parameters:**

- `groupId` (`string`)

**Responses:**

#### 200 - 육아 계정 목록 조회 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `childcare/accounts/:id`

**요약:** 육아 계정 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 육아 계정 상세 조회 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### PATCH `childcare/accounts/:id`

**요약:** 육아 계정 설정 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "monthlyAllowance": 150, // 월별 용돈 포인트 (number?)
  "savingsInterestRate": 3 // 적금 이자율 (%) (number?)
}
```

**Responses:**

#### 200 - 육아 계정 수정 성공

```json
{
  "id": "uuid-1234", // 계정 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "childUserId": "uuid-1234", // 자녀 사용자 ID (string)
  "parentUserId": "uuid-1234", // 부모 사용자 ID (string)
  "balance": 500, // 현재 포인트 잔액 (number)
  "monthlyAllowance": 100, // 월별 용돈 포인트 (number)
  "savingsBalance": 200, // 적금 잔액 (number)
  "savingsInterestRate": "2.50", // 적금 이자율 (%) (string)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### POST `childcare/accounts/:id/transactions`

**요약:** 포인트 거래 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 50, // 포인트 금액 (number)
  "description": "심부름 완료" // 설명 (string)
}
```

**Responses:**

#### 201 - 거래 추가 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/accounts/:id/transactions`

**요약:** 거래 내역 조회

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `type` (`ChildcareTransactionType`) (Optional): 거래 유형 필터
- `month` (`string`) (Optional): 조회 월 (YYYY-MM)

**Responses:**

#### 200 - 거래 내역 조회 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### GET `childcare/accounts/:id/rewards`

**요약:** 보상 항목 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 보상 항목 목록 조회 성공

```json
{
  "id": "uuid-1234", // 보상 항목 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

---

### POST `childcare/accounts/:id/rewards`

**요약:** 보상 항목 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string?)
  "points": 10 // 포인트 비용 (number)
}
```

**Responses:**

#### 201 - 보상 항목 추가 성공

```json
{
  "id": "uuid-1234", // 보상 항목 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/rewards/:rewardId`

**요약:** 보상 항목 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `rewardId` (`string`)

**Request Body:**

```json
{
  "name": "TV 1시간 더보기", // 보상 이름 (string?)
  "description": "", // 보상 설명 (string?)
  "points": 20, // 포인트 비용 (number?)
  "isActive": true // 활성화 여부 (boolean?)
}
```

**Responses:**

#### 200 - 보상 항목 수정 성공

```json
{
  "id": "uuid-1234", // 보상 항목 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "TV 30분 더보기", // 보상 이름 (string)
  "description": "TV를 30분 추가로 볼 수 있어요", // 보상 설명 (string | null)
  "points": 10, // 포인트 비용 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 보상 항목을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### DELETE `childcare/accounts/:id/rewards/:rewardId`

**요약:** 보상 항목 삭제 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `rewardId` (`string`)

**Responses:**

#### 200 - 보상 항목 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 보상 항목을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### GET `childcare/accounts/:id/rules`

**요약:** 규칙 목록 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 규칙 목록 조회 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string | null)
  "penalty": 10, // 차감 포인트 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

---

### POST `childcare/accounts/:id/rules`

**요약:** 규칙 추가 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string?)
  "penalty": 10 // 차감 포인트 (number)
}
```

**Responses:**

#### 201 - 규칙 추가 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string | null)
  "penalty": 10, // 차감 포인트 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### PATCH `childcare/accounts/:id/rules/:ruleId`

**요약:** 규칙 수정 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `ruleId` (`string`)

**Request Body:**

```json
{
  "name": "숙제 안함", // 규칙 이름 (string?)
  "description": "", // 규칙 설명 (string?)
  "penalty": 20, // 차감 포인트 (number?)
  "isActive": true // 활성화 여부 (boolean?)
}
```

**Responses:**

#### 200 - 규칙 수정 성공

```json
{
  "id": "uuid-1234", // 규칙 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "name": "방 정리 안함", // 규칙 이름 (string)
  "description": "방을 정리하지 않으면 포인트가 차감됩니다", // 규칙 설명 (string | null)
  "penalty": 10, // 차감 포인트 (number)
  "isActive": true, // 활성화 여부 (boolean)
  "createdAt": "2026-03-01T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-03-01T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 규칙을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### DELETE `childcare/accounts/:id/rules/:ruleId`

**요약:** 규칙 삭제 (부모만 가능)

**Path Parameters:**

- `id` (`string`)
- `ruleId` (`string`)

**Responses:**

#### 200 - 규칙 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 규칙을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

---

### POST `childcare/accounts/:id/savings/deposit`

**요약:** 적금 입금 (자녀 또는 부모)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 50 // 입금 포인트 (number)
}
```

**Responses:**

#### 201 - 적금 입금 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 해당 계정에 접근할 권한이 없습니다

---

### POST `childcare/accounts/:id/savings/withdraw`

**요약:** 적금 출금 (부모만 가능)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 50 // 출금 포인트 (number)
}
```

**Responses:**

#### 201 - 적금 출금 성공

```json
{
  "id": "uuid-1234", // 거래 ID (string)
  "accountId": "uuid-1234", // 계정 ID (string)
  "type": null, // 거래 유형 (ChildcareTransactionType)
  "amount": 100, // 포인트 금액 (number)
  "description": "월 용돈 지급", // 설명 (string)
  "createdBy": "uuid-1234", // 생성자 ID (string)
  "createdAt": "2026-03-01T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 육아 계정을 찾을 수 없습니다

#### 403 - 부모만 수행할 수 있는 작업입니다

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

## 가계부

**Base Path:** `/household`

### POST `household/expenses`

**요약:** 지출 등록

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "amount": 15000, // 금액 (number)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27", // 지출 날짜 (YYYY-MM-DD) (string)
  "description": "점심 식사", // 내용 (string?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "isRecurring": false // 고정 지출 여부 (boolean?)
}
```

**Responses:**

#### 201 - 지출 등록 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/expenses`

**요약:** 지출 목록 조회

**Query Parameters:**

- `groupId` (`string`): 그룹 ID
- `month` (`string`) (Optional): 조회 월 (YYYY-MM)
- `category` (`ExpenseCategory`) (Optional): 카테고리 필터
- `paymentMethod` (`PaymentMethod`) (Optional): 결제 수단 필터

**Responses:**

#### 200 - 지출 목록 조회 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/expenses/:id`

**요약:** 지출 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 지출 상세 조회 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### PATCH `household/expenses/:id`

**요약:** 지출 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "amount": 15000, // 금액 (number?)
  "category": null, // 카테고리 (ExpenseCategory?)
  "date": "2026-02-27", // 지출 날짜 (YYYY-MM-DD) (string?)
  "description": "점심 식사", // 내용 (string?)
  "paymentMethod": null, // 결제 수단 (PaymentMethod?)
  "isRecurring": false // 고정 지출 여부 (boolean?)
}
```

**Responses:**

#### 200 - 지출 수정 성공

```json
{
  "id": "uuid-1234", // 지출 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "userId": "uuid-1234", // 작성자 ID (string)
  "amount": 15000, // 금액 (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
  "description": "점심 식사", // 내용 (string | null)
  "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
  "isRecurring": false, // 고정 지출 여부 (boolean)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 수정할 수 있습니다

---

### DELETE `household/expenses/:id`

**요약:** 지출 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 지출 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 삭제할 수 있습니다

---

### GET `household/expenses/:id/receipts/upload-url`

**요약:** 영수증 업로드 Presigned URL 발급

**설명:**
발급된 uploadUrl로 파일을 직접 업로드한 뒤, confirmReceipt API를 호출하세요.

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `query` (`ReceiptUploadQueryDto`)

**Responses:**

#### 200 - 업로드 URL 발급 성공

```json
{
  "uploadUrl": "", // Presigned 업로드 URL (string)
  "fileKey": "" // 파일 키 (업로드 완료 후 confirmReceipt에 사용) (string)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 수정할 수 있습니다

---

### POST `household/expenses/:id/receipts/confirm`

**요약:** 영수증 업로드 완료 확인 (DB 등록)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "fileKey": "receipts/uuid-1234.jpg", // 업로드된 파일 키 (getReceiptUploadUrl 응답의 fileKey) (string)
  "fileName": "receipt.jpg", // 원본 파일명 (string)
  "fileSize": 102400, // 파일 크기 (bytes) (number)
  "mimeType": "image/jpeg" // MIME 타입 (string)
}
```

**Responses:**

#### 201 - 영수증 등록 성공

```json
{
  "id": "uuid-1234", // 영수증 ID (string)
  "expenseId": "uuid-1234", // 지출 ID (string)
  "fileUrl": "https://cdn.example.com/receipts/xxx.jpg", // 파일 URL (string)
  "fileName": "receipt.jpg", // 파일명 (string)
  "fileSize": 102400, // 파일 크기 (bytes) (number)
  "mimeType": "image/jpeg", // MIME 타입 (string)
  "createdAt": "2026-02-27T00:00:00.000Z" // 생성 일시 (Date)
}
```

#### 404 - 지출 내역을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출만 수정할 수 있습니다

---

### DELETE `household/expenses/:id/receipts/:receiptId`

**요약:** 영수증 삭제

**Path Parameters:**

- `id` (`string`)
- `receiptId` (`string`)

**Responses:**

#### 200 - 영수증 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 영수증을 찾을 수 없습니다

#### 403 - 본인이 등록한 지출의 영수증만 삭제할 수 있습니다

---

### POST `household/expenses/recurring/copy`

**요약:** 고정비용 다음 달 복사

**설명:**
이전 달의 isRecurring=true 지출을 targetMonth로 복사합니다.

**Query Parameters:**

- `query` (`RecurringCopyQueryDto`)

**Responses:**

#### 201 - 고정비용 복사 성공

```json
{
  "count": 3, // 복사된 지출 건수 (number)
  "expenses": [
    {
      "id": "uuid-1234", // 지출 ID (string)
      "groupId": "uuid-1234", // 그룹 ID (string)
      "userId": "uuid-1234", // 작성자 ID (string)
      "amount": 15000, // 금액 (string)
      "category": null, // 카테고리 (ExpenseCategory)
      "date": "2026-02-27T00:00:00.000Z", // 지출 날짜 (Date)
      "description": "점심 식사", // 내용 (string | null)
      "paymentMethod": null, // 결제 수단 (PaymentMethod | null)
      "isRecurring": false, // 고정 지출 여부 (boolean)
      "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
      "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
    }
  ] // 복사된 지출 목록 (ExpenseDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/statistics`

**요약:** 월별 지출 통계 조회

**Query Parameters:**

- `query` (`StatisticsQueryDto`)

**Responses:**

#### 200 - 통계 조회 성공

```json
{
  "month": "2026-02", // 조회 월 (string)
  "totalExpense": "350000.00", // 총 지출 (string)
  "totalBudget": "500000.00", // 총 예산 (string)
  "categories": [
    {
      "category": null, // 카테고리 (ExpenseCategory)
      "total": "120000.00", // 총 지출 (string)
      "count": 8, // 지출 건수 (number)
      "budget": "300000.00", // 예산 (string | null)
      "budgetRatio": 40 // 예산 대비 지출 비율 (%) (number | null)
    }
  ] // 카테고리별 통계 (CategoryStatDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/statistics/yearly`

**요약:** 연별 지출 통계 조회 (월별 합계)

**Query Parameters:**

- `query` (`YearlyStatisticsQueryDto`)

**Responses:**

#### 200 - 연별 통계 조회 성공

```json
{
  "year": "2026", // 조회 연도 (string)
  "totalExpense": "4200000.00", // 연간 총 지출 (string)
  "months": [
    {
      "month": "2026-01", // 월 (YYYY-MM) (string)
      "total": "350000.00", // 총 지출 (string)
      "count": 15 // 지출 건수 (number)
    }
  ] // 월별 지출 목록 (MonthlyTotalDto[])
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### POST `household/budgets`

**요약:** 예산 설정 (없으면 생성, 있으면 수정)

**Request Body:**

```json
{
  "groupId": "uuid-1234", // 그룹 ID (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "amount": 300000, // 예산 금액 (number)
  "month": "2026-02" // 예산 월 (YYYY-MM) (string)
}
```

**Responses:**

#### 201 - 예산 설정 성공

```json
{
  "id": "uuid-1234", // 예산 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "amount": "300000.00", // 예산 금액 (string)
  "month": "2026-02-01T00:00:00.000Z", // 예산 월 (Date)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

### GET `household/budgets`

**요약:** 예산 목록 조회

**Query Parameters:**

- `query` (`BudgetQueryDto`)

**Responses:**

#### 200 - 예산 목록 조회 성공

```json
{
  "id": "uuid-1234", // 예산 ID (string)
  "groupId": "uuid-1234", // 그룹 ID (string)
  "category": null, // 카테고리 (ExpenseCategory)
  "amount": "300000.00", // 예산 금액 (string)
  "month": "2026-02-01T00:00:00.000Z", // 예산 월 (Date)
  "createdAt": "2026-02-27T00:00:00.000Z", // 생성 일시 (Date)
  "updatedAt": "2026-02-27T00:00:00.000Z" // 수정 일시 (Date)
}
```

#### 403 - 해당 그룹의 멤버가 아닙니다

---

## 투자지표

**Base Path:** `/indicators`

### GET `indicators`

**요약:** 전체 지표 목록 + 최신 시세

**Responses:**

#### 200 - 지표 목록 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

---

### GET `indicators/bookmarks`

**요약:** 즐겨찾기 목록 + 최신 시세

**Responses:**

#### 200 - 즐겨찾기 목록 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

---

### PATCH `indicators/bookmarks/reorder`

**요약:** 즐겨찾기 순서 변경

**설명:**
즐겨찾기된 symbol 배열을 원하는 순서대로 전달하면 해당 순서로 저장됩니다.

**Request Body:**

```json
{
  "symbols": ["KOSPI", "BTC", "GOLD_USD"] // 즐겨찾기 symbol 배열 (순서대로) (string[])
}
```

**Responses:**

#### 200 - 즐겨찾기 순서 변경 성공

---

### GET `indicators/:symbol`

**요약:** 지표 상세 + 최신 시세

**Path Parameters:**

- `symbol` (`string`)

**Responses:**

#### 200 - 지표 상세 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

#### 404 - 지표를 찾을 수 없음

---

### GET `indicators/:symbol/history`

**요약:** 지표 시세 히스토리 (시계열)

**Path Parameters:**

- `symbol` (`string`)

**Query Parameters:**

- `days` (`number`) (Optional): 조회 일수 (1~365)

**Responses:**

#### 200 - 히스토리 조회 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "nameKo": "코스피", // 한글명 (string)
  "history": [
    {
      "price": "2580.34", // 시세 (string)
      "recordedAt": "2025-01-01T00:00:00Z" // 수집 시각 (Date)
    }
  ], // 시계열 데이터 (IndicatorPricePointDto[])
  "spreadHistory": [
    {
      "spread": "3.21", // 이격률 (%) (string)
      "recordedAt": "2025-01-01T00:00:00Z" // 수집 시각 (Date)
    }
  ] // GOLD_KRW_SPOT 전용: 현물가 vs 환산가(GOLD_USD×USD_KRW÷31.1035) 이격률 시계열 (SpreadPointDto[]?)
}
```

#### 404 - 지표를 찾을 수 없음

---

### POST `indicators/:symbol/bookmark`

**요약:** 즐겨찾기 등록

**Path Parameters:**

- `symbol` (`string`)

**Responses:**

#### 201 - 즐겨찾기 등록 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

#### 404 - 지표를 찾을 수 없음

---

### DELETE `indicators/:symbol/bookmark`

**요약:** 즐겨찾기 해제

**Path Parameters:**

- `symbol` (`string`)

**Responses:**

#### 200 - 즐겨찾기 해제 성공

```json
{
  "symbol": "KOSPI", // 심볼 (string)
  "name": "KOSPI", // 영문명 (string)
  "nameKo": "코스피", // 한글명 (string)
  "category": null, // 카테고리 (IndicatorCategory)
  "unit": "pt", // 단위 (string)
  "price": "2580.34", // 현재 시세 (string | null)
  "prevPrice": "2550.12", // 전일 종가 (string | null)
  "change": "30.22", // 변동액 (string | null)
  "changeRate": "1.19", // 변동률 (%) (string | null)
  "recordedAt": "2025-01-01T00:00:00Z", // 수집 시각 (Date | null)
  "isBookmarked": false, // 즐겨찾기 여부 (boolean)
  "spread": "1.23" // GOLD_KRW_SPOT 전용: 국제 환산가 대비 이격률 (%). 양수 = 현물가가 환산가보다 높음 (프리미엄) (string | null)
}
```

#### 404 - 지표를 찾을 수 없음

---

### POST `indicators/admin/init-history`

**요약:** [어드민] 과거 데이터 일괄 초기화

**설명:**
배포 후 1회 실행. Yahoo/CoinGecko/BOK에서 지정 기간 과거 시세를 수집해 DB에 저장합니다.

**인증/권한:**

- AdminGuard

**Query Parameters:**

- `days` (`number`) (Optional): 수집할 과거 일수 (1~5000, 기본 3650). Yahoo/BOK만 적용되며 CoinGecko는 365일, GOLD_KRW_SPOT은 전체 기간 고정.

**Responses:**

#### 200 - 히스토리 초기화 완료

```json
{
  "yahoo": 5400, // 저장된 Yahoo 시세 건수 (number)
  "crypto": 365, // 저장된 BTC/KRW 건수 (number)
  "bond": 250, // 저장된 한국채 건수 (number)
  "goldSpot": 4000 // 저장된 국내 금 현물가 건수 (number)
}
```

---

## 메모

**Base Path:** `/memos`

### POST `memos`

**요약:** 메모 생성

**Request Body:**

```json
{
  "title": "회의 메모", // 메모 제목 (string)
  "content": "# 회의 내용
- 항목 1
- 항목 2", // 메모 본문 (string)
  "format": null, // 메모 형식 (MemoFormat?)
  "type": null, // 메모 타입 (NOTE: 일반, CHECKLIST: 체크리스트) (MemoType?)
  "category": "회의록", // 카테고리 (string?)
  "visibility": null, // 공개 범위 (MemoVisibility?)
  "groupId": "", // 그룹 ID (GROUP 공개 시 필수) (string?)
  "tags": [
    {
      "name": "중요", // 태그 이름 (string)
      "color": "#FF5733" // 태그 색상 (string?)
    }
  ] // 태그 목록 (CreateMemoTagDto[]?)
}
```

**Responses:**

#### 201 - 메모 생성 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "category": "회의록", // 카테고리 (string | null)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요", // 태그 이름 (string)
      "color": "#FF5733" // 태그 색상 (string | null)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `memos`

**요약:** 메모 목록 조회

**Query Parameters:**

- `page` (`number`) (Optional): 페이지 번호
- `limit` (`number`) (Optional): 페이지 크기
- `visibility` (`MemoVisibility`) (Optional): 공개 범위 필터
- `category` (`string`) (Optional): 카테고리 필터
- `tag` (`string`) (Optional): 태그 이름 필터
- `groupId` (`string`) (Optional): 그룹 ID 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)

**Responses:**

#### 200 - 메모 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid-1234", // 메모 ID (string)
      "title": "회의 메모", // 제목 (string)
      "content": "", // 본문 (string)
      "format": null, // 메모 형식 (MemoFormat)
      "type": null, // 메모 타입 (MemoType)
      "category": "회의록", // 카테고리 (string | null)
      "visibility": null, // 공개 범위 (MemoVisibility)
      "isPinned": false, // 핀 여부 (boolean)
      "groupId": null, // 그룹 ID (string | null)
      "user": {
        "id": "uuid-1234",
        "name": "홍길동"
      }, // 작성자 정보 (MemoAuthorDto)
      "tags": {
        "id": "uuid-1234",
        "name": "중요",
        "color": "#FF5733"
      }, // 태그 목록 (MemoTagDto[])
      "attachments": {
        "id": "uuid-1234",
        "fileName": "document.pdf",
        "fileUrl": "",
        "fileSize": 1024,
        "mimeType": "application/pdf",
        "createdAt": "2025-01-01T00:00:00Z"
      }, // 첨부파일 목록 (MemoAttachmentDto[])
      "checklistItems": {
        "id": "uuid-1234",
        "content": "여권 챙기기",
        "isChecked": false,
        "order": 0,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }, // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 메모 목록 (MemoDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `memos/pinned`

**요약:** 핀된 메모 목록 조회 (대시보드 위젯용)

**Responses:**

#### 200 - 핀된 메모 목록 조회 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "category": "회의록", // 카테고리 (string | null)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요", // 태그 이름 (string)
      "color": "#FF5733" // 태그 색상 (string | null)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `memos/:id`

**요약:** 메모 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 메모 상세 조회 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "category": "회의록", // 카테고리 (string | null)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요", // 태그 이름 (string)
      "color": "#FF5733" // 태그 색상 (string | null)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 메모에 접근할 권한이 없습니다

---

### PATCH `memos/:id`

**요약:** 메모 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 메모 수정 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "category": "회의록", // 카테고리 (string | null)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요", // 태그 이름 (string)
      "color": "#FF5733" // 태그 색상 (string | null)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id`

**요약:** 메모 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 메모 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 삭제할 수 있습니다

---

### POST `memos/:id/pin`

**요약:** 메모 핀 토글 (핀 ↔ 핀 해제)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 핀 토글 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "category": "회의록", // 카테고리 (string | null)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요", // 태그 이름 (string)
      "color": "#FF5733" // 태그 색상 (string | null)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 핀 설정할 수 있습니다

---

### POST `memos/:id/tags`

**요약:** 메모 태그 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "중요", // 태그 이름 (string)
  "color": "#FF5733" // 태그 색상 (string?)
}
```

**Responses:**

#### 201 - 태그 추가 성공

```json
{
  "id": "uuid-1234", // 태그 ID (string)
  "name": "중요", // 태그 이름 (string)
  "color": "#FF5733" // 태그 색상 (string | null)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id/tags/:tagId`

**요약:** 메모 태그 삭제

**Path Parameters:**

- `id` (`string`)
- `tagId` (`string`)

**Responses:**

#### 200 - 태그 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 태그를 찾을 수 없습니다

---

### POST `memos/:id/attachments`

**요약:** 메모 첨부파일 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "fileName": "document.pdf", // 파일 이름 (string)
  "fileUrl": "", // 파일 URL (string)
  "fileSize": 1024, // 파일 크기 (bytes) (number)
  "mimeType": "application/pdf" // MIME 타입 (string)
}
```

**Responses:**

#### 201 - 첨부파일 추가 성공

```json
{
  "id": "uuid-1234", // 첨부파일 ID (string)
  "fileName": "document.pdf", // 파일 이름 (string)
  "fileUrl": "", // 파일 URL (string)
  "fileSize": 1024, // 파일 크기 (bytes) (number)
  "mimeType": "application/pdf", // MIME 타입 (string)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id/attachments/:attachmentId`

**요약:** 메모 첨부파일 삭제

**Path Parameters:**

- `id` (`string`)
- `attachmentId` (`string`)

**Responses:**

#### 200 - 첨부파일 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 첨부파일을 찾을 수 없습니다

---

### POST `memos/:id/checklist`

**요약:** 체크리스트 항목 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "content": "여권 챙기기", // 항목 내용 (string)
  "order": 0 // 정렬 순서 (number?)
}
```

**Responses:**

#### 201 - 항목 추가 성공

```json
{
  "id": "uuid-1234", // 항목 ID (string)
  "content": "여권 챙기기", // 항목 내용 (string)
  "isChecked": false, // 체크 여부 (boolean)
  "order": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### PATCH `memos/:id/checklist/:itemId`

**요약:** 체크리스트 항목 수정 (내용/순서)

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Request Body:**

```json
{
  "content": "여권 챙기기", // 항목 내용 (string?)
  "order": 1 // 정렬 순서 (number?)
}
```

**Responses:**

#### 200 - 항목 수정 성공

```json
{
  "id": "uuid-1234", // 항목 ID (string)
  "content": "여권 챙기기", // 항목 내용 (string)
  "isChecked": false, // 체크 여부 (boolean)
  "order": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 항목을 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id/checklist/:itemId`

**요약:** 체크리스트 항목 삭제

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Responses:**

#### 200 - 항목 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 항목을 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### POST `memos/:id/checklist/:itemId/toggle`

**요약:** 체크리스트 항목 체크/해제 토글

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Responses:**

#### 200 - 토글 성공

```json
{
  "id": "uuid-1234", // 항목 ID (string)
  "content": "여권 챙기기", // 항목 내용 (string)
  "isChecked": false, // 체크 여부 (boolean)
  "order": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 항목을 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### POST `memos/:id/checklist/reset`

**요약:** 체크리스트 전체 체크 해제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 전체 체크 해제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

## 알림

**Base Path:** `/notifications`

### POST `notifications/token`

**요약:** FCM 디바이스 토큰 등록

**Request Body:**

```json
{
  "token": "fGw3ZJ0kRZe-Xz9YlK6J7M:APA91bH4...(생략)...k5L8mN9oP0qR1sT2u", // FCM 디바이스 토큰 (string)
  "platform": null // 디바이스 플랫폼 (DevicePlatform)
}
```

**Responses:**

#### 201 - FCM 토큰 등록 성공

```json
{
  "id": "uuid", // 토큰 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "token": "dXNlci1kZXZpY2UtdG9rZW4tZXhhbXBsZQ", // FCM 디바이스 토큰 (string)
  "platform": null, // 플랫폼 (DevicePlatform)
  "lastUsed": "2025-12-27T00:00:00Z" // 마지막 사용 시간 (Date)
}
```

---

### DELETE `notifications/token/:token`

**요약:** FCM 디바이스 토큰 삭제

**Path Parameters:**

- `token` (`string`)

**Responses:**

#### 200 - FCM 토큰 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 토큰을 찾을 수 없음

---

### GET `notifications/settings`

**요약:** 알림 설정 조회

**Responses:**

#### 200 - 알림 설정 목록 반환

```json
{
  "id": "uuid", // 설정 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

---

### PUT `notifications/settings`

**요약:** 알림 설정 업데이트

**Request Body:**

```json
{
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

**Responses:**

#### 200 - 알림 설정 업데이트 성공

```json
{
  "id": "uuid", // 설정 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "enabled": true // 알림 활성화 여부 (boolean)
}
```

---

### GET `notifications`

**요약:** 알림 목록 조회 (페이지네이션)

**Query Parameters:**

- `unreadOnly` (`boolean`) (Optional): 읽지 않은 알림만 조회 (true인 경우)
- `page` (`number`) (Optional): 페이지 번호 (1부터 시작)
- `limit` (`number`) (Optional): 페이지당 항목 수

**Responses:**

#### 200 - 알림 목록 및 페이지네이션 정보 반환

```json
{
  "data": [
    {
      "id": "uuid", // 알림 ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "category": null, // 알림 카테고리 (NotificationCategory)
      "title": "새로운 일정 알림", // 알림 제목 (string)
      "body": "내일 오후 3시에 회의가 예정되어 있습니다.", // 알림 내용 (string)
      "data": { "scheduleId": "uuid", "action": "view_schedule" }, // 추가 데이터 (JSON) (any)
      "isRead": false, // 읽음 여부 (boolean)
      "sentAt": "2025-12-27T00:00:00Z", // 발송 시간 (Date)
      "readAt": "2025-12-27T00:30:00Z" // 읽은 시간 (Date | null)
    }
  ], // NotificationDto[]
  "meta": {
    "page": 1, // 현재 페이지 (number)
    "limit": 20, // 페이지당 항목 수 (number)
    "total": 42, // 전체 항목 수 (number)
    "totalPages": 3 // 전체 페이지 수 (number)
  } // PaginationMetaDto
}
```

---

### GET `notifications/unread-count`

**요약:** 읽지 않은 알림 개수 조회

**Responses:**

#### 200 - 읽지 않은 알림 개수 반환

```json
{
  "count": 5 // 읽지 않은 알림 개수 (number)
}
```

---

### PUT `notifications/read-all`

**요약:** 전체 알림 읽음 처리

**Responses:**

#### 200 - 전체 알림 읽음 처리 성공

```json
{
  "count": 10 // 읽음 처리된 알림 개수 (number)
}
```

---

### PUT `notifications/:id/read`

**요약:** 알림 읽음 처리

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림 읽음 처리 성공

```json
{
  "id": "uuid", // 알림 ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "title": "새로운 일정 알림", // 알림 제목 (string)
  "body": "내일 오후 3시에 회의가 예정되어 있습니다.", // 알림 내용 (string)
  "data": { "scheduleId": "uuid", "action": "view_schedule" }, // 추가 데이터 (JSON) (any)
  "isRead": false, // 읽음 여부 (boolean)
  "sentAt": "2025-12-27T00:00:00Z", // 발송 시간 (Date)
  "readAt": "2025-12-27T00:30:00Z" // 읽은 시간 (Date | null)
}
```

#### 404 - 알림을 찾을 수 없음

---

### DELETE `notifications/:id`

**요약:** 알림 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 알림 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 알림을 찾을 수 없음

---

### POST `notifications/test`

**요약:** 테스트 알림 전송 (운영자 전용)

**인증/권한:**

- AdminGuard

**Responses:**

#### 200 - 테스트 알림 전송 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 403 - 운영자 권한 필요

---

### POST `notifications/schedule`

**요약:** 예약 알림 전송 (특정 시간에 발송)

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000", // 알림 받을 사용자 ID (string)
  "category": null, // 알림 카테고리 (NotificationCategory)
  "title": "할 일 알림", // 알림 제목 (string)
  "body": "30분 후 회의 시작", // 알림 내용 (string)
  "scheduledTime": "2026-01-11T15:30:00Z", // 발송 예정 시간 (ISO 8601 형식) (string)
  "data": { "taskId": "123", "action": "view_task" } // 추가 데이터 (화면 이동용 payload 등) (Record<string, any>?)
}
```

**Responses:**

#### 201 - 예약 알림 등록 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

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

## Q&A (ADMIN)

**Base Path:** `/qna/admin`

### GET `qna/admin/questions`

**요약:** 모든 질문 목록 조회 (ADMIN 전용)

**설명:**
통합 API (/qna/questions?filter=all) 사용 권장. 이 엔드포인트는 하위 호환성을 위해 유지됩니다.

**Query Parameters:**

- `page` (`number`): 페이지 번호
- `limit` (`number`): 페이지 크기
- `status` (`QuestionStatus`) (Optional): 상태 필터 (PENDING, ANSWERED, RESOLVED)
- `category` (`QuestionCategory`) (Optional): 카테고리 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)
- `filter` (`'public' | 'my' | 'all'`) (Optional): 질문 필터 (public: 공개 질문만, my: 내 질문만, all: 모든 질문 - ADMIN 전용)

**Responses:**

#### 200 - 질문 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // 질문 ID (string)
      "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
      "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데...", // 내용 (미리보기 100자) (string)
      "category": null, // 카테고리 (QuestionCategory)
      "status": null, // 질문 상태 (QuestionStatus)
      "visibility": null, // 공개 여부 (QuestionVisibility)
      "answerCount": 1, // 답변 수 (number)
      "user": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 질문 목록 (QuestionListDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `qna/admin/statistics`

**요약:** 통계 조회 (ADMIN 전용)

**Responses:**

#### 200 - 통계 조회 성공

```json
{
  "totalQuestions": 150, // 전체 질문 수 (number)
  "pendingQuestions": 10, // 답변 대기 중 질문 수 (number)
  "answeredQuestions": 130, // 답변 완료 질문 수 (number)
  "resolvedQuestions": 120 // 해결 완료 질문 수 (number)
}
```

---

### POST `qna/admin/questions/:questionId/answers`

**요약:** 답변 작성 (ADMIN 전용)

**Path Parameters:**

- `questionId` (`string`)

**Request Body:**

```json
{
  "content": "해당 문제는 최신 버전에서 수정되었습니다. 앱을 업데이트 해주세요.", // 답변 내용 (string)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ] // 첨부파일 목록 (AttachmentDto[]?)
}
```

**Responses:**

#### 201 - 답변 작성 성공

```json
{
  "id": "uuid", // 답변 ID (string)
  "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
  "adminId": "uuid", // 작성자 ID (string)
  "admin": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 질문을 찾을 수 없습니다

---

### PUT `qna/admin/questions/:questionId/answers/:id`

**요약:** 답변 수정 (ADMIN 전용)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "content": "", // 답변 내용 (string?)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ] // 첨부파일 목록 (AttachmentDto[]?)
}
```

**Responses:**

#### 200 - 답변 수정 성공

```json
{
  "id": "uuid", // 답변 ID (string)
  "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
  "adminId": "uuid", // 작성자 ID (string)
  "admin": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 답변을 찾을 수 없습니다

---

### DELETE `qna/admin/questions/:questionId/answers/:id`

**요약:** 답변 삭제 (ADMIN 전용)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 답변 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 답변을 찾을 수 없습니다

---

## Q&A

**Base Path:** `/qna`

### GET `qna/questions`

**요약:** 질문 목록 조회 (통합)

**설명:**
filter 파라미터로 조회 범위 설정: public(공개 질문), my(내 질문), all(모든 질문-ADMIN 전용)

**Query Parameters:**

- `page` (`number`): 페이지 번호
- `limit` (`number`): 페이지 크기
- `status` (`QuestionStatus`) (Optional): 상태 필터 (PENDING, ANSWERED, RESOLVED)
- `category` (`QuestionCategory`) (Optional): 카테고리 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)
- `filter` (`'public' | 'my' | 'all'`) (Optional): 질문 필터 (public: 공개 질문만, my: 내 질문만, all: 모든 질문 - ADMIN 전용)

**Responses:**

#### 200 - 질문 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // 질문 ID (string)
      "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
      "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데...", // 내용 (미리보기 100자) (string)
      "category": null, // 카테고리 (QuestionCategory)
      "status": null, // 질문 상태 (QuestionStatus)
      "visibility": null, // 공개 여부 (QuestionVisibility)
      "answerCount": 1, // 답변 수 (number)
      "user": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 질문 목록 (QuestionListDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `qna/questions/:id`

**요약:** 질문 상세 조회

**인증/권한:**

- QuestionVisibilityGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 상세 조회 성공

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 질문을 찾을 수 없습니다

---

### POST `qna/questions`

**요약:** 질문 작성

**Request Body:**

```json
{
  "title": "앱이 자꾸 종료돼요", // 질문 제목 (string)
  "content": "홈 화면에서 특정 버튼을 누르면 앱이 종료됩니다.", // 질문 내용 (string)
  "category": null, // 질문 카테고리 (QuestionCategory)
  "visibility": null, // 공개 여부 (PUBLIC: 모든 사용자 조회 가능, PRIVATE: 본인/ADMIN만 조회 가능) (QuestionVisibility?)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ] // 첨부파일 목록 (AttachmentDto[]?)
}
```

**Responses:**

#### 201 - 질문 작성 성공

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `qna/questions/:id`

**요약:** 질문 수정 (본인만)

**설명:**
PENDING: 일반 수정, ANSWERED: 수정 시 PENDING으로 변경 (재질문), RESOLVED: 수정 불가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "title": "", // 질문 제목 (string?)
  "content": "", // 질문 내용 (string?)
  "category": null, // 질문 카테고리 (QuestionCategory?)
  "visibility": null, // 공개 여부 (QuestionVisibility?)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ] // 첨부파일 목록 (AttachmentDto[]?)
}
```

**Responses:**

#### 200 - 질문 수정 성공

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 질문을 찾을 수 없습니다

---

### POST `qna/questions/:id/resolve`

**요약:** 질문 해결완료 처리 (본인만)

**설명:**
ANSWERED 상태의 질문을 RESOLVED로 변경

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 해결완료 처리 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 질문을 찾을 수 없습니다

---

### DELETE `qna/questions/:id`

**요약:** 질문 삭제 (본인만)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 질문을 찾을 수 없습니다

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

### POST `storage/editor-upload`

**요약:** 에디터 이미지 업로드

**Query Parameters:**

- `type` (`'qna' | 'announcements'`)

**Responses:**

#### 201 - 이미지 업로드 성공

```json
{
  "key": "qna/550e8400-e29b-41d4-a716-446655440000.jpg", // 파일 키 (R2 스토리지 경로) (string)
  "url": "https://files.example.com/qna/550e8400-e29b-41d4-a716-446655440000.jpg" // 파일 URL (string)
}
```

---

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

## 일정 및 할일

**Base Path:** `/tasks`

### GET `tasks/categories`

**요약:** 카테고리 목록 조회

**Query Parameters:**

- `groupId` (`string`) - Optional

**Responses:**

#### 200 - 카테고리 목록 조회 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string | null)
  "emoji": "💼", // 이모지 (string | null)
  "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### POST `tasks/categories`

**요약:** 카테고리 생성

**Request Body:**

```json
{
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string?)
  "emoji": "💼", // 이모지 (string?)
  "color": "#3B82F6", // 색상 코드 (HEX) (string?)
  "groupId": "uuid" // 그룹 ID (그룹 카테고리 생성 시) (string?)
}
```

**Responses:**

#### 201 - 카테고리 생성 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string | null)
  "emoji": "💼", // 이모지 (string | null)
  "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `tasks/categories/:id`

**요약:** 카테고리 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "업무", // 카테고리 이름 (string?)
  "description": "업무 관련 일정", // 설명 (string?)
  "emoji": "💼", // 이모지 (string?)
  "color": "#3B82F6" // 색상 코드 (HEX) (string?)
}
```

**Responses:**

#### 200 - 카테고리 수정 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "name": "업무", // 카테고리 이름 (string)
  "description": "업무 관련 일정", // 설명 (string | null)
  "emoji": "💼", // 이모지 (string | null)
  "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 카테고리를 찾을 수 없음

#### 403 - 본인 작성 카테고리만 수정 가능

---

### DELETE `tasks/categories/:id`

**요약:** 카테고리 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 카테고리 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 카테고리를 찾을 수 없음

#### 403 - 연결된 Task가 있으면 삭제 불가

---

### GET `tasks`

**요약:** Task 목록 조회 (캘린더/할일 뷰)

**Query Parameters:**

- `view` (`'calendar' | 'todo'`) (Optional): 뷰 타입
- `groupIds` (`string[]`) (Optional): 그룹 ID 목록 (콤마로 구분)
- `includePersonal` (`boolean`) (Optional): 개인 일정 포함 여부 (기본값: true)
- `categoryIds` (`string[]`) (Optional): 카테고리 ID 목록 (콤마로 구분)
- `type` (`TaskType`) (Optional): Task 타입
- `priority` (`TaskPriority`) (Optional): 우선순위
- `status` (`TaskStatus`) (Optional): Task 상태
- `search` (`string`) (Optional): 검색어 (제목, 설명, 장소)
- `startDate` (`string`) (Optional): 시작 날짜
- `endDate` (`string`) (Optional): 종료 날짜
- `page` (`number`) (Optional): 페이지
- `limit` (`number`) (Optional): 페이지 크기

**Responses:**

#### 200 - Task 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "groupId": "uuid", // 그룹 ID (string | null)
      "title": "회의 참석", // 제목 (string)
      "description": "분기 결산 회의", // 설명 (string | null)
      "location": null, // 장소 (string | null)
      "type": null, // Task 타입 (TaskType)
      "priority": null, // 우선순위 (TaskPriority)
      "category": {
        "id": "uuid",
        "userId": "uuid",
        "groupId": "uuid",
        "name": "업무",
        "description": "업무 관련 일정",
        "emoji": "💼",
        "color": "#3B82F6",
        "createdAt": "2025-12-30T00:00:00Z",
        "updatedAt": "2025-12-30T00:00:00Z"
      }, // 카테고리 (CategoryDto)
      "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
      "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
      "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
      "status": "PENDING", // Task 상태 (TaskStatus)
      "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
      "recurring": {
        "id": "uuid",
        "ruleType": "WEEKLY",
        "ruleConfig": {
          "interval": 1,
          "endType": "NEVER",
          "daysOfWeek": [1, 3, 5]
        },
        "generationType": "AUTO_SCHEDULER",
        "isActive": true,
        "lastGeneratedAt": "2025-01-01T00:00:00Z"
      }, // 반복 정보 (RecurringDto | null)
      "participants": {
        "id": "uuid",
        "taskId": "uuid",
        "userId": "uuid",
        "user": "<ParticipantUserDto>",
        "createdAt": "2025-01-01T00:00:00Z"
      }, // 참여자 목록 (TaskParticipantDto[]?)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // TaskDto[]
  "meta": {
    "page": 1, // 현재 페이지 (number)
    "limit": 20, // 페이지당 항목 수 (number)
    "total": 42, // 전체 항목 수 (number)
    "totalPages": 3 // 전체 페이지 수 (number)
  } // PaginationMetaDto
}
```

---

### GET `tasks/:id`

**요약:** Task 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - Task 상세 조회 성공

```json
{
  "reminders": [
    {
      "id": "uuid", // ID (string)
      "reminderType": "BEFORE_START", // 알림 타입 (string)
      "offsetMinutes": 0, // 오프셋 (분) (number)
      "sentAt": "2025-01-01T00:00:00Z" // 발송 시간 (Date | null)
    }
  ], // 알림 목록 (TaskReminderResponseDto[])
  "histories": [
    {
      "id": "uuid", // ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "action": null, // 변경 유형 (TaskHistoryAction)
      "changes": null, // 변경 내용 (any | null)
      "createdAt": "2025-01-01T00:00:00Z" // 변경 시간 (Date)
    }
  ] // 변경 이력 (TaskHistoryDto[])
}
```

#### 404 - Task를 찾을 수 없음

#### 403 - 그룹 Task는 그룹 멤버만 조회 가능

---

### POST `tasks`

**요약:** Task 생성

**Request Body:**

```json
{
  "title": "회의 참석", // Task 제목 (string)
  "description": "분기 결산 회의", // 상세 설명 (string?)
  "location": "본사 2층 회의실", // 장소 (string?)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority?)
  "categoryId": "uuid", // 카테고리 ID (string)
  "groupId": "uuid", // 그룹 ID (그룹 Task 생성 시) (string?)
  "scheduledAt": "2025-12-30T09:00:00Z", // 수행 시작 날짜 (Date?)
  "dueAt": "2025-12-30T18:00:00Z", // 마감 날짜 (Date?)
  "recurring": {
    "ruleType": null, // 반복 타입 (RecurringRuleType)
    "ruleConfig": {
      "interval": 1,
      "endType": "NEVER",
      "daysOfWeek": [1, 3, 5]
    }, // 반복 설정 (RuleConfigDto)
    "generationType": null // 생성 방식 (RecurringGenerationType)
  }, // 반복 규칙 (RecurringRuleDto?)
  "reminders": [
    {
      "reminderType": null, // 알림 타입 (TaskReminderType)
      "offsetMinutes": 0 // 오프셋 (분, 음수 가능) (number)
    }
  ], // 알림 목록 (TaskReminderDto[]?)
  "participantIds": ["uuid-1", "uuid-2"] // 참여자 ID 목록 (그룹 Task에서만 사용 가능) (string[]?)
}
```

**Responses:**

#### 201 - Task 생성 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "title": "회의 참석", // 제목 (string)
  "description": "분기 결산 회의", // 설명 (string | null)
  "location": null, // 장소 (string | null)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority)
  "category": {
    "id": "uuid", // ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "groupId": "uuid", // 그룹 ID (string | null)
    "name": "업무", // 카테고리 이름 (string)
    "description": "업무 관련 일정", // 설명 (string | null)
    "emoji": "💼", // 이모지 (string | null)
    "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
    "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
  }, // 카테고리 (CategoryDto)
  "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
  "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
  "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
  "status": "PENDING", // Task 상태 (TaskStatus)
  "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
  "recurring": {
    "id": "uuid", // ID (string)
    "ruleType": "WEEKLY", // 반복 타입 (string)
    "ruleConfig": {
      "interval": 1,
      "endType": "NEVER",
      "daysOfWeek": [1, 3, 5]
    }, // 반복 설정 (Record<string, any>)
    "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
    "isActive": true, // 활성화 여부 (boolean)
    "lastGeneratedAt": "2025-01-01T00:00:00Z" // 마지막 생성 날짜 (Date | null)
  }, // 반복 정보 (RecurringDto | null)
  "participants": [
    {
      "id": "uuid", // 참여자 ID (string)
      "taskId": "uuid", // Task ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "user": {
        "id": "uuid",
        "name": "홍길동",
        "profileImageKey": "profile/uuid.jpg"
      }, // 참여자 정보 (ParticipantUserDto)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 참여자 목록 (TaskParticipantDto[]?)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `tasks/:id`

**요약:** Task 수정

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `updateScope` (`'current' | 'future'`) - Optional

**Request Body:**

```json
{
  "title": "회의 참석", // Task 제목 (string?)
  "description": "분기 결산 회의", // 상세 설명 (string?)
  "location": "본사 2층 회의실", // 장소 (string?)
  "type": null, // Task 타입 (TaskType?)
  "priority": null, // 우선순위 (TaskPriority?)
  "scheduledAt": "2025-12-30T09:00:00Z", // 수행 시작 날짜 (Date?)
  "dueAt": "2025-12-30T18:00:00Z", // 마감 날짜 (Date?)
  "participantIds": ["uuid-1", "uuid-2"] // 참여자 ID 목록 (그룹 Task에서만 사용 가능) (string[]?)
}
```

**Responses:**

#### 200 - Task 수정 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "title": "회의 참석", // 제목 (string)
  "description": "분기 결산 회의", // 설명 (string | null)
  "location": null, // 장소 (string | null)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority)
  "category": {
    "id": "uuid", // ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "groupId": "uuid", // 그룹 ID (string | null)
    "name": "업무", // 카테고리 이름 (string)
    "description": "업무 관련 일정", // 설명 (string | null)
    "emoji": "💼", // 이모지 (string | null)
    "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
    "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
  }, // 카테고리 (CategoryDto)
  "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
  "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
  "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
  "status": "PENDING", // Task 상태 (TaskStatus)
  "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
  "recurring": {
    "id": "uuid", // ID (string)
    "ruleType": "WEEKLY", // 반복 타입 (string)
    "ruleConfig": {
      "interval": 1,
      "endType": "NEVER",
      "daysOfWeek": [1, 3, 5]
    }, // 반복 설정 (Record<string, any>)
    "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
    "isActive": true, // 활성화 여부 (boolean)
    "lastGeneratedAt": "2025-01-01T00:00:00Z" // 마지막 생성 날짜 (Date | null)
  }, // 반복 정보 (RecurringDto | null)
  "participants": [
    {
      "id": "uuid", // 참여자 ID (string)
      "taskId": "uuid", // Task ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "user": {
        "id": "uuid",
        "name": "홍길동",
        "profileImageKey": "profile/uuid.jpg"
      }, // 참여자 정보 (ParticipantUserDto)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 참여자 목록 (TaskParticipantDto[]?)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - Task를 찾을 수 없음

#### 403 - 본인 작성 Task만 수정 가능

---

### PATCH `tasks/:id/status`

**요약:** Task 상태 변경

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "status": "COMPLETED" // Task 상태 (TaskStatus)
}
```

**Responses:**

#### 200 - Task 상태 변경 성공

```json
{
  "id": "uuid", // ID (string)
  "userId": "uuid", // 사용자 ID (string)
  "groupId": "uuid", // 그룹 ID (string | null)
  "title": "회의 참석", // 제목 (string)
  "description": "분기 결산 회의", // 설명 (string | null)
  "location": null, // 장소 (string | null)
  "type": null, // Task 타입 (TaskType)
  "priority": null, // 우선순위 (TaskPriority)
  "category": {
    "id": "uuid", // ID (string)
    "userId": "uuid", // 사용자 ID (string)
    "groupId": "uuid", // 그룹 ID (string | null)
    "name": "업무", // 카테고리 이름 (string)
    "description": "업무 관련 일정", // 설명 (string | null)
    "emoji": "💼", // 이모지 (string | null)
    "color": "#3B82F6", // 색상 코드 (HEX) (string | null)
    "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
    "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
  }, // 카테고리 (CategoryDto)
  "scheduledAt": "2025-01-01T00:00:00Z", // 수행 시작 날짜 (Date | null)
  "dueAt": "2025-01-01T00:00:00Z", // 마감 날짜 (Date | null)
  "daysUntilDue": 3, // D-Day (남은 일수) (number | null)
  "status": "PENDING", // Task 상태 (TaskStatus)
  "completedAt": "2025-01-01T00:00:00Z", // 완료 시간 (Date | null)
  "recurring": {
    "id": "uuid", // ID (string)
    "ruleType": "WEEKLY", // 반복 타입 (string)
    "ruleConfig": {
      "interval": 1,
      "endType": "NEVER",
      "daysOfWeek": [1, 3, 5]
    }, // 반복 설정 (Record<string, any>)
    "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
    "isActive": true, // 활성화 여부 (boolean)
    "lastGeneratedAt": "2025-01-01T00:00:00Z" // 마지막 생성 날짜 (Date | null)
  }, // 반복 정보 (RecurringDto | null)
  "participants": [
    {
      "id": "uuid", // 참여자 ID (string)
      "taskId": "uuid", // Task ID (string)
      "userId": "uuid", // 사용자 ID (string)
      "user": {
        "id": "uuid",
        "name": "홍길동",
        "profileImageKey": "profile/uuid.jpg"
      }, // 참여자 정보 (ParticipantUserDto)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 참여자 목록 (TaskParticipantDto[]?)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - Task를 찾을 수 없음

---

### DELETE `tasks/:id`

**요약:** Task 삭제

**Path Parameters:**

- `id` (`string`)

**Query Parameters:**

- `deleteScope` (`'current' | 'future' | 'all'`) - Optional

**Responses:**

#### 200 - Task 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - Task를 찾을 수 없음

#### 403 - 본인 작성 Task만 삭제 가능

---

### PATCH `tasks/recurrings/:id/pause`

**요약:** 반복 일정 일시정지/재개

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 반복 일정 상태 변경 성공

```json
{
  "id": "uuid", // ID (string)
  "ruleType": "WEEKLY", // 반복 타입 (string)
  "ruleConfig": { "interval": 1, "endType": "NEVER", "daysOfWeek": [1, 3, 5] }, // 반복 설정 (Record<string, any>)
  "generationType": "AUTO_SCHEDULER", // 생성 방식 (string)
  "isActive": true, // 활성화 여부 (boolean)
  "lastGeneratedAt": "2025-01-01T00:00:00Z" // 마지막 생성 날짜 (Date | null)
}
```

#### 404 - 반복 규칙을 찾을 수 없음

#### 403 - 본인 작성 반복 규칙만 변경 가능

---

### POST `tasks/recurrings/:id/skip`

**요약:** 반복 일정 건너뛰기

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "skipDate": "2025-12-30", // 건너뛸 날짜 (string)
  "reason": "공휴일" // 건너뛰는 이유 (string?)
}
```

**Responses:**

#### 201 - 반복 일정 건너뛰기 성공

```json
{
  "id": "uuid", // ID (string)
  "recurringId": "uuid", // 반복 규칙 ID (string)
  "skipDate": "2025-12-30", // 건너뛸 날짜 (Date)
  "reason": null, // 건너뛰는 이유 (string | null)
  "createdBy": "uuid", // 생성자 ID (string)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
}
```

#### 404 - 반복 규칙을 찾을 수 없음

#### 403 - 본인 작성 반복 규칙만 건너뛰기 가능

---

## Webhook

**Base Path:** `/webhook`

### POST `webhook/sentry`

**요약:** Sentry Webhook 수신

**Responses:**

#### 200 - Webhook 처리 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

---
