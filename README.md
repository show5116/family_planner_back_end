# Family Planner Backend

가족 플래너 시스템을 위한 NestJS 백엔드 API 서버

## 프로젝트 개요

NestJS 프레임워크를 기반으로 한 TypeScript 기반 REST API 서버입니다. 가족 단위 일정 관리, 그룹 권한 관리, OAuth 인증을 지원합니다.

## 기술 스택

### Core Framework

- **NestJS v11** - Progressive Node.js framework
- **TypeScript v5.7** - Type-safe JavaScript
- **Node.js** - Runtime environment

### Database & ORM

- **Prisma v6.19** - Next-generation ORM
- **MySQL** - Relational database (Railway 호스팅)

### Authentication

- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication
- **Google OAuth 2.0** - Social login
- **Kakao OAuth** - Social login

### Logging & Monitoring

- **Pino (nestjs-pino)** - High-performance JSON logger
  - 개발: `pino-pretty`로 컬러풀한 로그 출력
  - 프로덕션: JSON 구조화 로깅
- **Axiom** - 로그 수집 및 분석 플랫폼 (프로덕션)
- **Sentry** - 에러 추적 및 성능 모니터링 (프로덕션)
  - Real-time error tracking
  - Performance monitoring
  - Discord 알림 연동 지원

### Email

- **Nodemailer** - SMTP 이메일 전송 (Gmail)

### Development

- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Swagger/OpenAPI** - API 문서화

### Deployment

- **Railway** - Cloud platform
  - MySQL 데이터베이스 호스팅
  - 백엔드 애플리케이션 배포
  - 자동 환경 변수 연동

## 주요 기능

- 🔐 JWT 기반 인증 시스템
- 🌐 OAuth 2.0 소셜 로그인 (Google, Kakao)
- 👥 그룹 기반 권한 관리
- 📧 이메일 인증 및 알림
- 📊 Swagger API 문서 자동 생성
- 🔍 구조화된 로깅 (Pino + Axiom)
- 🚨 실시간 에러 모니터링 (Sentry)
- 🔒 역할 기반 접근 제어 (RBAC)

## 프로젝트 구조

```
src/
├── auth/           # 인증 및 OAuth
├── email/          # 이메일 전송
├── group/          # 그룹 관리
├── permission/     # 권한 관리
├── role/           # 역할 관리
├── prisma/         # Prisma 서비스
├── sentry/         # Sentry 에러 추적
├── webhook/        # Webhook (Sentry → Discord)
├── config/         # 환경 설정
└── main.ts         # 애플리케이션 진입점
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 실제 값 입력:

```bash
cp .env.example .env
```

필수 환경 변수:

- `DATABASE_URL` - MySQL 연결 문자열
- `JWT_ACCESS_SECRET` - JWT 액세스 토큰 시크릿
- `JWT_REFRESH_SECRET` - JWT 리프레시 토큰 시크릿
- `NODE_ENV` - 환경 구분 (development/production)

선택적 환경 변수 (프로덕션):

- `AXIOM_TOKEN` - Axiom 로그 수집 토큰
- `AXIOM_DATASET` - Axiom 데이터셋 이름
- `SENTRY_DSN` - Sentry 프로젝트 DSN
- `SENTRY_TRACES_SAMPLE_RATE` - 트레이스 샘플링 비율
- `DISCORD_WEBHOOK_URL` - Discord webhook URL (Sentry 알림 전송)
- `SENTRY_WEBHOOK_SECRET` - Sentry webhook 서명 검증 키 (선택)

### 3. 데이터베이스 마이그레이션

```bash
npm run prisma:migrate
```

### 4. 애플리케이션 실행

```bash
# 개발 모드 (watch mode)
npm run start:dev

# 프로덕션 모드
npm run start:prod
```

기본 포트: `http://localhost:3000`

## API 문서

Swagger UI: `http://localhost:3000/api`

## 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

## Prisma 명령어

```bash
# Prisma Client 생성
npm run prisma:generate

# 데이터베이스 마이그레이션 (개발)
npm run prisma:migrate

# Prisma Studio (GUI)
npm run prisma:studio

# 시드 데이터 추가
npm run prisma:seed
```

## Railway 배포

### 환경 변수 설정

Railway 대시보드에서 다음 환경 변수 설정:

**필수:**

- `NODE_ENV=production`
- `DATABASE_URL` - Railway MySQL 서비스 자동 연동
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

**선택 (모니터링):**

- `AXIOM_TOKEN` - 로그 수집
- `AXIOM_DATASET=family-planner`
- `SENTRY_DSN` - 에러 추적
- `SENTRY_TRACES_SAMPLE_RATE=0.1`

### 배포 프로세스

1. Railway 프로젝트 생성
2. MySQL 서비스 추가
3. 백엔드 서비스 추가 (GitHub 연동)
4. 환경 변수 설정
5. 자동 배포 완료

## 모니터링 설정

### Axiom (로그 수집)

1. [Axiom](https://app.axiom.co/) 계정 생성
2. Dataset 생성 (예: `family-planner`)
3. API Token 발급
4. Railway 환경 변수에 `AXIOM_TOKEN`, `AXIOM_DATASET` 설정

### Sentry (에러 추적 + Discord 알림)

1. [Sentry](https://sentry.io/) 프로젝트 생성
2. DSN 복사
3. Railway 환경 변수에 `SENTRY_DSN` 설정
4. Discord Webhook 연동 (선택):
   - Discord 채널에서 Webhook URL 생성
   - `DISCORD_WEBHOOK_URL` 환경 변수 설정
   - Sentry → Settings → Developer Settings → Internal Integrations
   - Webhook URL: `https://your-domain.com/webhook/sentry` 설정
   - 이벤트 선택: issue.created, error, issue.resolved 등
   - Discord에서 실시간 에러 알림 수신

자세한 설정은 [docs/features/00-setup.md](docs/features/00-setup.md#sentry--discord-webhook-연동) 참고

## 개발 가이드

자세한 개발 가이드는 [CLAUDE.md](CLAUDE.md)를 참고하세요:

- Import 경로 규칙 (`@/` prefix)
- 모듈 구조 및 아키텍처
- 코드 스타일 및 컨벤션
- 문서 구조 (TODO.md, ROADMAP.md, STATUS.md)

## 라이센스

MIT License
