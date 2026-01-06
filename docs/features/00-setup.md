# 00. 프로젝트 Setup

> **상태**: ✅ 완료
> **Phase**: Phase 1 - 기반 구축

---

## 개요

NestJS 기반 Family Planner Backend 프로젝트의 초기 설정 및 개발 환경 구축 가이드입니다.

---

## 기술 스택

### 핵심
- **NestJS** v11.0.1 - Node.js 프레임워크
- **TypeScript** v5.7.3
- **MySQL** - Railway 호스팅
- **Prisma** v6.19.0 - ORM

### 인증
- Passport (JWT, Google OAuth, Kakao OAuth)
- bcrypt v6.0.0 - 비밀번호 해싱

### 인프라
- Firebase Admin SDK v13.6.0 - FCM 푸시 알림
- Nodemailer v7.0.10 - 이메일 발송
- AWS SDK S3 v3.948.0 - Cloudflare R2
- Sentry v10.29.0 - 에러 추적

### 개발 도구
- Swagger/OpenAPI v11.2.3
- Jest v30.0.0
- ESLint v9.18.0 + Prettier v3.4.2

---

## 구현 상태

### ✅ 완료
- [x] NestJS 프레임워크 기반 구성
- [x] TypeScript 설정 및 Path Alias
- [x] Prisma ORM 설정 및 MySQL 연결
- [x] Firebase Admin SDK 통합
- [x] AWS SDK (Cloudflare R2) 설정
- [x] Nodemailer 이메일 발송
- [x] Sentry 에러 추적
- [x] Swagger/OpenAPI 문서화
- [x] JWT 인증 시스템
- [x] ESLint + Prettier 코드 스타일
- [x] Jest 테스트 환경
- [x] 커스텀 데코레이터 (@ApiSuccess, @ApiCreated 등)
- [x] Railway 배포 설정
- [x] 환경 변수 관리 (.env)
- [x] 데이터베이스 마이그레이션 시스템
- [x] Prisma Seed 데이터

### ⬜ TODO / 향후 고려
- [ ] Docker 컨테이너화
- [ ] CI/CD 파이프라인 구축
- [ ] 프로덕션 로깅 시스템

---

## 프로젝트 구조

```
src/
├── main.ts                    # 진입점
├── app.module.ts              # 루트 모듈
├── prisma/                    # Prisma 모듈 (Global)
├── firebase/                  # Firebase 모듈 (Global)
├── email/                     # 이메일 모듈
├── storage/                   # Cloudflare R2 스토리지
├── sentry/                    # Sentry 에러 추적
├── auth/                      # 인증
├── group/                     # 그룹 관리
├── permission/                # 권한 관리
├── role/                      # 역할 관리
├── notification/              # 알림
├── announcement/              # 공지사항
├── qna/                       # Q&A
└── task/                      # Task (일정/할일)

prisma/
├── schema.prisma              # Prisma 스키마
├── seed.ts                    # 시드 데이터
└── migrations/                # 마이그레이션
```

---

## 개발 환경 설정

### 1. 설치
```bash
git clone <repository-url>
cd family_planner_back_end
npm install
```

### 2. 환경 변수
```bash
cp .env.example .env
```

필수 환경 변수:
```env
# Database
DATABASE_URL="mysql://user:password@host:port/database"

# JWT
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Application
NODE_ENV="development"
FRONTEND_URL="http://localhost:3001"
```

선택적 환경 변수는 `.env.example` 참고.

### 3. 데이터베이스
```bash
npm run prisma:generate      # Prisma Client 생성
npm run prisma:migrate       # 마이그레이션 실행
npm run prisma:seed          # 시드 데이터 추가
npm run prisma:studio        # GUI로 데이터 확인
```

### 4. 실행
```bash
npm run start:dev            # 개발 서버 (watch 모드)
npm run build && npm run start:prod  # 프로덕션
```

API 문서: http://localhost:3000/api

### 5. 테스트
```bash
npm run test                 # 단위 테스트
npm run test:cov             # 커버리지
npm run test:e2e             # E2E 테스트
```

---

## 주요 설정 파일

### TypeScript (tsconfig.json)
- 모듈: commonjs
- Target: ES2023
- Path Alias: `@/*` → `src/*`
- Decorator 활성화

### ESLint
- `@typescript-eslint/no-explicit-any`: 비활성화
- Prettier 연동

### Prisma
- Provider: MySQL
- 자동 타입 생성
- 마이그레이션 히스토리 관리

---

## 데이터베이스 마이그레이션 히스토리

### Phase 1: 기반 구축 (2025-11-18 ~ 2025-11-30)
- User, RefreshToken, Group, GroupMember 테이블
- Role, Permission 시스템
- 초대 및 가입 요청 테이블

### Phase 2: 핵심 기능 (2025-12-09 ~ 2025-12-21)
- Enum 업데이트
- 프로필 이미지 R2 키 관리
- 역할 정렬 및 색상
- 초대 코드 만료 시간

### Phase 3: 협업 기능 (2025-12-27 ~ 2025-12-29)
- Notification, Announcement, Q&A 테이블
- Task 관련 테이블 (Categories, Tasks, Recurrings 등)

---

## Swagger 커스텀 데코레이터

성공 응답:
```typescript
@ApiSuccess(ResponseDto)     // 200 OK
@ApiCreated(ResponseDto)     // 201 Created
@ApiNoContent()              // 204 No Content
```

에러 응답:
```typescript
@ApiBadRequest()             // 400
@ApiUnauthorized()           // 401
@ApiForbidden()              // 403
@ApiNotFound()               // 404
@ApiConflict()               // 409
```

---

## 주요 문서

- [CLAUDE.md](../../CLAUDE.md): Claude Code 가이드
- [CODE_STYLE.md](../../CODE_STYLE.md): 코드 스타일
- [ROADMAP.md](../../ROADMAP.md): 프로젝트 로드맵
- [TODO.md](../../TODO.md): TODO 및 기능 인덱스

---

## 트러블슈팅

### Prisma Client 오류
```bash
npm run prisma:generate
```

### 데이터베이스 연결 실패
1. `.env` 파일의 `DATABASE_URL` 확인
2. Railway MySQL 서비스 상태 확인

### 마이그레이션 실패
```bash
npx prisma migrate status
npm run prisma:migrate
# 강제 재설정 (주의: 데이터 손실)
npx prisma migrate reset
```

---

## 다음 단계

1. [01-auth.md](01-auth.md): 인증/인가
2. [02-groups.md](02-groups.md): 그룹 관리
3. [03-permissions.md](03-permissions.md): 권한 관리
4. 기타 기능별 모듈 (ROADMAP.md 참고)

---

**작성일**: 2025-12-31
**최종 업데이트**: 2025-12-31
