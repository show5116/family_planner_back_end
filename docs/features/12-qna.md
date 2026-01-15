# 12. Q&A (Questions and Answers)

> **상태**: ✅ 완료
> **Phase**: Phase 3

---

## 개요

사용자가 운영자(ADMIN)에게 직접 질문하고 답변을 받을 수 있는 1:1 지원 시스템입니다. 버그 신고, 개선 제안, 사용법 문의, 계정 문제 등에 활용되며, 공개/비공개 설정을 통해 정보 공유가 가능합니다.

---

## 핵심 개념

### Q&A 특징
- **사용자 → ADMIN**: 일반 사용자가 질문 작성, ADMIN만 답변
- **공개/비공개**: 질문 작성 시 설정 가능
  - **공개**: 모든 사용자 조회 가능 (작성자명 표시)
  - **비공개**: 작성자와 ADMIN만 조회 가능
- **상태 관리**: PENDING (대기 중), ANSWERED (답변 완료)
- **카테고리**: BUG (버그), FEATURE (개선 제안), USAGE (사용법), ACCOUNT (계정), PAYMENT (결제), ETC (기타)
- **첨부 파일**: 스크린샷, 로그 파일 등
- **알림 연동**:
  - 앱 내 알림: 새 질문 시 ADMIN에게, 답변 시 작성자에게
  - Discord 웹훅: Q&A 전용 채널로 실시간 질문 알림

### 주요 유스케이스
1. **버그 신고**: "앱이 자꾸 종료돼요"
2. **개선 제안**: "이런 기능이 있으면 좋겠어요"
3. **사용법 문의**: "반복 일정은 어떻게 설정하나요?"
4. **계정 문제**: "로그인이 안 돼요"
5. **기타 문의**: "요금제가 궁금해요"

---

## 질문 목록 조회 (통합 API)

### 통합 질문 목록 (`GET /qna/questions`)
- **filter 파라미터로 조회 범위 설정**:
  - `public`: 공개(PUBLIC) 질문만 조회 (기본값)
    - 모든 사용자 조회 가능
    - 작성자 정보 포함
    - 내용 미리보기 100자
  - `my`: 내 질문만 조회 (공개/비공개 모두)
    - 본인 작성 질문만 조회
    - 전체 내용 표시
  - `all`: 모든 질문 조회 (ADMIN 전용)
    - 공개/비공개 모든 질문
    - 작성자 이메일 포함
    - PENDING 우선 정렬 → 최신순

- 공통 기능:
  - 페이지네이션 (page, limit)
  - 상태/카테고리 필터 (status, category)
  - 검색 (search: 제목/내용, filter=all일 때 사용자명 포함)
  - 답변 개수 포함

### 예시
```
GET /qna/questions?filter=public&page=1&limit=20&status=PENDING
GET /qna/questions?filter=my&category=BUG
GET /qna/questions?filter=all&search=로그인  // ADMIN 전용
```

---

## 내 질문 관리

### 질문 상세 (`GET /qna/questions/:id`)
- 공개 질문: 모든 사용자
- 비공개 질문: 본인 또는 ADMIN만
- QuestionVisibilityGuard 적용
- 전체 답변 목록 포함

### 질문 작성 (`POST /qna/questions`)
- 제목 (1~200자), 내용 (1~5000자) 필수
- 카테고리, 공개여부, 첨부파일
- 작성 후 모든 ADMIN에게 SYSTEM 알림
- Discord 웹훅을 통한 실시간 알림 (Q&A 전용 채널)

### 질문 수정 (`PUT /qna/questions/:id`)
- 본인 작성 질문만
- ANSWERED 상태에서는 수정 불가

### 질문 삭제 (`DELETE /qna/questions/:id`)
- 본인 작성 질문만
- Soft Delete, 답변 데이터 유지

---

## ADMIN 기능

### 모든 질문 목록
- **권장**: `GET /qna/questions?filter=all` (통합 API)
- **레거시**: `GET /qna/admin/questions` (하위 호환성 유지)
- ADMIN 권한 필요
- 공개/비공개 모든 질문 조회
- 상태별, 카테고리별 필터
- 검색 (제목/내용/사용자명)
- PENDING 우선 정렬 → 최신순

### 답변 작성 (`POST /qna/questions/:questionId/answers`)
- ADMIN 권한 필요
- 내용 (1~5000자) 필수, 첨부파일 선택
- 답변 작성 시 질문 상태 자동 변경 (PENDING → ANSWERED)
- 질문 작성자에게 SYSTEM 알림

### 답변 수정/삭제
- **수정** (`PUT /qna/questions/:questionId/answers/:id`): 내용, 첨부파일 수정
- **삭제** (`DELETE /qna/questions/:questionId/answers/:id`): Soft Delete

### 통계 조회 (`GET /qna/admin/statistics`)
- ADMIN 권한 필요
- 전체 질문 수, 상태별 개수
- 카테고리별 통계
- 최근 질문 목록 (10개)

---

## 데이터베이스

### Question
```prisma
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

  answers     Answer[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([status, category, visibility])
}

enum QuestionCategory {
  BUG, FEATURE, USAGE, ACCOUNT, PAYMENT, ETC
}

enum QuestionStatus {
  PENDING, ANSWERED
}

enum QuestionVisibility {
  PUBLIC, PRIVATE
}
```

### Answer
```prisma
model Answer {
  id          String    @id @default(uuid())
  questionId  String
  adminId     String
  content     String    @db.Text
  attachments Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([questionId, createdAt(sort: Desc)])
}
```

---

## API 엔드포인트

| Method | Endpoint                                 | 설명                                      | Guard              |
| ------ | ---------------------------------------- | ----------------------------------------- | ------------------ |
| GET    | `/qna/questions?filter={type}`           | **질문 목록 조회 (통합 API)**             | JWT                |
|        | `filter=public`                          | - 공개 질문만 (기본값)                    |                    |
|        | `filter=my`                              | - 내 질문만                               |                    |
|        | `filter=all`                             | - 모든 질문 (ADMIN 전용)                  |                    |
| GET    | `/qna/questions/:id`                     | 질문 상세 조회                            | JWT, Visibility    |
| POST   | `/qna/questions`                         | 질문 작성                                 | JWT                |
| PUT    | `/qna/questions/:id`                     | 질문 수정                                 | JWT                |
| DELETE | `/qna/questions/:id`                     | 질문 삭제                                 | JWT                |
| GET    | `/qna/admin/questions`                   | ~~모든 질문 목록 조회~~ (deprecated)      | JWT, Admin         |
| POST   | `/qna/questions/:questionId/answers`     | 답변 작성                                 | JWT, Admin         |
| PUT    | `/qna/questions/:questionId/answers/:id` | 답변 수정                                 | JWT, Admin         |
| DELETE | `/qna/questions/:questionId/answers/:id` | 답변 삭제                                 | JWT, Admin         |
| GET    | `/qna/admin/statistics`                  | 통계 조회                                 | JWT, Admin         |

---

## QuestionVisibilityGuard

```typescript
@Injectable()
export class QuestionVisibilityGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const questionId = request.params.id;

    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });

    if (!question) throw new NotFoundException();

    // ADMIN은 모든 질문 접근 가능
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.isAdmin) return true;

    // 공개 질문은 누구나 접근 가능
    if (question.visibility === QuestionVisibility.PUBLIC) return true;

    // 비공개 질문은 본인만 접근 가능
    if (question.userId === userId) return true;

    throw new ForbiddenException();
  }
}
```

---

## 구현 상태

### ✅ 완료
- [x] 질문 CRUD (생성, 조회, 수정, 삭제)
- [x] 답변 CRUD (생성, 수정, 삭제)
- [x] 공개/비공개 질문 설정
- [x] 카테고리 시스템 (BUG, FEATURE, USAGE, ACCOUNT, PAYMENT, ETC)
- [x] 상태 관리 (PENDING, ANSWERED)
- [x] QuestionVisibilityGuard (공개/비공개 접근 제어)
- [x] 질문 목록 조회 (통합 API: filter 파라미터)
- [x] 질문 상세 조회 (답변 포함)
- [x] ADMIN 전용 모든 질문 목록 조회
- [x] ADMIN 답변 작성 시 질문 상태 자동 변경
- [x] 알림 연동 (새 질문 시 ADMIN에게, 답변 시 작성자에게)
- [x] Discord 웹훅 연동 (Q&A 전용 채널)
- [x] 페이지네이션
- [x] 검색 기능 (제목/내용/사용자명)
- [x] 상태/카테고리 필터링
- [x] ADMIN 통계 조회
- [x] Soft Delete (deletedAt)
- [x] 첨부파일 지원 (attachments)

### ⬜ TODO / 향후 고려
- [ ] 질문 좋아요/투표 기능
- [ ] 답변 채택 시스템
- [ ] 질문 태그 시스템
- [ ] 자주 묻는 질문 (FAQ) 자동 생성
- [ ] 질문/답변 알림 설정 (카테고리별)
- [ ] 질문 이미지 첨부 (Cloudflare R2)
- [ ] 답변 알림 (이메일 연동)

---

## Discord 웹훅 연동

### 개요
Q&A 질문 등록 시 Discord 전용 채널로 실시간 알림을 전송합니다. Sentry 에러 로그와는 별도의 웹훅을 사용하여 Q&A 전용 채널에 메시지를 전송합니다.

### 설정 방법

#### 1. Discord 웹훅 URL 생성
1. Discord 서버 설정 > 통합 > 웹후크
2. Q&A 전용 채널에서 웹훅 생성
3. 웹훅 URL 복사

#### 2. 환경 변수 설정
`.env` 파일에 Q&A 전용 웹훅 URL 추가:
```env
# Sentry 에러 로그용 웹훅 (에러 알림 채널)
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Q&A 질문 알림용 웹훅 (Q&A 전용 채널)
DISCORD_QNA_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

### 알림 내용

Discord로 전송되는 정보:
- 📬 제목: "새로운 Q&A 질문이 등록되었습니다"
- 질문 제목
- 질문 내용 (200자 미리보기)
- 카테고리 (이모지 포함)
  - 🐛 버그
  - ✨ 개선 제안
  - ❓ 사용법
  - 👤 계정
  - 💳 결제
  - 📌 기타
- 공개 설정 (🌐 공개 / 🔒 비공개)
- 작성자명
- 질문 ID
- 타임스탬프

### 구현 세부사항

**파일 변경:**
- `src/webhook/webhook.service.ts` - `sendQuestionToDiscord()` 메서드 추가
- `src/webhook/webhook.module.ts` - WebhookService export 추가
- `src/qna/qna.module.ts` - WebhookModule import
- `src/qna/qna.service.ts` - 질문 생성 시 Discord 알림 호출

**비동기 처리:**
- Discord 웹훅 전송은 비동기로 처리되어 응답 시간에 영향 없음
- 에러 발생 시 로그만 출력하고 질문 생성은 정상 진행

---

**구현 완료**: 2025-12-29
**Discord 웹훅 추가**: 2026-01-13
