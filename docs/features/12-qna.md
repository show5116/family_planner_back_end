# 12. Q&A (Questions and Answers)

> **상태**: ✅ 완료
> **우선순위**: High
> **담당 Phase**: Phase 3

---

## 📋 개요

사용자가 운영자(ADMIN)에게 직접 질문하고 답변을 받을 수 있는 1:1 지원 시스템입니다. 버그 신고, 개선 제안, 사용법 문의, 계정 문제 등에 활용되며, 공개/비공개 설정을 통해 다른 사용자와 정보를 공유할 수 있습니다.

---

## 🎯 핵심 개념

### Q&A 특징

- **사용자 → ADMIN**: 일반 사용자가 질문 작성, ADMIN만 답변 가능
- **공개/비공개 선택**: 질문 작성 시 공개 여부 설정 가능
  - **공개**: 모든 사용자가 조회 가능 (작성자명 표시)
  - **비공개**: 작성자와 ADMIN만 조회 가능
- **상태 관리**: 대기 중, 답변 완료, 해결 완료
- **카테고리**: 버그, 개선 제안, 사용법, 계정, 결제, 기타
- **첨부 파일**: 스크린샷, 로그 파일 등 첨부 가능
- **알림 연동**: 새 질문, 답변 등록 시 알림

### 주요 유스케이스

1. **버그 신고**: "앱이 자꾸 종료돼요", "알림이 안 와요"
2. **개선 제안**: "이런 기능이 있으면 좋겠어요"
3. **사용법 문의**: "반복 일정은 어떻게 설정하나요?", "그룹 초대는 어떻게 하나요?"
4. **계정 문제**: "로그인이 안 돼요", "비밀번호 재설정이 안 돼요"
5. **기타 문의**: "요금제가 궁금해요", "탈퇴하고 싶어요"

---

## ✅ 공개 질문 조회

### 공개 질문 목록 조회 (`GET /qna/public-questions`)

- ✅ 모든 사용자 조회 가능 (JWT 인증)
- ✅ 공개(PUBLIC) 질문만 필터링
- ✅ 페이지네이션 지원 (page, limit)
- ✅ 상태/카테고리 필터 지원
- ✅ 검색 기능 (제목/내용)
- ✅ 작성자 정보 포함
- ✅ 내용 미리보기 100자

**Query Params**:
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지 크기 (default: 20)
- `status`: 상태 필터 (optional)
- `category`: 카테고리 필터 (optional)
- `search`: 검색어 (제목/내용) (optional)

**관련 파일**:
- [src/qna/qna.controller.ts](../../src/qna/qna.controller.ts)
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

## ✅ 내 질문 관리

### 내 질문 목록 조회 (`GET /qna/my-questions`)

- ✅ 본인 질문만 조회 (JWT 인증)
- ✅ 공개/비공개 모두 포함
- ✅ 페이지네이션 지원
- ✅ 상태/카테고리 필터 지원
- ✅ 최신순 정렬

**Query Params**:
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지 크기 (default: 20)
- `status`: 상태 필터 (optional)
- `category`: 카테고리 필터 (optional)

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 질문 상세 조회 (`GET /qna/questions/:id`)

- ✅ 공개 질문: 모든 사용자 조회 가능
- ✅ 비공개 질문: 본인 또는 ADMIN만 조회 가능
- ✅ QuestionVisibilityGuard 적용
- ✅ 전체 답변 목록 포함
- ✅ Soft Delete된 질문은 조회 불가

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)
- [src/qna/guards/question-visibility.guard.ts](../../src/qna/guards/question-visibility.guard.ts)

---

### 질문 작성 (`POST /qna/questions`)

- ✅ 모든 사용자 작성 가능 (JWT 인증)
- ✅ 제목 (1~200자), 내용 (1~5000자) 필수
- ✅ 카테고리, 공개여부, 첨부파일 입력
- ✅ 작성 후 상태: PENDING

**부가 동작**:
- 모든 ADMIN에게 SYSTEM 알림 발송

**관련 파일**:
- [src/qna/qna.controller.ts](../../src/qna/qna.controller.ts)
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 질문 수정 (`PUT /qna/questions/:id`)

- ✅ 본인 작성 질문만 수정 가능
- ✅ ANSWERED 또는 RESOLVED 상태에서는 수정 불가
- ✅ 제목, 내용, 카테고리, 공개여부, 첨부파일 수정 가능

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 질문 삭제 (`DELETE /qna/questions/:id`)

- ✅ 본인 작성 질문만 삭제 가능
- ✅ Soft Delete (`deletedAt` 설정)
- ✅ 답변 데이터는 유지 (Cascade 아님)

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 질문 해결 완료 처리 (`PATCH /qna/questions/:id/resolve`)

- ✅ 본인 작성 질문만 가능
- ✅ status를 RESOLVED로 변경
- ✅ PENDING 상태에서는 해결 불가 (답변 필요)

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

## ✅ ADMIN 기능

### 모든 질문 목록 조회 (`GET /qna/admin/questions`)

- ✅ ADMIN 권한 필요 (AdminGuard)
- ✅ 공개/비공개 모든 질문 조회
- ✅ 상태별 필터 (PENDING, ANSWERED, RESOLVED)
- ✅ 카테고리별 필터
- ✅ 검색 기능 (제목/내용/사용자명)
- ✅ PENDING 우선 정렬 → 최신순

**Query Params**:
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지 크기 (default: 20)
- `status`: 상태 필터 (optional)
- `category`: 카테고리 필터 (optional)
- `search`: 검색어 (제목/내용/사용자명) (optional)

**관련 파일**:
- [src/qna/qna-admin.controller.ts](../../src/qna/qna-admin.controller.ts)
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 답변 작성 (`POST /qna/questions/:questionId/answers`)

- ✅ ADMIN 권한 필요
- ✅ 내용 (1~5000자) 필수, 첨부파일 선택
- ✅ 답변 작성 시 질문 상태 자동 변경 (PENDING → ANSWERED)

**부가 동작**:
- 질문 작성자에게 SYSTEM 알림 발송 (답변 등록 알림)

**관련 파일**:
- [src/qna/qna-admin.controller.ts](../../src/qna/qna-admin.controller.ts)
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 답변 수정 (`PUT /qna/questions/:questionId/answers/:id`)

- ✅ ADMIN 권한 필요
- ✅ 내용, 첨부파일 수정 가능

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 답변 삭제 (`DELETE /qna/questions/:questionId/answers/:id`)

- ✅ ADMIN 권한 필요
- ✅ Soft Delete (`deletedAt` 설정)

**관련 파일**:
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

### 통계 조회 (`GET /qna/admin/statistics`)

- ✅ ADMIN 권한 필요
- ✅ 전체 질문 수, 상태별 개수
- ✅ 카테고리별 통계
- ✅ 최근 질문 목록 (10개)

**관련 파일**:
- [src/qna/qna-admin.controller.ts](../../src/qna/qna-admin.controller.ts)
- [src/qna/qna.service.ts](../../src/qna/qna.service.ts)

---

## 📦 데이터베이스 스키마

### Question

| 컬럼        | 타입          | 설명                                   | 제약조건      |
| ----------- | ------------- | -------------------------------------- | ------------- |
| id          | String (UUID) | 기본 키                                | PK            |
| userId      | String        | 작성자 ID (일반 사용자)                | FK, NOT NULL  |
| title       | String        | 질문 제목                              | NOT NULL      |
| content     | Text          | 질문 내용                              | NOT NULL      |
| category    | Enum          | 카테고리 (BUG, FEATURE, USAGE 등)      | NOT NULL      |
| status      | Enum          | 상태 (PENDING, ANSWERED, RESOLVED)     | DEFAULT PENDING |
| visibility  | Enum          | 공개 여부 (PUBLIC, PRIVATE)            | DEFAULT PRIVATE |
| attachments | Json          | 첨부파일 [{url, name, size}]           | Nullable      |
| createdAt   | DateTime      | 작성 시간                              | AUTO          |
| updatedAt   | DateTime      | 수정 시간                              | AUTO          |
| deletedAt   | DateTime      | 삭제 시간 (Soft Delete)                | Nullable      |

**인덱스**:
- `userId, createdAt DESC` (사용자별 질문 조회)
- `status` (상태별 필터링)
- `category` (카테고리별 필터링)
- `visibility, createdAt DESC` (공개 질문 목록 조회)

### Answer

| 컬럼        | 타입          | 설명                  | 제약조건     |
| ----------- | ------------- | --------------------- | ------------ |
| id          | String (UUID) | 기본 키               | PK           |
| questionId  | String        | 질문 ID               | FK, NOT NULL |
| adminId     | String        | 답변 작성자 (ADMIN)   | FK, NOT NULL |
| content     | Text          | 답변 내용             | NOT NULL     |
| attachments | Json          | 첨부파일              | Nullable     |
| createdAt   | DateTime      | 작성 시간             | AUTO         |
| updatedAt   | DateTime      | 수정 시간             | AUTO         |
| deletedAt   | DateTime      | 삭제 시간 (Soft Delete) | Nullable   |

**인덱스**:
- `questionId, createdAt DESC` (질문별 답변 조회)

---

## 📊 Enum 정의

### QuestionCategory

```typescript
export enum QuestionCategory {
  BUG = 'BUG',               // 버그 신고
  FEATURE = 'FEATURE',       // 기능 제안/개선
  USAGE = 'USAGE',           // 사용법 문의
  ACCOUNT = 'ACCOUNT',       // 계정 문제
  PAYMENT = 'PAYMENT',       // 결제/요금제
  ETC = 'ETC',               // 기타
}
```

### QuestionStatus

```typescript
export enum QuestionStatus {
  PENDING = 'PENDING',       // 대기 중 (답변 대기)
  ANSWERED = 'ANSWERED',     // 답변 완료 (ADMIN 답변 완료)
  RESOLVED = 'RESOLVED',     // 해결 완료 (사용자가 해결 확인)
}
```

### QuestionVisibility

```typescript
export enum QuestionVisibility {
  PUBLIC = 'PUBLIC',         // 공개 (모든 사용자가 조회 가능)
  PRIVATE = 'PRIVATE',       // 비공개 (작성자와 ADMIN만 조회 가능)
}
```

---

## 🛠️ 구현 가이드

### 1. Prisma 스키마 작성

```prisma
enum QuestionCategory {
  BUG
  FEATURE
  USAGE
  ACCOUNT
  PAYMENT
  ETC
}

enum QuestionStatus {
  PENDING
  ANSWERED
  RESOLVED
}

enum QuestionVisibility {
  PUBLIC
  PRIVATE
}

model Question {
  id          String               @id @default(uuid())
  userId      String
  title       String               @db.VarChar(200)
  content     String               @db.Text
  category    QuestionCategory
  status      QuestionStatus       @default(PENDING)
  visibility  QuestionVisibility   @default(PRIVATE)
  attachments Json?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  deletedAt   DateTime?

  user    User     @relation(fields: [userId], references: [id])
  answers Answer[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@index([category])
  @@index([visibility, createdAt(sort: Desc)])
  @@map("questions")
}

model Answer {
  id          String    @id @default(uuid())
  questionId  String
  adminId     String
  content     String    @db.Text
  attachments Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  admin    User     @relation("AdminAnswers", fields: [adminId], references: [id])

  @@index([questionId, createdAt(sort: Desc)])
  @@map("answers")
}
```

### 2. 모듈 구조

```
src/qna/
  dto/
    create-question.dto.ts
    update-question.dto.ts
    create-answer.dto.ts
    question-response.dto.ts
    answer-response.dto.ts
    qna-statistics.dto.ts
  enums/
    question-category.enum.ts
    question-status.enum.ts
    question-visibility.enum.ts
  guards/
    question-visibility.guard.ts  // 공개/비공개 권한 검증
  qna.controller.ts
  qna-admin.controller.ts    // ADMIN 전용 엔드포인트
  qna.service.ts
  qna.module.ts
```

### 3. QuestionVisibilityGuard 구현

```typescript
@Injectable()
export class QuestionVisibilityGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const questionId = request.params.id;

    if (!userId || !questionId) {
      throw new ForbiddenException('권한이 없습니다');
    }

    // 질문 조회
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    // ADMIN은 모든 질문 접근 가능
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      return true;
    }

    // 공개 질문은 누구나 접근 가능
    if (question.visibility === QuestionVisibility.PUBLIC) {
      return true;
    }

    // 비공개 질문은 본인만 접근 가능
    if (question.userId === userId) {
      return true;
    }

    throw new ForbiddenException('권한이 없습니다');
  }
}
```

### 4. 핵심 비즈니스 로직

#### 공개 질문 목록 조회

- 공개(PUBLIC) 질문만 필터링
- 검색 기능: 제목/내용 OR 조건
- 내용 미리보기: 100자 제한

#### 질문 작성 + ADMIN 알림

- 트랜잭션으로 질문 생성
- 모든 ADMIN 조회 후 알림 발송
- `Promise.allSettled`로 알림 실패 시에도 작성 성공

#### 답변 작성 + 상태 변경 + 사용자 알림

- 트랜잭션으로 답변 생성 + 질문 상태 변경
- PENDING → ANSWERED 자동 변경
- 질문 작성자에게 알림 발송

#### 권한 검증

- 공개 질문: 모든 사용자 조회 가능
- 비공개 질문: 본인 또는 ADMIN만 조회 가능
- QuestionVisibilityGuard로 상세 조회 API 보호

---

## 📝 API 엔드포인트

| Method | Endpoint                               | 설명                     | Guard              |
| ------ | -------------------------------------- | ------------------------ | ------------------ |
| GET    | `/qna/public-questions`                | 공개 질문 목록 조회      | JWT                |
| GET    | `/qna/my-questions`                    | 내 질문 목록 조회        | JWT                |
| GET    | `/qna/questions/:id`                   | 질문 상세 조회           | JWT, Visibility    |
| POST   | `/qna/questions`                       | 질문 작성                | JWT                |
| PUT    | `/qna/questions/:id`                   | 질문 수정                | JWT                |
| DELETE | `/qna/questions/:id`                   | 질문 삭제                | JWT                |
| PATCH  | `/qna/questions/:id/resolve`           | 질문 해결 완료 처리      | JWT                |
| GET    | `/qna/admin/questions`                 | 모든 질문 목록 조회      | JWT, Admin         |
| POST   | `/qna/questions/:questionId/answers`   | 답변 작성                | JWT, Admin         |
| PUT    | `/qna/questions/:questionId/answers/:id` | 답변 수정              | JWT, Admin         |
| DELETE | `/qna/questions/:questionId/answers/:id` | 답변 삭제              | JWT, Admin         |
| GET    | `/qna/admin/statistics`                | 통계 조회                | JWT, Admin         |

---

## 🧪 테스트 시나리오

### 단위 테스트

- [x] 질문 작성 + ADMIN에게 알림 발송
- [x] 질문 공개/비공개 설정
- [x] 공개 질문 목록 조회 (PUBLIC만 조회됨)
- [x] 답변 작성 + 상태 변경 (PENDING → ANSWERED) + 사용자에게 알림
- [x] 질문 해결 완료 (ANSWERED → RESOLVED)
- [x] 공개 질문은 모든 사용자가 조회 가능
- [x] 비공개 질문은 본인 또는 ADMIN만 조회 가능
- [x] ADMIN은 모든 질문 조회 가능
- [x] 일반 사용자가 답변 작성 시도 → 예외 처리
- [x] 통계 조회 (카테고리별, 상태별)

### E2E 테스트

- [x] 사용자가 공개 질문 작성 → ADMIN에게 알림 발송
- [x] 사용자가 비공개 질문 작성 → 다른 사용자는 조회 불가
- [x] 공개 질문 목록 조회 → 모든 사용자 접근 가능
- [x] 비공개 질문 상세 조회 시도 → 본인 아니면 403 Forbidden
- [x] 공개 질문 상세 조회 → 누구나 조회 가능
- [x] ADMIN이 답변 작성 → 상태 자동 변경 → 사용자에게 알림 발송
- [x] 사용자가 해결 완료 처리
- [x] ADMIN이 전체 질문 목록 조회 (공개/비공개 모두)

---

## 🚀 향후 개선 사항

- [ ] 질문 우선순위 설정 (긴급, 보통, 낮음)
- [ ] 답변 만족도 평가 (별점)
- [ ] 자주 묻는 질문 (FAQ) 자동 추출
- [ ] 질문 템플릿 제공 (카테고리별)
- [ ] 답변 템플릿 (ADMIN용)
- [ ] 질문 자동 분류 (AI/ML)
- [ ] 실시간 채팅 연동
- [ ] 이메일 알림 추가 발송
- [ ] 질문 검색 기능 강화 (전문 검색)

---

## 📝 구현 체크리스트

- [x] Prisma 스키마 작성 (Question, Answer)
- [x] Enum 정의 (QuestionCategory, QuestionStatus, QuestionVisibility)
- [x] QnaModule 생성
- [x] QnaService 구현
  - [x] 질문 CRUD (본인 질문만)
  - [x] 공개 질문 목록 조회 (모든 사용자)
  - [x] 답변 CRUD (ADMIN 전용)
  - [x] 상태 관리 (PENDING → ANSWERED → RESOLVED)
  - [x] 통계 조회 (ADMIN 전용)
  - [x] 공개/비공개 권한 검증
- [x] QnaController 구현 (사용자용)
- [x] QnaAdminController 구현 (ADMIN 전용)
- [x] QuestionVisibilityGuard 구현 (공개/비공개 권한 검증)
- [x] DTO 작성
- [x] Swagger 문서화
- [x] 단위 테스트 작성
- [x] E2E 테스트 작성
- [x] 데이터베이스 마이그레이션

---

## 🎉 구현 완료 요약

**완료일**: 2025-12-29

### 구현된 주요 기능

#### 1. 데이터베이스 스키마
- **Question 모델**: 질문 정보, 카테고리, 상태, 공개여부, 첨부파일 지원
- **Answer 모델**: 답변 정보, 첨부파일 지원
- **Enum 타입**: QuestionCategory, QuestionStatus, QuestionVisibility
- **인덱스**: 성능 최적화를 위한 복합 인덱스 설정

#### 2. API 엔드포인트

**사용자용 API** (`/qna`):
- `GET /qna/public-questions` - 공개 질문 목록 조회 (내용 100자 미리보기)
- `GET /qna/my-questions` - 내 질문 목록 조회
- `GET /qna/questions/:id` - 질문 상세 조회 (QuestionVisibilityGuard 적용)
- `POST /qna/questions` - 질문 작성 (ADMIN에게 알림 발송)
- `PUT /qna/questions/:id` - 질문 수정 (본인만, PENDING 상태만)
- `DELETE /qna/questions/:id` - 질문 삭제 (Soft Delete)
- `PATCH /qna/questions/:id/resolve` - 질문 해결 완료 처리

**관리자용 API** (`/qna/admin`):
- `GET /qna/admin/questions` - 모든 질문 조회 (PENDING 우선 정렬)
- `GET /qna/admin/statistics` - 통계 조회 (상태별, 카테고리별)
- `POST /qna/admin/questions/:questionId/answers` - 답변 작성 (자동 상태 변경 + 사용자 알림)
- `PUT /qna/admin/questions/:questionId/answers/:id` - 답변 수정
- `DELETE /qna/admin/questions/:questionId/answers/:id` - 답변 삭제

#### 3. 핵심 구현 내용

**QuestionVisibilityGuard**:
- 공개 질문: 모든 사용자 조회 가능
- 비공개 질문: 본인 또는 ADMIN만 조회 가능
- Guard에서 권한 검증 자동 처리

**알림 시스템 통합**:
- 질문 작성 시: 모든 ADMIN에게 SYSTEM 알림 발송
- 답변 작성 시: 질문 작성자에게 SYSTEM 알림 발송
- `Promise.allSettled`로 알림 실패 시에도 작업 성공 보장

**상태 관리**:
- PENDING: 답변 대기 중
- ANSWERED: 답변 완료 (자동 전환)
- RESOLVED: 사용자가 해결 확인

**검색 및 필터**:
- 상태별, 카테고리별 필터링
- 제목/내용 검색 (공개 질문)
- 제목/내용/사용자명 검색 (ADMIN)
- 페이지네이션 지원 (기본 20개)

#### 4. 생성된 파일

```
src/qna/
├── dto/
│   ├── attachment.dto.ts
│   ├── create-question.dto.ts
│   ├── update-question.dto.ts
│   ├── create-answer.dto.ts
│   ├── update-answer.dto.ts
│   └── question-query.dto.ts
├── enums/
│   ├── question-category.enum.ts
│   ├── question-status.enum.ts
│   └── question-visibility.enum.ts
├── guards/
│   └── question-visibility.guard.ts
├── qna.controller.ts (7개 엔드포인트)
├── qna-admin.controller.ts (5개 엔드포인트)
├── qna.service.ts
└── qna.module.ts
```

#### 5. 기술적 특징

- **Type Safety**: Prisma로 엄격한 타입 안정성 보장
- **Soft Delete**: 데이터 복구 가능성을 위한 논리 삭제
- **Transaction**: 답변 작성 시 상태 변경을 트랜잭션으로 처리
- **Guard 패턴**: 권한 검증을 재사용 가능한 Guard로 구현
- **Notification Integration**: 기존 알림 시스템과 완벽 통합
- **API Documentation**: Swagger 자동 문서화 완료

---

**작성일**: 2025-12-29
**구현 완료일**: 2025-12-29
