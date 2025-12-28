# 11. 공지사항 (Announcements)

> **상태**: ⬜ 대기
> **우선순위**: Medium
> **담당 Phase**: Phase 4

---

## 📋 개요

그룹 내에서 중요한 소식이나 공지를 전달하기 위한 공지사항 시스템입니다. 그룹 관리자(OWNER/ADMIN 역할)가 작성할 수 있으며, 모든 그룹 멤버가 조회할 수 있습니다.

---

## 🎯 핵심 개념

### 공지사항 특징

- **권한 기반 작성**: OWNER/ADMIN 역할만 작성/수정/삭제 가능
- **그룹 단위**: 각 공지는 특정 그룹에 속함
- **고정 기능**: 중요한 공지를 상단에 고정 (pinned)
- **읽음 확인**: 누가 읽었는지 추적 (optional)
- **파일 첨부**: 이미지/문서 첨부 지원 (Cloudflare R2)
- **알림 연동**: 새 공지 등록 시 그룹 멤버에게 푸시 알림 발송

### 주요 유스케이스

1. **가족 공지**: "이번 주말 가족 모임 안내", "명절 일정 공지"
2. **중요 변경사항**: "그룹 규칙 변경", "새로운 기능 안내"
3. **이벤트 공지**: "생일 파티 초대", "여행 일정 공유"

---

## 📦 데이터베이스 스키마

### Announcement

| 컬럼        | 타입          | 설명                              | 제약조건      |
| ----------- | ------------- | --------------------------------- | ------------- |
| id          | String (UUID) | 기본 키                           | PK            |
| groupId     | String        | 그룹 ID                           | FK, NOT NULL  |
| authorId    | String        | 작성자 ID                         | FK, NOT NULL  |
| title       | String        | 공지 제목                         | NOT NULL      |
| content     | Text          | 공지 내용 (Markdown 지원)         | NOT NULL      |
| isPinned    | Boolean       | 상단 고정 여부                    | DEFAULT false |
| attachments | Json          | 첨부파일 목록 [{url, name, size}] | Nullable      |
| createdAt   | DateTime      | 작성 시간                         | AUTO          |
| updatedAt   | DateTime      | 수정 시간                         | AUTO          |
| deletedAt   | DateTime      | 삭제 시간 (Soft Delete)           | Nullable      |

**인덱스**:

- `groupId, createdAt DESC` (그룹별 최신순 조회)
- `isPinned, createdAt DESC` (고정 공지 우선 정렬)

### AnnouncementRead (Optional - 읽음 확인 기능)

| 컬럼           | 타입          | 설명           | 제약조건     |
| -------------- | ------------- | -------------- | ------------ |
| id             | String (UUID) | 기본 키        | PK           |
| announcementId | String        | 공지사항 ID    | FK, NOT NULL |
| userId         | String        | 읽은 사용자 ID | FK, NOT NULL |
| readAt         | DateTime      | 읽은 시간      | AUTO         |

**Unique**: `(announcementId, userId)`

---

## 🔌 API 엔드포인트

### 1. 공지사항 목록 조회

**`GET /groups/:groupId/announcements`**

- **권한**: 그룹 멤버 (READ_ANNOUNCEMENT)
- **Query Params**:
  - `page`: 페이지 번호 (default: 1)
  - `limit`: 페이지 크기 (default: 20)
  - `pinnedOnly`: 고정 공지만 조회 (default: false)
- **Response**:
  ```typescript
  {
    data: [
      {
        id: string;
        title: string;
        content: string;
        isPinned: boolean;
        attachments: Array<{url: string, name: string, size: number}>;
        author: {
          id: string;
          name: string;
          profileImage: string;
        };
        readCount: number;  // 읽은 사람 수
        isRead: boolean;    // 내가 읽었는지 여부
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

**정렬 규칙**:

1. 고정 공지 (`isPinned=true`) 우선
2. 같은 그룹 내에서 최신순 (`createdAt DESC`)

---

### 2. 공지사항 상세 조회

**`GET /groups/:groupId/announcements/:id`**

- **권한**: 그룹 멤버 (READ_ANNOUNCEMENT)
- **동작**: 조회 시 자동으로 읽음 처리 (AnnouncementRead 레코드 생성)
- **Response**:
  ```typescript
  {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    attachments: Array<{url: string, name: string, size: number}>;
    author: {
      id: string;
      name: string;
      profileImage: string;
    };
    readBy: Array<{        // 읽은 사람 목록
      userId: string;
      userName: string;
      readAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }
  ```

---

### 3. 공지사항 작성

**`POST /groups/:groupId/announcements`**

- **권한**: OWNER/ADMIN 역할 (CREATE_ANNOUNCEMENT)
- **Request Body**:
  ```typescript
  {
    title: string;        // 필수, 1~200자
    content: string;      // 필수, 1~10000자
    isPinned?: boolean;   // 선택, 기본값: false
    attachments?: Array<{
      url: string;        // Cloudflare R2 업로드 URL
      name: string;
      size: number;
    }>;
  }
  ```
- **Response**: 생성된 공지사항 객체
- **부가 동작**:
  - 그룹 멤버 전체에게 푸시 알림 발송 (NotificationService 연동)
  - 알림 카테고리: `GROUP`

---

### 4. 공지사항 수정

**`PUT /groups/:groupId/announcements/:id`**

- **권한**: OWNER/ADMIN 역할 + 본인 작성 글만 수정 가능
- **Request Body**: 작성 API와 동일
- **Response**: 수정된 공지사항 객체

---

### 5. 공지사항 삭제

**`DELETE /groups/:groupId/announcements/:id`**

- **권한**: OWNER/ADMIN 역할 + 본인 작성 글만 삭제 가능
- **동작**: Soft Delete (`deletedAt` 설정)
- **Response**: `204 No Content`

---

### 6. 공지사항 고정/해제

**`PATCH /groups/:groupId/announcements/:id/pin`**

- **권한**: OWNER/ADMIN 역할
- **Request Body**:
  ```typescript
  {
    isPinned: boolean;
  }
  ```
- **Response**: 수정된 공지사항 객체

---

### 7. 읽은 사람 목록 조회

**`GET /groups/:groupId/announcements/:id/readers`**

- **권한**: 그룹 멤버 (READ_ANNOUNCEMENT)
- **Response**:
  ```typescript
  {
    total: number;
    readers: Array<{
      userId: string;
      userName: string;
      profileImage: string;
      readAt: string;
    }>;
  }
  ```

---

## 🔐 권한 정의

### 필요한 Permission 추가

| PermissionCode        | 설명                   | 기본 역할        |
| --------------------- | ---------------------- | ---------------- |
| READ_ANNOUNCEMENT     | 공지사항 조회          | 모든 멤버        |
| CREATE_ANNOUNCEMENT   | 공지사항 작성          | OWNER, ADMIN     |
| UPDATE_ANNOUNCEMENT   | 공지사항 수정          | OWNER, ADMIN     |
| DELETE_ANNOUNCEMENT   | 공지사항 삭제          | OWNER, ADMIN     |
| PIN_ANNOUNCEMENT      | 공지사항 고정/해제     | OWNER, ADMIN     |

---

## 🛠️ 구현 가이드

### 1. Prisma 스키마 작성

```prisma
model Announcement {
  id          String    @id @default(uuid())
  groupId     String
  authorId    String
  title       String    @db.VarChar(200)
  content     String    @db.Text
  isPinned    Boolean   @default(false)
  attachments Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  group  Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  author User   @relation(fields: [authorId], references: [id])
  reads  AnnouncementRead[]

  @@index([groupId, createdAt(sort: Desc)])
  @@index([isPinned, createdAt(sort: Desc)])
  @@map("announcements")
}

model AnnouncementRead {
  id             String   @id @default(uuid())
  announcementId String
  userId         String
  readAt         DateTime @default(now())

  announcement Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])

  @@unique([announcementId, userId])
  @@map("announcement_reads")
}
```

### 2. 모듈 구조

```
src/announcement/
  dto/
    create-announcement.dto.ts
    update-announcement.dto.ts
    announcement-response.dto.ts
    announcement-list-response.dto.ts
  announcement.controller.ts
  announcement.service.ts
  announcement.module.ts
```

### 3. 핵심 비즈니스 로직

#### Service 메서드 예시

```typescript
@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 공지사항 목록 조회 (고정 공지 우선 정렬)
   */
  async findAll(
    groupId: string,
    userId: string,
    query: { page: number; limit: number; pinnedOnly?: boolean },
  ) {
    const where = {
      groupId,
      deletedAt: null,
      ...(query.pinnedOnly && { isPinned: true }),
    };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, profileImage: true } },
          reads: { select: { userId: true } },
        },
        orderBy: [
          { isPinned: 'desc' }, // 고정 공지 우선
          { createdAt: 'desc' }, // 최신순
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements.map((a) => ({
        ...a,
        readCount: a.reads.length,
        isRead: a.reads.some((r) => r.userId === userId),
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 공지사항 작성 + 알림 발송
   */
  async create(
    groupId: string,
    authorId: string,
    dto: CreateAnnouncementDto,
  ) {
    const announcement = await this.prisma.announcement.create({
      data: {
        groupId,
        authorId,
        ...dto,
      },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
      },
    });

    // 그룹 멤버 전체에게 알림 발송
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { not: authorId } }, // 작성자 제외
      select: { userId: true },
    });

    await Promise.all(
      members.map((member) =>
        this.notificationService.sendNotification({
          userId: member.userId,
          category: NotificationCategory.GROUP,
          title: '새로운 공지사항',
          body: `${announcement.author.name}님이 공지를 작성했습니다: ${dto.title}`,
          data: {
            groupId,
            announcementId: announcement.id,
            action: 'view_announcement',
          },
        }),
      ),
    );

    return announcement;
  }

  /**
   * 공지사항 상세 조회 + 자동 읽음 처리
   */
  async findOne(groupId: string, id: string, userId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, groupId, deletedAt: null },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
        reads: {
          include: {
            user: { select: { id: true, name: true, profileImage: true } },
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    // 자동 읽음 처리 (이미 읽은 경우 무시)
    await this.prisma.announcementRead.upsert({
      where: {
        announcementId_userId: { announcementId: id, userId },
      },
      create: { announcementId: id, userId },
      update: {}, // 이미 존재하면 업데이트 안 함
    });

    return {
      ...announcement,
      readBy: announcement.reads.map((r) => ({
        userId: r.user.id,
        userName: r.user.name,
        readAt: r.readAt,
      })),
    };
  }
}
```

---

## 🧪 테스트 시나리오

### 단위 테스트

- [ ] 공지사항 목록 조회 (고정 공지 우선 정렬 확인)
- [ ] 공지사항 작성 + 알림 발송 확인
- [ ] 공지사항 수정 (본인 글만 수정 가능)
- [ ] 공지사항 삭제 (Soft Delete 확인)
- [ ] 읽음 처리 자동화
- [ ] 권한 검증 (ADMIN만 작성 가능)

### E2E 테스트

- [ ] 그룹 멤버가 공지 목록 조회
- [ ] ADMIN이 공지 작성 → 다른 멤버에게 알림 발송
- [ ] 멤버가 공지 상세 조회 → 자동 읽음 처리
- [ ] 일반 멤버가 공지 작성 시도 → 403 Forbidden

---

## 🚀 향후 개선 사항

- [ ] 공지사항 댓글 기능
- [ ] 공지사항 좋아요/반응 기능
- [ ] 공지사항 검색 기능 (제목/내용)
- [ ] 공지사항 카테고리 분류 (일반/긴급/이벤트)
- [ ] 예약 발행 기능 (특정 시간에 자동 공지)
- [ ] 읽지 않은 공지 알림 (주기적 리마인더)
- [ ] 공지사항 템플릿 기능

---

## 📝 구현 체크리스트

- [ ] Prisma 스키마 작성 (Announcement, AnnouncementRead)
- [ ] Permission 추가 (READ_ANNOUNCEMENT, CREATE_ANNOUNCEMENT 등)
- [ ] AnnouncementModule 생성
- [ ] AnnouncementService 구현
  - [ ] 목록 조회 (고정 공지 우선 정렬)
  - [ ] 상세 조회 (자동 읽음 처리)
  - [ ] 작성 (알림 발송)
  - [ ] 수정/삭제
  - [ ] 고정/해제
  - [ ] 읽은 사람 목록 조회
- [ ] AnnouncementController 구현
- [ ] DTO 작성 (Create, Update, Response)
- [ ] Swagger 문서화
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성
- [ ] 데이터베이스 마이그레이션

---

**작성일**: 2025-12-28
