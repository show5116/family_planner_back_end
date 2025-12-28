# 12. Q&A (Questions and Answers)

> **상태**: ⬜ 대기
> **우선순위**: Medium
> **담당 Phase**: Phase 4

---

## 📋 개요

그룹 내에서 질문을 올리고 답변을 주고받을 수 있는 Q&A 시스템입니다. 가족 구성원 간 소통, 의견 수렴, 투표 등에 활용할 수 있습니다.

---

## 🎯 핵심 개념

### Q&A 특징

- **질문/답변 구조**: 1개의 질문에 여러 답변 가능
- **답변 채택**: 질문 작성자가 베스트 답변 선택 가능
- **투표 기능**: 답변에 좋아요/싫어요 가능
- **카테고리**: 질문 주제별 분류 (일반, 육아, 가계부, 일정 등)
- **검색 기능**: 제목/내용으로 질문 검색
- **알림 연동**: 새 답변 등록 시 질문 작성자에게 알림

### 주요 유스케이스

1. **의견 수렴**: "이번 주말 어디 갈까요?", "저녁 메뉴 추천 받습니다"
2. **정보 공유**: "아이 예방접종 어디서 했어요?", "좋은 유치원 추천 부탁드립니다"
3. **투표/설문**: "명절 장소 투표", "여행지 선택"

---

## 📦 데이터베이스 스키마

### Question

| 컬럼        | 타입          | 설명                        | 제약조건      |
| ----------- | ------------- | --------------------------- | ------------- |
| id          | String (UUID) | 기본 키                     | PK            |
| groupId     | String        | 그룹 ID                     | FK, NOT NULL  |
| authorId    | String        | 작성자 ID                   | FK, NOT NULL  |
| title       | String        | 질문 제목                   | NOT NULL      |
| content     | Text          | 질문 내용 (Markdown 지원)   | NOT NULL      |
| category    | Enum          | 카테고리 (GENERAL, CHILDCARE 등) | NOT NULL      |
| attachments | Json          | 첨부파일 [{url, name, size}] | Nullable      |
| isClosed    | Boolean       | 마감 여부                   | DEFAULT false |
| acceptedAnswerId | String   | 채택된 답변 ID              | FK, Nullable  |
| viewCount   | Int           | 조회수                      | DEFAULT 0     |
| createdAt   | DateTime      | 작성 시간                   | AUTO          |
| updatedAt   | DateTime      | 수정 시간                   | AUTO          |
| deletedAt   | DateTime      | 삭제 시간 (Soft Delete)     | Nullable      |

**인덱스**:

- `groupId, createdAt DESC` (그룹별 최신순 조회)
- `category` (카테고리별 필터링)
- `isClosed` (미해결 질문 조회)

### Answer

| 컬럼       | 타입          | 설명                      | 제약조건     |
| ---------- | ------------- | ------------------------- | ------------ |
| id         | String (UUID) | 기본 키                   | PK           |
| questionId | String        | 질문 ID                   | FK, NOT NULL |
| authorId   | String        | 작성자 ID                 | FK, NOT NULL |
| content    | Text          | 답변 내용 (Markdown 지원) | NOT NULL     |
| attachments| Json          | 첨부파일                  | Nullable     |
| upvotes    | Int           | 좋아요 수                 | DEFAULT 0    |
| downvotes  | Int           | 싫어요 수                 | DEFAULT 0    |
| createdAt  | DateTime      | 작성 시간                 | AUTO         |
| updatedAt  | DateTime      | 수정 시간                 | AUTO         |
| deletedAt  | DateTime      | 삭제 시간 (Soft Delete)   | Nullable     |

**인덱스**:

- `questionId, createdAt DESC` (질문별 답변 조회)

### AnswerVote

| 컬럼     | 타입          | 설명                   | 제약조건     |
| -------- | ------------- | ---------------------- | ------------ |
| id       | String (UUID) | 기본 키                | PK           |
| answerId | String        | 답변 ID                | FK, NOT NULL |
| userId   | String        | 투표자 ID              | FK, NOT NULL |
| voteType | Enum          | 투표 타입 (UP, DOWN)   | NOT NULL     |
| createdAt| DateTime      | 투표 시간              | AUTO         |

**Unique**: `(answerId, userId)` (1인 1표)

---

## 🔌 API 엔드포인트

### 질문 (Questions)

#### 1. 질문 목록 조회

**`GET /groups/:groupId/questions`**

- **권한**: 그룹 멤버 (READ_QUESTION)
- **Query Params**:
  - `page`: 페이지 번호 (default: 1)
  - `limit`: 페이지 크기 (default: 20)
  - `category`: 카테고리 필터 (optional)
  - `isClosed`: 마감 여부 필터 (optional)
  - `search`: 검색어 (제목/내용) (optional)
- **Response**:
  ```typescript
  {
    data: [
      {
        id: string;
        title: string;
        content: string;
        category: QuestionCategory;
        isClosed: boolean;
        answerCount: number;
        viewCount: number;
        hasAcceptedAnswer: boolean;
        author: {
          id: string;
          name: string;
          profileImage: string;
        };
        createdAt: string;
        updatedAt: string;
      }
    ],
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }
  ```

**정렬 규칙**: 최신순 (`createdAt DESC`)

---

#### 2. 질문 상세 조회

**`GET /groups/:groupId/questions/:id`**

- **권한**: 그룹 멤버 (READ_QUESTION)
- **동작**: 조회 시 `viewCount` 증가
- **Response**:
  ```typescript
  {
    id: string;
    title: string;
    content: string;
    category: QuestionCategory;
    attachments: Array<{url: string, name: string, size: number}>;
    isClosed: boolean;
    viewCount: number;
    author: {
      id: string;
      name: string;
      profileImage: string;
    };
    answers: Array<{
      id: string;
      content: string;
      attachments: Array<{url: string, name: string, size: number}>;
      upvotes: number;
      downvotes: number;
      isAccepted: boolean;
      author: {
        id: string;
        name: string;
        profileImage: string;
      };
      myVote?: 'UP' | 'DOWN';  // 내 투표 여부
      createdAt: string;
      updatedAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }
  ```

---

#### 3. 질문 작성

**`POST /groups/:groupId/questions`**

- **권한**: 그룹 멤버 (CREATE_QUESTION)
- **Request Body**:
  ```typescript
  {
    title: string;        // 필수, 1~200자
    content: string;      // 필수, 1~10000자
    category: QuestionCategory;  // 필수
    attachments?: Array<{
      url: string;
      name: string;
      size: number;
    }>;
  }
  ```
- **Response**: 생성된 질문 객체

---

#### 4. 질문 수정

**`PUT /groups/:groupId/questions/:id`**

- **권한**: 본인 작성 글만 수정 가능
- **Request Body**: 작성 API와 동일
- **Response**: 수정된 질문 객체

---

#### 5. 질문 삭제

**`DELETE /groups/:groupId/questions/:id`**

- **권한**: 본인 작성 글만 삭제 가능
- **동작**: Soft Delete (`deletedAt` 설정)
- **Response**: `204 No Content`

---

#### 6. 질문 마감/재개

**`PATCH /groups/:groupId/questions/:id/close`**

- **권한**: 본인 작성 글만 마감 가능
- **Request Body**:
  ```typescript
  {
    isClosed: boolean;
  }
  ```
- **Response**: 수정된 질문 객체

---

### 답변 (Answers)

#### 7. 답변 작성

**`POST /groups/:groupId/questions/:questionId/answers`**

- **권한**: 그룹 멤버 (CREATE_ANSWER)
- **Request Body**:
  ```typescript
  {
    content: string;      // 필수, 1~10000자
    attachments?: Array<{
      url: string;
      name: string;
      size: number;
    }>;
  }
  ```
- **Response**: 생성된 답변 객체
- **부가 동작**:
  - 질문 작성자에게 푸시 알림 발송
  - 알림 카테고리: `GROUP`

---

#### 8. 답변 수정

**`PUT /groups/:groupId/questions/:questionId/answers/:id`**

- **권한**: 본인 작성 답변만 수정 가능
- **Request Body**: 작성 API와 동일
- **Response**: 수정된 답변 객체

---

#### 9. 답변 삭제

**`DELETE /groups/:groupId/questions/:questionId/answers/:id`**

- **권한**: 본인 작성 답변만 삭제 가능
- **동작**: Soft Delete (`deletedAt` 설정)
- **Response**: `204 No Content`

---

#### 10. 답변 채택

**`POST /groups/:groupId/questions/:questionId/answers/:id/accept`**

- **권한**: 질문 작성자만 가능
- **동작**:
  - `Question.acceptedAnswerId` 업데이트
  - 기존 채택 답변 있으면 해제
- **Response**: 수정된 질문 객체
- **부가 동작**:
  - 답변 작성자에게 푸시 알림 발송 ("내 답변이 채택되었습니다")

---

#### 11. 답변 투표 (좋아요/싫어요)

**`POST /groups/:groupId/questions/:questionId/answers/:id/vote`**

- **권한**: 그룹 멤버 (본인 답변은 투표 불가)
- **Request Body**:
  ```typescript
  {
    voteType: 'UP' | 'DOWN';
  }
  ```
- **동작**:
  - 기존 투표 있으면 변경 (UP ↔ DOWN)
  - 같은 타입으로 재투표 시 투표 취소
  - `Answer.upvotes`, `Answer.downvotes` 카운트 업데이트
- **Response**: 수정된 답변 객체

---

## 🔐 권한 정의

### 필요한 Permission 추가

| PermissionCode   | 설명              | 기본 역할   |
| ---------------- | ----------------- | ----------- |
| READ_QUESTION    | 질문 조회         | 모든 멤버   |
| CREATE_QUESTION  | 질문 작성         | 모든 멤버   |
| UPDATE_QUESTION  | 질문 수정         | 작성자 본인 |
| DELETE_QUESTION  | 질문 삭제         | 작성자 본인 |
| CREATE_ANSWER    | 답변 작성         | 모든 멤버   |
| UPDATE_ANSWER    | 답변 수정         | 작성자 본인 |
| DELETE_ANSWER    | 답변 삭제         | 작성자 본인 |
| VOTE_ANSWER      | 답변 투표         | 모든 멤버   |

---

## 📊 Enum 정의

### QuestionCategory

```typescript
export enum QuestionCategory {
  GENERAL = 'GENERAL', // 일반
  CHILDCARE = 'CHILDCARE', // 육아
  HOUSEHOLD = 'HOUSEHOLD', // 가계부
  SCHEDULE = 'SCHEDULE', // 일정
  TODO = 'TODO', // 할일
  ASSET = 'ASSET', // 자산
  ETC = 'ETC', // 기타
}
```

### VoteType

```typescript
export enum VoteType {
  UP = 'UP', // 좋아요
  DOWN = 'DOWN', // 싫어요
}
```

---

## 🛠️ 구현 가이드

### 1. Prisma 스키마 작성

```prisma
enum QuestionCategory {
  GENERAL
  CHILDCARE
  HOUSEHOLD
  SCHEDULE
  TODO
  ASSET
  ETC
}

enum VoteType {
  UP
  DOWN
}

model Question {
  id               String            @id @default(uuid())
  groupId          String
  authorId         String
  title            String            @db.VarChar(200)
  content          String            @db.Text
  category         QuestionCategory
  attachments      Json?
  isClosed         Boolean           @default(false)
  acceptedAnswerId String?           @unique
  viewCount        Int               @default(0)
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  deletedAt        DateTime?

  group          Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  author         User     @relation(fields: [authorId], references: [id])
  answers        Answer[]
  acceptedAnswer Answer?  @relation("AcceptedAnswer", fields: [acceptedAnswerId], references: [id])

  @@index([groupId, createdAt(sort: Desc)])
  @@index([category])
  @@index([isClosed])
  @@map("questions")
}

model Answer {
  id          String    @id @default(uuid())
  questionId  String
  authorId    String
  content     String    @db.Text
  attachments Json?
  upvotes     Int       @default(0)
  downvotes   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  question        Question      @relation(fields: [questionId], references: [id], onDelete: Cascade)
  author          User          @relation(fields: [authorId], references: [id])
  votes           AnswerVote[]
  acceptedByQuestion Question?  @relation("AcceptedAnswer")

  @@index([questionId, createdAt(sort: Desc)])
  @@map("answers")
}

model AnswerVote {
  id        String   @id @default(uuid())
  answerId  String
  userId    String
  voteType  VoteType
  createdAt DateTime @default(now())

  answer Answer @relation(fields: [answerId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id])

  @@unique([answerId, userId])
  @@map("answer_votes")
}
```

### 2. 모듈 구조

```
src/qna/
  dto/
    create-question.dto.ts
    update-question.dto.ts
    create-answer.dto.ts
    update-answer.dto.ts
    vote-answer.dto.ts
    question-response.dto.ts
    answer-response.dto.ts
  enums/
    question-category.enum.ts
    vote-type.enum.ts
  qna.controller.ts
  qna.service.ts
  qna.module.ts
```

### 3. 핵심 비즈니스 로직

#### Service 메서드 예시

```typescript
@Injectable()
export class QnaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 답변 작성 + 질문 작성자에게 알림
   */
  async createAnswer(
    groupId: string,
    questionId: string,
    authorId: string,
    dto: CreateAnswerDto,
  ) {
    // 질문 존재 여부 확인
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, groupId, deletedAt: null },
      include: { author: true },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없습니다');
    }

    if (question.isClosed) {
      throw new BadRequestException('마감된 질문에는 답변할 수 없습니다');
    }

    // 답변 생성
    const answer = await this.prisma.answer.create({
      data: {
        questionId,
        authorId,
        ...dto,
      },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
      },
    });

    // 질문 작성자에게 알림 (본인 제외)
    if (question.authorId !== authorId) {
      await this.notificationService.sendNotification({
        userId: question.authorId,
        category: NotificationCategory.GROUP,
        title: '새로운 답변',
        body: `${answer.author.name}님이 내 질문에 답변했습니다: ${question.title}`,
        data: {
          groupId,
          questionId,
          answerId: answer.id,
          action: 'view_question',
        },
      });
    }

    return answer;
  }

  /**
   * 답변 투표 (좋아요/싫어요)
   */
  async voteAnswer(
    answerId: string,
    userId: string,
    voteType: VoteType,
  ) {
    // 본인 답변인지 확인
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });

    if (answer.authorId === userId) {
      throw new BadRequestException('본인 답변에는 투표할 수 없습니다');
    }

    // 기존 투표 확인
    const existingVote = await this.prisma.answerVote.findUnique({
      where: {
        answerId_userId: { answerId, userId },
      },
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // 같은 타입으로 재투표 → 투표 취소
        await this.prisma.answerVote.delete({
          where: { id: existingVote.id },
        });

        await this.prisma.answer.update({
          where: { id: answerId },
          data: {
            [voteType === VoteType.UP ? 'upvotes' : 'downvotes']: {
              decrement: 1,
            },
          },
        });

        return { message: '투표가 취소되었습니다' };
      } else {
        // 다른 타입으로 변경 (UP ↔ DOWN)
        await this.prisma.answerVote.update({
          where: { id: existingVote.id },
          data: { voteType },
        });

        await this.prisma.answer.update({
          where: { id: answerId },
          data: {
            upvotes: {
              [voteType === VoteType.UP ? 'increment' : 'decrement']: 1,
            },
            downvotes: {
              [voteType === VoteType.DOWN ? 'increment' : 'decrement']: 1,
            },
          },
        });

        return { message: '투표가 변경되었습니다' };
      }
    } else {
      // 새 투표 생성
      await this.prisma.answerVote.create({
        data: { answerId, userId, voteType },
      });

      await this.prisma.answer.update({
        where: { id: answerId },
        data: {
          [voteType === VoteType.UP ? 'upvotes' : 'downvotes']: {
            increment: 1,
          },
        },
      });

      return { message: '투표가 등록되었습니다' };
    }
  }

  /**
   * 답변 채택
   */
  async acceptAnswer(
    groupId: string,
    questionId: string,
    answerId: string,
    userId: string,
  ) {
    // 질문 존재 및 본인 질문인지 확인
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, groupId, authorId: userId, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundException('질문을 찾을 수 없거나 권한이 없습니다');
    }

    // 답변 존재 확인
    const answer = await this.prisma.answer.findFirst({
      where: { id: answerId, questionId, deletedAt: null },
      include: { author: true },
    });

    if (!answer) {
      throw new NotFoundException('답변을 찾을 수 없습니다');
    }

    // 답변 채택 (기존 채택 자동 해제)
    const updatedQuestion = await this.prisma.question.update({
      where: { id: questionId },
      data: { acceptedAnswerId: answerId },
    });

    // 답변 작성자에게 알림 (본인 제외)
    if (answer.authorId !== userId) {
      await this.notificationService.sendNotification({
        userId: answer.authorId,
        category: NotificationCategory.GROUP,
        title: '답변 채택',
        body: `${question.title} 질문에 대한 내 답변이 채택되었습니다!`,
        data: {
          groupId,
          questionId,
          answerId,
          action: 'view_question',
        },
      });
    }

    return updatedQuestion;
  }
}
```

---

## 🧪 테스트 시나리오

### 단위 테스트

- [ ] 질문 목록 조회 (카테고리 필터링)
- [ ] 질문 상세 조회 (조회수 증가 확인)
- [ ] 답변 작성 + 알림 발송
- [ ] 답변 투표 (좋아요/싫어요, 투표 변경, 투표 취소)
- [ ] 답변 채택 + 알림 발송
- [ ] 본인 답변 투표 시도 → 예외 처리
- [ ] 질문 마감 후 답변 작성 시도 → 예외 처리

### E2E 테스트

- [ ] 멤버가 질문 작성 → 다른 멤버가 답변 작성 → 질문 작성자에게 알림 발송
- [ ] 답변 투표 (UP → DOWN → 취소)
- [ ] 질문 작성자가 답변 채택 → 답변 작성자에게 알림 발송
- [ ] 일반 멤버가 다른 사람 질문 삭제 시도 → 403 Forbidden

---

## 🚀 향후 개선 사항

- [ ] 질문 태그 기능 (#육아 #일정 등)
- [ ] 인기 질문 정렬 (답변 수, 투표 수 기준)
- [ ] 질문 북마크 기능
- [ ] 답변 신고 기능
- [ ] 질문 통계 (주간 인기 질문, 활발한 카테고리 등)
- [ ] 질문 구독 (새 답변 알림 받기)
- [ ] 베스트 답변자 배지 시스템
- [ ] 답변 댓글 기능 (중첩 토론)

---

## 📝 구현 체크리스트

- [ ] Prisma 스키마 작성 (Question, Answer, AnswerVote)
- [ ] Enum 정의 (QuestionCategory, VoteType)
- [ ] Permission 추가 (READ_QUESTION, CREATE_QUESTION 등)
- [ ] QnaModule 생성
- [ ] QnaService 구현
  - [ ] 질문 CRUD (목록, 상세, 작성, 수정, 삭제)
  - [ ] 질문 마감/재개
  - [ ] 답변 CRUD
  - [ ] 답변 투표 (좋아요/싫어요, 변경, 취소)
  - [ ] 답변 채택
- [ ] QnaController 구현
- [ ] DTO 작성 (CreateQuestion, CreateAnswer, VoteAnswer 등)
- [ ] Swagger 문서화
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성
- [ ] 데이터베이스 마이그레이션

---

**작성일**: 2025-12-28
