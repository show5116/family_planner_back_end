# 00. 프로젝트 Setup

## 📋 개요

Family Planner Backend 프로젝트의 초기 설정 및 개발 환경 구축 가이드입니다.

**상태**: ✅ 완료
**Phase**: Phase 1 - 기반 구축
**완료일**: 2025-11-30

---

## 🎯 Setup 체크리스트

### ✅ 프로젝트 초기화
- [x] NestJS 프로젝트 구조 설정
- [x] TypeScript 설정 (`tsconfig.json`)
- [x] ESLint + Prettier 코드 품질 도구 설정
- [x] Jest 테스트 환경 설정
- [x] Git 저장소 초기화
- [x] `.gitignore` 설정

### ✅ 데이터베이스 설정
- [x] Prisma ORM 연동
- [x] MySQL 데이터베이스 연결 (Railway)
- [x] Prisma 스키마 설계 (`prisma/schema.prisma`)
- [x] 데이터베이스 마이그레이션 시스템 구축
- [x] 시드 데이터 스크립트 작성 (`prisma/seed.ts`)

### ✅ 환경 변수 관리
- [x] `.env.example` 템플릿 작성
- [x] 환경 변수 검증 (Joi 스키마)
- [x] `@nestjs/config` 모듈 연동

### ✅ 핵심 인프라 모듈
- [x] Prisma 모듈 (Global 모듈)
- [x] Firebase 모듈 (FCM 푸시 알림)
- [x] 이메일 모듈 (Nodemailer + Gmail SMTP)
- [x] 스토리지 모듈 (Cloudflare R2)
- [x] Sentry 에러 추적 모듈

### ✅ 문서화 시스템
- [x] Swagger/OpenAPI 설정
- [x] 커스텀 Swagger 데코레이터 (`@ApiSuccess`, `@ApiCreated` 등)
- [x] API 문서 자동 생성 스크립트
- [x] 프로젝트 가이드 문서 ([CLAUDE.md](../../CLAUDE.md), [CODE_STYLE.md](../../CODE_STYLE.md))

### ✅ 코드 품질 및 컨벤션
- [x] 절대 경로 alias 설정 (`@/`)
- [x] DTO 클래스 기반 검증 (class-validator)
- [x] 한글 문서화 표준
- [x] 에러 핸들링 가이드

### ✅ 배포 설정
- [x] Railway 배포 설정
- [x] 환경 변수 자동 연동 (Railway MySQL)
- [x] 프로덕션 빌드 최적화

---

## 🛠️ 기술 스택

### Framework & Language
- **NestJS** v11.0.1 - Node.js 프레임워크
- **TypeScript** v5.7.3 - 타입 안정성
- **Node.js** - 런타임 환경

### Database & ORM
- **MySQL** - 관계형 데이터베이스 (Railway 호스팅)
- **Prisma** v6.19.0 - ORM 및 데이터베이스 툴킷
- **Prisma Client** - 타입 안전 쿼리 빌더

### Authentication & Security
- **Passport** v0.7.0 - 인증 미들웨어
- **passport-jwt** v4.0.1 - JWT 인증 전략
- **passport-google-oauth20** v2.0.0 - Google OAuth
- **passport-kakao** v1.0.1 - Kakao OAuth
- **bcrypt** v6.0.0 - 비밀번호 해싱

### Infrastructure Services
- **Firebase Admin SDK** v13.6.0 - FCM 푸시 알림
- **Nodemailer** v7.0.10 - 이메일 발송 (Gmail SMTP)
- **AWS SDK S3** v3.948.0 - Cloudflare R2 스토리지 연동
- **Sentry** v10.29.0 - 에러 추적 및 모니터링

### Documentation & API
- **Swagger/OpenAPI** (@nestjs/swagger v11.2.3) - API 문서 자동 생성
- **class-validator** v0.14.2 - DTO 검증
- **class-transformer** v0.5.1 - 객체 변환

### Development Tools
- **Jest** v30.0.0 - 테스팅 프레임워크
- **ESLint** v9.18.0 - 린팅 도구
- **Prettier** v3.4.2 - 코드 포맷터
- **ts-node** v10.9.2 - TypeScript 실행 환경

### Utilities
- **RxJS** v7.8.1 - 반응형 프로그래밍
- **Joi** v18.0.2 - 환경 변수 검증
- **cookie-parser** v1.4.7 - 쿠키 파싱
- **multer** v2.0.2 - 파일 업로드
- **sharp** v0.34.5 - 이미지 처리

---

## 📦 프로젝트 구조

```
family_planner_back_end/
├── src/
│   ├── main.ts                    # 애플리케이션 진입점
│   ├── app.module.ts              # 루트 모듈
│   ├── app.controller.ts          # 루트 컨트롤러
│   ├── app.service.ts             # 루트 서비스
│   │
│   ├── prisma/                    # Prisma 모듈 (Global)
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── firebase/                  # Firebase 모듈 (Global)
│   │   ├── firebase.module.ts
│   │   ├── firebase.service.ts
│   │   └── firebase.config.ts
│   │
│   ├── email/                     # 이메일 모듈
│   │   ├── email.module.ts
│   │   └── email.service.ts
│   │
│   ├── storage/                   # 스토리지 모듈 (Cloudflare R2)
│   │   ├── storage.module.ts
│   │   └── storage.service.ts
│   │
│   ├── sentry/                    # Sentry 에러 추적 모듈
│   │   ├── sentry.module.ts
│   │   └── sentry.filter.ts
│   │
│   ├── auth/                      # 인증 모듈
│   ├── group/                     # 그룹 관리 모듈
│   ├── permission/                # 권한 관리 모듈
│   ├── role/                      # 역할 관리 모듈
│   ├── notification/              # 알림 모듈
│   ├── announcement/              # 공지사항 모듈
│   ├── qna/                       # Q&A 모듈
│   └── task/                      # Task 모듈
│
├── prisma/
│   ├── schema.prisma              # Prisma 스키마 정의
│   ├── seed.ts                    # 시드 데이터 스크립트
│   └── migrations/                # 데이터베이스 마이그레이션
│       ├── 20251118145320_init_user_table/
│       ├── 20251119140736_add_auth_models/
│       ├── 20251119144127_add_email_verification/
│       ├── 20251120145216_add_password_reset_fields/
│       ├── 20251121134251_add_group_management/
│       ├── 20251126114236_add_user_fields/
│       ├── 20251129142920_update_group_role_system/
│       ├── 20251130115339_add_immutable_role_and_join_requests/
│       ├── 20251130115952_add_permission_definition_table/
│       ├── 20251209124503_update_enum/
│       ├── 20251210150350_add_profile_image_key/
│       ├── 20251210151500_remove_profile_image/
│       ├── 20251212142142_add_sort_order_to_role_and_permission/
│       ├── 20251215135726_add_color_to_role/
│       ├── 20251217142248_add_invite_code_expires_at/
│       ├── 20251221215428_rename_groups_to_member_groups/
│       ├── 20251227143209_add_notification_tables/
│       ├── 20251229121211_add_announcement_tables/
│       ├── 20251229125503_add_qna_feature/
│       └── 20251229161819_add_task_features/
│
├── test/                          # E2E 테스트
├── docs/                          # 문서
│   └── features/                  # 기능별 상세 문서
│
├── .env.example                   # 환경 변수 템플릿
├── .gitignore                     # Git 제외 파일 목록
├── tsconfig.json                  # TypeScript 설정
├── nest-cli.json                  # NestJS CLI 설정
├── package.json                   # NPM 패키지 정의
├── README.md                      # 프로젝트 소개
├── CLAUDE.md                      # Claude Code 가이드
├── CODE_STYLE.md                  # 코드 스타일 가이드
├── ROADMAP.md                     # 프로젝트 로드맵
└── TODO.md                        # TODO 관리
```

---

## 🚀 개발 환경 설정 가이드

### 1. 사전 요구사항
- Node.js v18 이상
- npm 또는 yarn
- MySQL 데이터베이스 (Railway 권장)
- Git

### 2. 프로젝트 클론 및 설치
```bash
# 저장소 클론
git clone <repository-url>
cd family_planner_back_end

# 의존성 설치
npm install
```

### 3. 환경 변수 설정
```bash
# .env.example 파일을 .env로 복사
cp .env.example .env

# .env 파일을 열어 실제 값 입력
# 필수: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# 선택: SMTP 설정, OAuth 설정, Firebase 설정 등
```

#### 필수 환경 변수
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

#### 선택적 환경 변수
```env
# 이메일 (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="Family Planner <your-email@gmail.com>"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Kakao OAuth
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CALLBACK_URL="http://localhost:3000/auth/kakao/callback"

# Cloudflare R2 (파일 스토리지)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="family-planner"
R2_PUBLIC_URL="https://your-custom-domain.com"

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Sentry (에러 추적)
SENTRY_DSN="your-sentry-dsn"
SENTRY_TRACES_SAMPLE_RATE="0.1"

# Axiom (로그 전송)
AXIOM_TOKEN="your-axiom-token"
AXIOM_DATASET="family-planner"
LOG_LEVEL="info"
```

### 4. 데이터베이스 설정
```bash
# Prisma Client 생성
npm run prisma:generate

# 데이터베이스 마이그레이션 실행 (개발 환경)
npm run prisma:migrate

# 시드 데이터 추가 (권한, 역할 등)
npm run prisma:seed

# Prisma Studio 실행 (GUI로 데이터 확인/수정)
npm run prisma:studio
```

### 5. 애플리케이션 실행
```bash
# 개발 서버 실행 (watch 모드)
npm run start:dev

# 디버그 모드로 실행
npm run start:debug

# 프로덕션 빌드 및 실행
npm run build
npm run start:prod
```

### 6. API 문서 확인
- Swagger UI: http://localhost:3000/api
- Swagger JSON: http://localhost:3000/api-json

### 7. 테스트 실행
```bash
# 단위 테스트
npm run test

# watch 모드로 테스트
npm run test:watch

# 커버리지 포함 테스트
npm run test:cov

# E2E 테스트
npm run test:e2e
```

---

## 📝 주요 설정 파일

### TypeScript 설정 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    },
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": false
  }
}
```

### ESLint 설정 (주요 규칙)
- `@typescript-eslint/no-explicit-any`: 비활성화 (유연성)
- `@typescript-eslint/no-floating-promises`: 경고
- `@typescript-eslint/no-unsafe-argument`: 경고
- Prettier 연동 (자동 포맷팅)

### Prettier 설정
- 작은따옴표 사용
- 후행 쉼표 자동 추가
- 줄바꿈 80자 기준

### NestJS 설정 (`nest-cli.json`)
```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

---

## 🗄️ 데이터베이스 마이그레이션 히스토리

### Phase 1: 기반 구축 (2025-11-18 ~ 2025-11-30)
| 날짜 | 마이그레이션 | 설명 |
|------|-------------|------|
| 2025-11-18 | `init_user_table` | User 테이블 초기화 |
| 2025-11-19 | `add_auth_models` | RefreshToken 테이블 추가 (RTR 방식) |
| 2025-11-19 | `add_email_verification` | 이메일 인증 필드 추가 |
| 2025-11-20 | `add_password_reset_fields` | 비밀번호 재설정 필드 추가 |
| 2025-11-21 | `add_group_management` | Group, GroupMember 테이블 추가 |
| 2025-11-26 | `add_user_fields` | User 테이블 확장 (프로필 정보) |
| 2025-11-29 | `update_group_role_system` | 역할 기반 시스템 추가 (Role 테이블) |
| 2025-11-30 | `add_immutable_role_and_join_requests` | 불변 역할 + 가입 요청 테이블 |
| 2025-11-30 | `add_permission_definition_table` | Permission 정의 테이블 추가 |

### Phase 2: 핵심 기능 (2025-12-09 ~ 2025-12-21)
| 날짜 | 마이그레이션 | 설명 |
|------|-------------|------|
| 2025-12-09 | `update_enum` | Enum 타입 업데이트 |
| 2025-12-10 | `add_profile_image_key` | 프로필 이미지 키 추가 |
| 2025-12-10 | `remove_profile_image` | 프로필 이미지 URL 제거 (R2 키 사용) |
| 2025-12-12 | `add_sort_order_to_role_and_permission` | 정렬 순서 필드 추가 |
| 2025-12-15 | `add_color_to_role` | 역할 색상 필드 추가 |
| 2025-12-17 | `add_invite_code_expires_at` | 초대 코드 만료 시간 추가 |
| 2025-12-21 | `rename_groups_to_member_groups` | 그룹 테이블 이름 변경 |

### Phase 3: 협업 기능 (2025-12-27 ~ 2025-12-29)
| 날짜 | 마이그레이션 | 설명 |
|------|-------------|------|
| 2025-12-27 | `add_notification_tables` | 알림 관련 테이블 추가 (FCM) |
| 2025-12-29 | `add_announcement_tables` | 공지사항 테이블 추가 |
| 2025-12-29 | `add_qna_feature` | Q&A 질문/답변 테이블 추가 |
| 2025-12-29 | `add_task_features` | Task 관련 테이블 추가 (일정/할일 통합) |

---

## 🎨 Swagger 커스텀 데코레이터

코드 재사용성과 일관성을 위해 커스텀 Swagger 데코레이터를 사용합니다.

### 성공 응답 데코레이터
```typescript
@ApiSuccess(ResponseDto) // 200 OK
@ApiCreated(ResponseDto) // 201 Created
@ApiNoContent()          // 204 No Content
```

### 에러 응답 데코레이터
```typescript
@ApiBadRequest()         // 400 Bad Request
@ApiUnauthorized()       // 401 Unauthorized
@ApiForbidden()          // 403 Forbidden
@ApiNotFound()           // 404 Not Found
@ApiConflict()           // 409 Conflict
```

### 사용 예시
```typescript
@Get(':id')
@ApiOperation({ summary: '사용자 조회' })
@ApiSuccess(UserResponseDto)
@ApiNotFound('사용자를 찾을 수 없습니다')
getUser(@Param('id') id: string) {
  return this.userService.findOne(id);
}
```

---

## 📚 주요 문서

### 개발 가이드
- **[CLAUDE.md](../../CLAUDE.md)**: Claude Code 사용 가이드
- **[CODE_STYLE.md](../../CODE_STYLE.md)**: 코드 작성 스타일 가이드
- **[ROADMAP.md](../../ROADMAP.md)**: 전체 프로젝트 로드맵
- **[TODO.md](../../TODO.md)**: TODO 관리 및 기능 인덱스

### 기능별 문서
- [01-auth.md](01-auth.md): 인증/인가 시스템
- [02-groups.md](02-groups.md): 그룹 관리
- [03-permissions.md](03-permissions.md): 권한 관리
- [10-notifications.md](10-notifications.md): 알림 시스템
- 기타 문서는 [TODO.md](../../TODO.md) 참고

---

## 🔧 트러블슈팅

### Prisma Client 생성 오류
```bash
# Prisma Client를 재생성
npm run prisma:generate
```

### 데이터베이스 연결 실패
1. `.env` 파일의 `DATABASE_URL` 확인
2. Railway 대시보드에서 MySQL 서비스 상태 확인
3. 네트워크 연결 확인

### 마이그레이션 실패
```bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 재실행
npm run prisma:migrate

# 강제 재설정 (주의: 데이터 손실)
npx prisma migrate reset
```

### 환경 변수 누락 오류
1. `.env.example`과 `.env` 파일 비교
2. 필수 환경 변수가 모두 설정되었는지 확인
3. 애플리케이션 재시작

---

## 🎯 다음 단계

Setup이 완료되면 다음 단계로 진행합니다:

1. **인증/인가 구현** ([01-auth.md](01-auth.md))
2. **그룹 관리 구현** ([02-groups.md](02-groups.md))
3. **권한 관리 구현** ([03-permissions.md](03-permissions.md))
4. **기능별 모듈 개발** (ROADMAP.md 참고)

---

## 📌 참고 자료

### 공식 문서
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### 외부 서비스
- [Railway](https://railway.app/) - MySQL 호스팅
- [Firebase Console](https://console.firebase.google.com/) - FCM 설정
- [Cloudflare Dashboard](https://dash.cloudflare.com/) - R2 스토리지
- [Sentry](https://sentry.io/) - 에러 추적
- [Google Cloud Console](https://console.cloud.google.com/) - OAuth 설정
- [Kakao Developers](https://developers.kakao.com/) - Kakao OAuth

---

**작성일**: 2025-12-31
**최종 업데이트**: 2025-12-31
**작성자**: Claude Code
