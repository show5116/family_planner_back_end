# 01. 인증/인가 (Authentication & Authorization)

> **상태**: ✅ 완료 (소셜 로그인 일부 진행 중)
> **우선순위**: High
> **담당 Phase**: Phase 1

---

## 📋 개요

사용자 인증 및 권한 관리를 위한 시스템입니다. LOCAL 로그인, 소셜 로그인, JWT 기반 인증을 지원합니다.

---

## ✅ LOCAL 인증 (이메일/비밀번호)

### 회원가입 (`POST /auth/signup`)

- ✅ 이메일, 비밀번호(최소 6자), 이름 입력
- ✅ 이메일 중복 체크
- ✅ bcrypt로 비밀번호 해싱 (salt rounds: 10)
- ✅ 이메일 인증 토큰 생성 (24시간 유효, crypto.randomBytes 32bytes)
- ✅ AWS SES를 통한 인증 이메일 자동 발송
- ✅ 응답: 사용자 정보 (id, email, name, createdAt, isEmailVerified)

**관련 파일**:

- [src/auth/auth.controller.ts](../../src/auth/auth.controller.ts#L30-L40)
- [src/auth/auth.service.ts](../../src/auth/auth.service.ts#L50-L120)

---

### 이메일 인증 시스템

#### 이메일 인증 (`POST /auth/verify-email`)

- ✅ 토큰 유효성 검증
- ✅ 만료 시간 확인 (24시간)
- ✅ 인증 완료 시 `isEmailVerified = true`

#### 인증 이메일 재전송 (`POST /auth/resend-verification`)

- ✅ 새로운 토큰 생성 및 이메일 재발송
- ✅ 소셜 로그인 사용자는 제외

**관련 파일**:

- [src/auth/auth.service.ts](../../src/auth/auth.service.ts#L150-L250)

---

### 로그인 (`POST /auth/login`)

- ✅ 이메일/비밀번호 검증
- ✅ 이메일 인증 완료 여부 확인 (LOCAL 로그인만)
- ✅ JWT Access Token (15분) + Refresh Token (7일) 발급
- ✅ Refresh Token은 DB에 저장 (`refresh_tokens` 테이블)
- ✅ 응답: accessToken, refreshToken, 사용자 정보

**환경 변수**:

```env
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

**관련 파일**:

- [src/auth/auth.controller.ts](../../src/auth/auth.controller.ts#L45-L55)
- [src/auth/auth.service.ts](../../src/auth/auth.service.ts#L280-L350)

---

### RTR (Refresh Token Rotation) 방식

#### 토큰 갱신 (`POST /auth/refresh`)

- ✅ Refresh Token 유효성 검증 (DB 조회)
- ✅ 만료 및 무효화 여부 확인
- ✅ 기존 Refresh Token 자동 무효화 (`isRevoked = true`)
- ✅ 새로운 Access Token + Refresh Token 쌍 발급
- ✅ 새 Refresh Token DB 저장
- ✅ 다중 Refresh Token 지원 (여러 기기 로그인)
- ✅ Cascade 삭제 설정 (사용자 삭제 시 모든 토큰 삭제)

**보안 특징**:

- 토큰 재사용 방지
- 각 기기별 독립적인 세션 관리
- 토큰 탈취 시 자동 무효화

**관련 파일**:

- [src/auth/auth.service.ts](../../src/auth/auth.service.ts#L400-L480)

---

### 로그아웃 (`POST /auth/logout`)

- ✅ Refresh Token 무효화 (`isRevoked = true`)
- ✅ 특정 기기만 로그아웃 (해당 Refresh Token만 무효화)

---

### 인증 확인

#### 사용자 정보 조회 (`GET /auth/me`)

- ✅ JWT Guard로 보호
- ✅ Bearer Token 필요
- ✅ 응답: userId, email, name

#### JWT Strategy (passport-jwt)

- ✅ Bearer Token 추출
- ✅ Access Token 검증 (15분 만료)
- ✅ 사용자 존재 여부 확인

**관련 파일**:

- [src/auth/strategies/jwt.strategy.ts](../../src/auth/strategies/jwt.strategy.ts)
- [src/auth/guards/jwt-auth.guard.ts](../../src/auth/guards/jwt-auth.guard.ts)

---

### 비밀번호 찾기/재설정

#### 비밀번호 재설정 요청 (`POST /auth/request-password-reset`)

- ✅ 이메일 입력
- ✅ 6자리 인증 코드 생성 (1시간 유효)
- ✅ 이메일로 인증 코드 발송
- ✅ LOCAL 로그인 사용자만 가능

#### 비밀번호 재설정 (`POST /auth/reset-password`)

- ✅ 이메일, 인증 코드, 새 비밀번호 입력
- ✅ 인증 코드 유효성 검증 (1시간)
- ✅ 비밀번호 해싱 후 업데이트
- ✅ 인증 코드 삭제

**관련 파일**:

- [src/auth/auth.service.ts](../../src/auth/auth.service.ts#L500-L600)

---

## 🟨 소셜 로그인

### ✅ 구글 로그인 (OAuth 2.0)

- ✅ GoogleStrategy 구현 (passport-google-oauth20)
- ✅ `GET /auth/google` (로그인 시작)
- ✅ `GET /auth/google/callback` (콜백 처리)
- ✅ 자동 회원가입 및 로그인

**환경 변수**:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

**관련 파일**:

- [src/auth/strategies/google.strategy.ts](../../src/auth/strategies/google.strategy.ts)

---

### ✅ 카카오 로그인

- ✅ KakaoStrategy 구현 (passport-kakao)
- ✅ `GET /auth/kakao` (로그인 시작)
- ✅ `GET /auth/kakao/callback` (콜백 처리)
- ✅ 자동 회원가입 및 로그인

**환경 변수**:

```env
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CALLBACK_URL=http://localhost:3000/auth/kakao/callback
```

**관련 파일**:

- [src/auth/strategies/kakao.strategy.ts](../../src/auth/strategies/kakao.strategy.ts)

---

### ⬜ 애플 로그인

- ⬜ AppleStrategy 구현 예정

---

### ✅ 비밀번호 설정/변경

#### 비밀번호 설정 (`POST /auth/set-password`)

- ✅ 소셜 로그인 사용자가 비밀번호 설정
- ✅ JWT 인증 필요 (로그인 상태에서만 가능)
- ✅ 비밀번호 설정 후 이메일/비밀번호 로그인 가능

#### 비밀번호 변경 (`POST /auth/change-password`)

- ✅ 현재 비밀번호 확인 후 새 비밀번호로 변경
- ✅ JWT 인증 필요

**특징**:

- 소셜 로그인 사용자도 비밀번호 설정 가능
- provider와 관계없이 비밀번호가 있으면 로그인 허용
- 다중 로그인 방법 지원

**관련 파일**:

- [src/auth/auth.service.ts](../../src/auth/auth.service.ts#L650-L750)

---

## 🗄️ 데이터베이스 스키마

### User 테이블

```prisma
model User {
  id                        String    @id @default(uuid())
  email                     String    @unique
  name                      String
  profileImage              String?
  provider                  Provider  @default(LOCAL)
  providerId                String?
  password                  String?
  isEmailVerified           Boolean   @default(false)
  emailVerificationToken    String?
  emailVerificationExpires  DateTime?
  passwordResetToken        String?
  passwordResetExpires      DateTime?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  refreshTokens             RefreshToken[]
  groupMembers              GroupMember[]

  @@unique([provider, providerId])
}

enum Provider {
  GOOGLE
  KAKAO
  APPLE
  LOCAL
}
```

### RefreshToken 테이블

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**관련 파일**:

- [prisma/schema.prisma](../../prisma/schema.prisma)

---

## 🔐 보안 구현

- ✅ bcrypt 비밀번호 해싱 (salt rounds: 10)
- ✅ JWT Access Token (기본 15분)
- ✅ JWT Refresh Token (기본 7일)
- ✅ 토큰 만료시간 환경변수 설정 가능
- ✅ 이메일 인증 필수 (LOCAL 로그인)
- ✅ Refresh Token DB 관리 및 무효화 메커니즘
- ✅ RTR (Refresh Token Rotation) 방식
- ✅ CORS 설정
- ✅ Passport Strategy 기반 인증

---

## 📝 API 엔드포인트

| Method | Endpoint                       | 설명                 | Guard |
| ------ | ------------------------------ | -------------------- | ----- |
| POST   | `/auth/signup`                 | 회원가입             | -     |
| POST   | `/auth/verify-email`           | 이메일 인증          | -     |
| POST   | `/auth/resend-verification`    | 인증 이메일 재전송   | -     |
| POST   | `/auth/login`                  | 로그인               | -     |
| POST   | `/auth/refresh`                | 토큰 갱신            | -     |
| POST   | `/auth/logout`                 | 로그아웃             | JWT   |
| GET    | `/auth/me`                     | 사용자 정보 조회     | JWT   |
| POST   | `/auth/request-password-reset` | 비밀번호 재설정 요청 | -     |
| POST   | `/auth/reset-password`         | 비밀번호 재설정      | -     |
| POST   | `/auth/set-password`           | 비밀번호 설정        | JWT   |
| POST   | `/auth/change-password`        | 비밀번호 변경        | JWT   |
| GET    | `/auth/google`                 | 구글 로그인 시작     | -     |
| GET    | `/auth/google/callback`        | 구글 콜백            | -     |
| GET    | `/auth/kakao`                  | 카카오 로그인 시작   | -     |
| GET    | `/auth/kakao/callback`         | 카카오 콜백          | -     |

---

## 🧪 테스트

### 단위 테스트

- ⬜ AuthService 테스트
- ⬜ AuthController 테스트
- ⬜ JWT Strategy 테스트

### E2E 테스트

- ⬜ 회원가입 플로우
- ⬜ 로그인 플로우
- ⬜ 토큰 갱신 플로우
- ⬜ 소셜 로그인 플로우

---

## 📚 참고 자료

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport JWT](https://www.passportjs.org/packages/passport-jwt/)
- [OAuth 2.0](https://oauth.net/2/)

---

**Last Updated**: 2025-12-04
