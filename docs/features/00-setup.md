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

### 🚧 진행 중
- [ ] 다국어 지원 (i18n) — `Accept-Language` 헤더 기반

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
├── webhook/                   # Webhook (Sentry → Discord)
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

선택적 환경 변수:
```env
# Discord Webhook (Sentry 알림 전송)
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Sentry Webhook 서명 검증 (선택)
SENTRY_WEBHOOK_SECRET=""
```

전체 환경 변수는 `.env.example` 참고.

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

## Sentry → Discord Webhook 연동

Sentry에서 발생한 에러를 Discord로 실시간 알림받을 수 있습니다.

### 1. Discord Webhook 생성
1. Discord 채널 → 설정 → 연동 → Webhook
2. "새 Webhook" 생성
3. Webhook URL 복사 → `.env`의 `DISCORD_WEBHOOK_URL`에 추가

### 2. Sentry Internal Integration 설정
1. Sentry 프로젝트 → **Settings** → **Developer Settings** → **Internal Integrations**
2. **"New Internal Integration"** 클릭
3. 설정:
   - **Name**: Discord Notifier (원하는 이름)
   - **Webhook URL**: `https://your-domain.com/webhook/sentry`
   - **Permissions**: Issue & Event → **Read** 권한 부여
4. **Webhooks** 섹션에서 알림받을 이벤트 선택:
   - ✅ `issue.created` (새 이슈 생성)
   - ✅ `error` (에러 발생)
   - ✅ `issue.resolved` (이슈 해결)
   - ✅ `issue.assigned` (이슈 할당)
5. (선택) **Client Secret** 복사 → `.env`의 `SENTRY_WEBHOOK_SECRET`에 추가 (서명 검증용)
6. Integration 저장

### 3. 작동 방식
- Sentry에서 에러 발생 → Internal Integration이 webhook 호출
- NestJS `/webhook/sentry` 엔드포인트 수신
- Raw Body로 HMAC SHA-256 서명 검증 (Secret이 있는 경우)
- Discord Embed 형식으로 변환하여 전송
- Discord 채널에서 실시간 알림 확인

### 4. Discord 알림 포함 정보
- 이벤트 타입 (issue.created, error 등)
- 프로젝트 이름
- 에러 위치 및 메시지
- 발생 횟수
- 영향받은 사용자 수
- Sentry 이슈 링크

---

## 다국어 지원 (i18n)

### 개요

`Accept-Language` 헤더를 통해 언어를 전달받아 에러 메시지, DTO 검증 메시지, 이메일/알림 텍스트를 다국어로 응답합니다.

지원 언어: `ko` (한국어, 기본값), `en` (영어), 향후 추가 가능

### 사용 라이브러리

- **nestjs-i18n** — `Accept-Language` 헤더 파싱, ValidationPipe 연동, 번역 서비스 제공

### 클라이언트 사용법

모든 API 요청 헤더에 `Accept-Language`를 포함합니다.

```http
Accept-Language: ko
Accept-Language: en
```

헤더가 없거나 지원하지 않는 언어인 경우 `ko`(한국어)로 폴백됩니다.

### 번역 파일 구조

기능별로 JSON 파일을 분리합니다.

```
src/i18n/
├── ko/
│   ├── auth.json
│   ├── validation.json
│   ├── notification.json
│   └── email.json
└── en/
    ├── auth.json
    ├── validation.json
    ├── notification.json
    └── email.json
```

번역 키 예시:

```json
// src/i18n/ko/auth.json
{
  "errors": {
    "email_exists": "이미 사용 중인 이메일입니다",
    "invalid_credentials": "이메일 또는 비밀번호가 일치하지 않습니다",
    "weak_password": "비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다"
  }
}

// src/i18n/en/auth.json
{
  "errors": {
    "email_exists": "This email is already in use",
    "invalid_credentials": "Invalid email or password",
    "weak_password": "Password must contain at least one uppercase, lowercase, number, and special character"
  }
}
```

### 구현 범위

| 범위 | 방식 | 상태 |
|------|------|------|
| API 에러 메시지 | `GlobalExceptionFilter` + i18n 키 | 🚧 예정 |
| DTO 검증 메시지 | `I18nValidationPipe` | 🚧 예정 |
| 이메일 본문 | Handlebars 템플릿 언어별 분기 | 🚧 예정 |
| FCM 알림 텍스트 | `NotificationService` 언어 파라미터 | 🚧 예정 |

### 구현 단계

**1단계: 기반 설정**

```bash
npm install nestjs-i18n
```

`AppModule`에 `I18nModule` 등록 (`HeaderResolver`로 `Accept-Language` 파싱):

```typescript
I18nModule.forRoot({
  fallbackLanguage: 'ko',
  loaderOptions: {
    path: path.join(__dirname, '/i18n/'),
    watch: true,
  },
  resolvers: [
    { use: HeaderResolver, options: ['accept-language'] },
  ],
})
```

**2단계: 에러 메시지**

서비스에서 하드코딩된 한국어 문자열을 번역 키로 교체:

```typescript
// Before
throw new ConflictException('이미 사용 중인 이메일입니다');

// After
throw new ConflictException('auth.errors.email_exists');
```

`GlobalExceptionFilter`에서 `I18nService`로 번역 후 응답:

```typescript
@Catch(HttpException)
export class I18nExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const lang = request.i18nLang ?? 'ko';
    const key = exception.message;

    const message = await this.i18n.translate(key, { lang });
    // ...응답
  }
}
```

**3단계: DTO 검증 메시지**

`ValidationPipe` → `I18nValidationPipe`로 교체:

```typescript
// main.ts
app.useGlobalPipes(
  new I18nValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

DTO의 커스텀 메시지를 번역 키로 교체:

```typescript
@Matches(/.../, { message: 'validation.password_weak' })
password: string;
```

**4단계: 이메일/알림**

`sendNotification`, `sendEmail` 호출 시 언어 정보를 함께 전달하고, 내부에서 `I18nService`로 텍스트 번역:

```typescript
async sendNotification(dto: SendNotificationDto, lang: string = 'ko') {
  const title = await this.i18n.translate(dto.titleKey, { lang });
  const body = await this.i18n.translate(dto.bodyKey, { lang });
  // ...
}
```

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
**최종 업데이트**: 2026-05-19
