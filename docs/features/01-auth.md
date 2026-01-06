# 01. 인증/인가 (Authentication & Authorization)

> **상태**: ✅ 완료 (소셜 로그인 일부 진행 중)
> **Phase**: Phase 1

---

## 개요

JWT 기반 인증 및 소셜 로그인(Google, Kakao)을 지원하는 시스템입니다.

---

## LOCAL 인증

### 회원가입 (`POST /auth/signup`)
- 이메일, 비밀번호(최소 6자), 이름 입력
- bcrypt 해싱 (salt rounds: 10)
- 이메일 인증 코드 생성 (6자리, 24시간 유효)
- Redis에 저장 (`email-verification:{email}`, TTL: 24시간)
- 이메일 자동 발송

### 이메일 인증
- **인증** (`POST /auth/verify-email`): Redis에서 코드 검증, TTL 자동 확인
- **재전송** (`POST /auth/resend-verification`): 새 코드 생성 및 이메일 재발송

### 로그인 (`POST /auth/login`)
- 이메일/비밀번호 검증
- 이메일 인증 완료 여부 확인
- JWT Access Token (15분) + Refresh Token (7일) 발급
- Refresh Token은 Redis 저장 (`refresh-token:{token}`, TTL: 7일)

### RTR (Refresh Token Rotation)
- **토큰 갱신** (`POST /auth/refresh`):
  - Refresh Token 유효성 검증 (Redis)
  - 기존 토큰 무효화 후 새 쌍 발급
  - 다중 디바이스 지원
  - TTL 기반 자동 만료

- **로그아웃** (`POST /auth/logout`):
  - Refresh Token 무효화 (Redis 삭제)
  - 특정 디바이스만 로그아웃

### 비밀번호 재설정
- **요청** (`POST /auth/request-password-reset`):
  - 6자리 코드 생성
  - Redis 저장 (`password-reset:{email}`, TTL: 1시간)
  - 이메일 발송

- **재설정** (`POST /auth/reset-password`):
  - Redis에서 코드 검증
  - 비밀번호 해싱 후 업데이트

---

## 소셜 로그인

### Google OAuth
- GoogleStrategy (passport-google-oauth20)
- `GET /auth/google`: 로그인 시작
- `GET /auth/google/callback`: 콜백 처리
- 자동 회원가입 및 로그인

환경 변수:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Kakao
- KakaoStrategy (passport-kakao)
- `GET /auth/kakao`: 로그인 시작
- `GET /auth/kakao/callback`: 콜백 처리

환경 변수:
```env
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CALLBACK_URL=http://localhost:3000/auth/kakao/callback
```

### 비밀번호 설정/변경
- **설정** (`POST /auth/set-password`): 소셜 로그인 사용자가 비밀번호 설정
- **변경** (`POST /auth/change-password`): 현재 비밀번호 확인 후 변경

---

## 데이터베이스

### User 테이블
```prisma
model User {
  id                        String    @id @default(uuid())
  email                     String    @unique
  name                      String
  profileImageKey           String?   @db.VarChar(255)
  phoneNumber               String?   @db.VarChar(20)
  provider                  Provider  @default(LOCAL)
  providerId                String?
  password                  String?
  isEmailVerified           Boolean   @default(false)
  isAdmin                   Boolean   @default(false)
  lastLoginAt               DateTime?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  @@unique([provider, providerId])
}

enum Provider {
  GOOGLE, KAKAO, APPLE, LOCAL
}
```

### Redis 저장소
**Refresh Token**:
```
키: refresh-token:{refreshToken}
값: userId
TTL: 7일
```

**이메일 인증 코드**:
```
키: email-verification:{email}
값: 6자리 코드
TTL: 24시간
```

**비밀번호 재설정 코드**:
```
키: password-reset:{email}
값: 6자리 코드
TTL: 1시간
```

**장점**:
- DB 부하 감소 (읽기/쓰기 성능 향상)
- TTL 기반 자동 만료 (만료 체크 로직 불필요)
- 빠른 토큰/코드 검증 (메모리 기반)
- 확장성 (Redis 클러스터링)

---

## 구현 상태

### ✅ 완료
- [x] 회원가입 (이메일/비밀번호)
- [x] 이메일 인증 시스템 (Redis 기반)
- [x] 이메일 인증 코드 재전송
- [x] 로그인 (JWT Access/Refresh Token)
- [x] RTR (Refresh Token Rotation)
- [x] 로그아웃 (Refresh Token 무효화)
- [x] 비밀번호 재설정 (이메일 인증)
- [x] Google OAuth 로그인
- [x] Kakao OAuth 로그인
- [x] 소셜 로그인 사용자 비밀번호 설정
- [x] 비밀번호 변경
- [x] 사용자 정보 조회 (GET /auth/me)
- [x] Redis 기반 토큰 관리 (TTL 자동 만료)
- [x] bcrypt 비밀번호 해싱

### 🟨 진행 중
- [ ] Apple OAuth (환경 변수 설정 필요)

### ⬜ TODO / 향후 고려
- [ ] 2단계 인증 (2FA)
- [ ] 소셜 계정 연동/해제
- [ ] 휴면 계정 관리
- [ ] 로그인 이력 추적

---

## API 엔드포인트

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

## 최근 변경사항

### 2026-01-02: 이메일 인증 및 비밀번호 재설정 토큰 Redis 변경
- User 테이블에서 토큰 관련 필드 제거
- Redis 기반 코드 관리로 변경
- DB 부하 감소 및 TTL 기반 자동 만료

### 2026-01-01: Refresh Token 저장소 DB → Redis 변경
- RefreshToken 테이블 제거
- Redis 모듈 추가
- 빠른 토큰 검증 및 확장성 개선

---

**Last Updated**: 2026-01-02
