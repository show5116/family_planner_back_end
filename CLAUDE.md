# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소의 코드 작업을 수행할 때 참고할 가이드를 제공합니다.

## 프로젝트 개요

가족 플래너 시스템을 위한 NestJS 백엔드 애플리케이션입니다. NestJS 프레임워크 v11로 구축된 TypeScript 기반 Node.js REST API입니다.

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
```

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
- 현대적인 모듈 해석(`nodenext`) 사용 및 ES 모듈 상호 운용
- Target: ES2023
- 데코레이터 활성화 (NestJS에 필수)
- 엄격한 null 체크 활성화, 단 `noImplicitAny`는 비활성화
- 출력 디렉토리: `./dist`

### 코드 스타일
- **ESLint**: TypeScript-ESLint 권장 타입 체크 규칙 적용
  - `@typescript-eslint/no-explicit-any`: 비활성화
  - `@typescript-eslint/no-floating-promises`: 경고
  - `@typescript-eslint/no-unsafe-argument`: 경고
- **Prettier**: 작은따옴표, 후행 쉼표, 자동 줄바꿈 처리

## 프로젝트 구조
```
src/
  main.ts           # 애플리케이션 진입점, NestJS 앱 부트스트랩
  app.module.ts     # 루트 모듈
  app.controller.ts # 루트 컨트롤러
  app.service.ts    # 루트 서비스
  prisma/           # Prisma 모듈
    prisma.module.ts   # Prisma 모듈 (Global)
    prisma.service.ts  # Prisma 서비스 (데이터베이스 연결 관리)
  *.spec.ts         # 단위 테스트
test/
  *.e2e-spec.ts     # E2E 테스트
prisma/
  schema.prisma     # Prisma 스키마 정의
```

## 주요 의존성
- NestJS v11 (핵심 프레임워크)
- TypeScript v5.7
- Jest v30 (테스팅)
- RxJS v7 (반응형 프로그래밍)
- Prisma v6.19 (ORM 및 데이터베이스 툴킷)

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
