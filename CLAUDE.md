# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소의 코드 작업을 수행할 때 참고할 가이드를 제공합니다.

## 프로젝트 개요

가족 플래너 시스템을 위한 NestJS 백엔드 애플리케이션입니다. NestJS 프레임워크 v11로 구축된 TypeScript 기반 Node.js REST API입니다.

## 개발 가이드

### 문서 구조
이 프로젝트는 체계적인 문서 관리를 위해 다음과 같은 구조를 사용합니다:

- **[TODO.md](TODO.md)**: 프로젝트 전체 개요 및 기능별 문서 인덱스
- **[ROADMAP.md](ROADMAP.md)**: Phase별 전체 프로젝트 로드맵 및 진행 상황
- **[CODE_STYLE.md](CODE_STYLE.md)**: 코드 작성 스타일 가이드 (Controller, Service, DTO 등)
- **[docs/features/](docs/features/)**: 기능별 상세 문서 (요구사항, API 명세, DB 스키마)

### 개발 워크플로우
1. **작업 시작 전**:
   - [ROADMAP.md](ROADMAP.md)에서 전체 Phase 및 우선순위 확인
   - [docs/features/](docs/features/)에서 해당 기능 문서 확인
   - **[CODE_STYLE.md](CODE_STYLE.md)에서 코드 작성 규칙 확인** ⭐

2. **개발 중**:
   - Prisma 스키마 설계 및 마이그레이션
   - NestJS 모듈/컨트롤러/서비스 구현 (**코드 스타일 가이드 준수**)
   - Swagger 문서화 (커스텀 데코레이터 사용: `@ApiSuccess`, `@ApiCreated` 등)
   - 단위 테스트 작성

3. **작업 완료 후**:
   - **코드 검사 실행**: `npm run check` 명령어로 TypeScript 및 ESLint 에러 확인 ⭐
   - 기능 문서의 체크박스 상태 업데이트 (⬜ → 🟨 → ✅)
   - 기능 문서에 "구현 완료 요약" 섹션 작성
   - Phase 진행 시 [ROADMAP.md](ROADMAP.md) 진행률 업데이트

### 코드 작성 규칙
**중요**: 새로운 기능을 구현하거나 기존 코드를 수정할 때는 반드시 **[CODE_STYLE.md](CODE_STYLE.md)** 문서를 참고하세요.

주요 규칙:
- **절대 경로 사용**: 모든 import는 `@/` 접두사 사용
- **한글 문서화**: Swagger 태그, 주석, 에러 메시지 모두 한글
- **DTO 클래스 사용**: Swagger 데코레이터에 string 대신 실제 DTO 클래스 전달
- **커스텀 데코레이터**: `@ApiSuccess`, `@ApiCreated`, `@ApiNotFound` 등 사용
- **@Request() req**: 컨트롤러에서 `req.user.userId`로 사용자 정보 접근
- **async 제거**: 컨트롤러 메서드에서 async 키워드 사용하지 않음

자세한 내용은 [CODE_STYLE.md](CODE_STYLE.md)를 참고하세요.

## 개발 명령어

### 설치
```bash
npm install
```

### 애플리케이션 실행
```bash
npm run start              # 애플리케이션 시작
npm run start:dev          # watch 모드로 시작 (개발 시 권장)
npm run start:debug        # 디버그 모드와 watch로 시작
npm run start:prod         # 프로덕션 모드
```

애플리케이션은 기본적으로 포트 3000에서 실행됩니다 (PORT 환경 변수로 설정 가능).

### 테스트
```bash
npm run test               # 단위 테스트 실행
npm run test:watch         # watch 모드로 테스트 실행
npm run test:cov           # 커버리지와 함께 테스트 실행
npm run test:debug         # 디버그 모드로 테스트 실행
npm run test:e2e           # E2E 테스트 실행
```

단위 테스트 파일은 소스 파일과 함께 `.spec.ts` 확장자로 위치합니다. E2E 테스트는 `test/` 디렉토리에 있으며 설정은 `test/jest-e2e.json`에 있습니다.

### 코드 품질
```bash
npm run build              # 프로젝트 빌드
npm run lint               # ESLint 실행 (자동 수정 포함)
npm run format             # Prettier로 코드 포맷팅
npm run check              # TypeScript + ESLint 에러 체크 (자동 수정 없음)
npm run check:types        # TypeScript 컴파일 에러만 체크
npm run check:lint         # ESLint 에러만 체크 (자동 수정 없음)
```

**중요**: 코드 수정 후에는 반드시 `npm run check` 명령어로 에러를 확인하세요!

### Prisma ORM
```bash
npm run prisma:generate    # Prisma Client 생성
npm run prisma:migrate     # 데이터베이스 마이그레이션 실행 (개발)
npm run prisma:studio      # Prisma Studio (GUI) 실행
npm run prisma:seed        # 데이터베이스 시드 데이터 추가
```

Prisma 스키마 파일은 `prisma/schema.prisma`에 위치합니다. 데이터베이스는 Railway에 배포된 MySQL을 사용하며, 연결 문자열은 `.env` 파일의 `DATABASE_URL` 환경 변수로 설정합니다. Railway 대시보드에서 제공되는 DATABASE_URL 값을 사용하세요.

## 아키텍처

### NestJS 모듈 시스템
애플리케이션은 NestJS의 모듈식 아키텍처를 따릅니다:
- **Modules** (`@Module` 데코레이터): 애플리케이션 구조와 의존성 주입 구성
- **Controllers** (`@Controller` 데코레이터): HTTP 요청 및 라우팅 처리
- **Services/Providers** (`@Injectable` 데코레이터): 비즈니스 로직 및 데이터 접근
- 진입점: `src/main.ts`는 `AppModule`로부터 NestJS 애플리케이션 인스턴스를 생성하여 애플리케이션을 부트스트랩합니다

### TypeScript 설정
- 모듈 시스템: `commonjs` (NestJS 최적화)
- 모듈 해석: `bundler` (path alias 지원)
- Target: ES2023
- 데코레이터 활성화 (NestJS에 필수)
- 엄격한 null 체크 활성화, 단 `noImplicitAny`는 비활성화
- 출력 디렉토리: `./dist`
- Path Alias: `@/*` → `src/*`

### 코드 스타일
- **ESLint**: TypeScript-ESLint 권장 타입 체크 규칙 적용
  - `@typescript-eslint/no-explicit-any`: 비활성화
  - `@typescript-eslint/no-floating-promises`: 경고
  - `@typescript-eslint/no-unsafe-argument`: 경고
- **Prettier**: 작은따옴표, 후행 쉼표, 자동 줄바꿈 처리

## 프로젝트 구조
```
src/
  main.ts                # 애플리케이션 진입점, NestJS 앱 부트스트랩
  app.module.ts          # 루트 모듈
  app.controller.ts      # 루트 컨트롤러
  app.service.ts         # 루트 서비스
  prisma/                # Prisma 모듈
    prisma.module.ts        # Prisma 모듈 (Global)
    prisma.service.ts       # Prisma 서비스 (데이터베이스 연결 관리)
  firebase/              # Firebase 모듈
    firebase.module.ts      # Firebase 모듈 (Global)
    firebase.service.ts     # Firebase Admin SDK 서비스
    firebase.config.ts      # Firebase 설정
  auth/                  # 인증 모듈
  group/                 # 그룹 관리 모듈
  permission/            # 권한 관리 모듈
  role/                  # 역할 관리 모듈
  notification/          # 알림 모듈
    dto/                    # DTO (Data Transfer Objects)
    enums/                  # Enum 정의
    notification.controller.ts
    notification.service.ts
    notification.module.ts
  email/                 # 이메일 모듈
  storage/               # 파일 스토리지 모듈 (Cloudflare R2)
  sentry/                # Sentry 에러 추적 모듈
  *.spec.ts              # 단위 테스트
test/
  *.e2e-spec.ts          # E2E 테스트
prisma/
  schema.prisma          # Prisma 스키마 정의
  migrations/            # 데이터베이스 마이그레이션
docs/
  features/              # 기능별 상세 문서
```

## 주요 의존성
- NestJS v11 (핵심 프레임워크)
- TypeScript v5.7
- Jest v30 (테스팅)
- RxJS v7 (반응형 프로그래밍)
- Prisma v6.19 (ORM 및 데이터베이스 툴킷)
- Firebase Admin SDK (FCM 푸시 알림)
- Nodemailer (이메일 발송)
- AWS SDK (Cloudflare R2 스토리지)

## 데이터베이스
- MySQL (Railway를 통해 배포)
- Railway 대시보드에서 DATABASE_URL을 확인하고 `.env` 파일에 설정

## 환경 변수 설정

### 로컬 개발
1. `.env.example` 파일을 `.env`로 복사
2. Railway 대시보드에서 MySQL의 `DATABASE_URL` 복사
3. `.env` 파일에 실제 값 입력

### Railway 배포
Railway에서는 환경 변수가 자동으로 설정됩니다:
- MySQL 서비스와 백엔드 서비스가 **같은 Railway 프로젝트** 내에 있으면 `DATABASE_URL`이 자동으로 연결됩니다
- 필요 시 Railway 대시보드 > 백엔드 서비스 > **Variables** 탭에서 수동으로 환경 변수 추가 가능

**중요**: `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 올라가지 않습니다. 민감한 정보는 반드시 `.env.example`이 아닌 `.env`에만 저장하세요.
