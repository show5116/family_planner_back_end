# Family Planner Backend - TODO

### 전체 로드맵
- **[ROADMAP.md](ROADMAP.md)** - 전체 프로젝트 로드맵 및 Phase별 계획

### 기능별 상세 문서
각 기능의 요구사항, 진행 상황, API 명세, 데이터베이스 스키마 등은 다음 문서에서 관리합니다:

| 상태 | 기능 | 문서 | Phase |
|------|------|------|-------|
| ✅ | 인증/인가 | [01-auth.md](docs/features/01-auth.md) | Phase 1 |
| ✅ | 그룹 관리 | [02-groups.md](docs/features/02-groups.md) | Phase 2 |
| ✅ | 권한 관리 | [03-permissions.md](docs/features/03-permissions.md) | Phase 2 |
| ⬜ | 자산 관리 | [04-assets.md](docs/features/04-assets.md) | Phase 4 |
| ⬜ | 가계부 관리 | [05-household.md](docs/features/05-household.md) | Phase 4 |
| ⬜ | 일정 & 할일 통합 | [06-tasks.md](docs/features/06-tasks.md) | Phase 3 |
| ⬜ | 메모 | [08-memo.md](docs/features/08-memo.md) | Phase 4 |
| ⬜ | 육아 포인트 | [09-childcare.md](docs/features/09-childcare.md) | Phase 5 |
| ✅ | 알림 | [10-notifications.md](docs/features/10-notifications.md) | Phase 3 |
| ⬜ | 공지사항 | [11-announcements.md](docs/features/11-announcements.md) | Phase 3 |
| ⬜ | Q&A | [12-qna.md](docs/features/12-qna.md) | Phase 3 |

---

## 📖 문서 사용 가이드

### 빠른 시작
1. **전체 그림 파악**: [ROADMAP.md](ROADMAP.md) 확인
2. **특정 기능 작업**: [docs/features/](docs/features/) 해당 문서 확인

### 개발 워크플로우
```
작업 시작
  → 기능 문서에서 요구사항 확인
  → Prisma 스키마 설계
  → API 구현
  → Swagger 문서화
  → 테스트 작성
  → 기능 문서 상태 업데이트
  → ROADMAP.md 진행률 업데이트
```

### 문서 업데이트 규칙
- 새로운 API 추가 시: 해당 기능 문서의 "API 엔드포인트" 섹션 업데이트
- 데이터베이스 스키마 변경 시: 해당 기능 문서의 "데이터베이스 스키마" 섹션 업데이트
- 기능 완료 시: 기능 문서 상태를 ✅로 업데이트하고 "구현 완료 요약" 섹션 작성
- Phase 진행 시: ROADMAP.md의 진행률 업데이트

자세한 내용은 [CLAUDE.md](CLAUDE.md)를 참고하세요.

---

## 🔧 개발 환경 설정

### 필수 환경 변수
```env
# Database
DATABASE_URL="mysql://..."

# JWT
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# AWS SES
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
SES_FROM_EMAIL="noreply@yourdomain.com"

# OAuth (선택)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CALLBACK_URL="http://localhost:3000/auth/kakao/callback"

# Application
PORT=3000
NODE_ENV="development"
```

### 개발 시작
```bash
# 의존성 설치
npm install

# Prisma Client 생성
npm run prisma:generate

# 데이터베이스 마이그레이션
npm run prisma:migrate

# 시드 데이터 추가
npm run prisma:seed

# 개발 서버 실행
npm run start:dev

# Swagger 문서 확인
# http://localhost:3000/api
```

---

## 📊 프로젝트 진행률

### Phase별 진행 상황
- ✅ **Phase 1 (기반 구축)**: 100% 완료
- ✅ **Phase 2 (핵심 기능)**: 100% 완료
- 🟨 **Phase 3 (협업 기능)**: 33% 완료 (알림, 프로필 완료 / 공지사항, Q&A, 일정, ToDo 대기)
- ⬜ **Phase 4 (데이터 관리)**: 시작 안함
- ⬜ **Phase 5 (특화 기능)**: 시작 안함
- ⬜ **Phase 6 (최적화/배포)**: 시작 안함

### Phase 3 진행 내역 (2025-12-28)
- ✅ 알림 시스템 (FCM 푸시 알림) 완료
- ✅ 프로필 관리 (Cloudflare R2 이미지 업로드) 완료
- ⬜ 공지사항 대기
- ⬜ Q&A 대기
- ⬜ 일정 & 할일 통합 관리 대기

### Phase 2 완료 내역 (2025-12-24)
- ✅ 그룹 관리 시스템 전체 완료
- ✅ 권한 관리 시스템 전체 완료
- ✅ 역할 기반 접근 제어 (RBAC) 구현 완료
- ✅ 이메일 초대 시스템 완료

### 현재 우선순위
1. 🔥 **High**: Phase 3 - 공지사항, Q&A API 설계 및 구현
2. 📌 **Medium**: Phase 3 - 일정 & 할일 통합 관리 구현
3. 💡 **Low**: 테스트 코드 작성 및 최적화

---

## 📝 주요 기술 스택

- **Framework**: NestJS v11
- **Language**: TypeScript v5.7
- **Database**: MySQL (Railway)
- **ORM**: Prisma v6.19
- **Authentication**: JWT + Passport
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest v30

---

**상태 아이콘**: ⬜ 시작 안함 | 🟨 진행 중 | ✅ 완료 | ⏸️ 보류 | ❌ 취소

**Last Updated**: 2025-12-27