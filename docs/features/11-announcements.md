# 11. 공지사항 (Announcements)

> **상태**: ⬜ 대기
> **우선순위**: High
> **담당 Phase**: Phase 3

---

## 📋 개요

시스템 운영자(ADMIN)가 전체 회원에게 중요한 소식을 전달하기 위한 공지사항 시스템입니다. 버전 업그레이드, 신기능 안내, 비즈니스 모델 변경 등 플랫폼 전체에 영향을 미치는 내용을 공지합니다.

---

## 🎯 핵심 개념

### 공지사항 특징

- **운영자 전용 작성**: ADMIN 역할만 작성/수정/삭제 가능
- **전체 회원 대상**: 그룹 구분 없이 모든 회원에게 노출
- **고정 기능**: 중요한 공지를 상단에 고정 (pinned)
- **파일 첨부**: 이미지/문서 첨부 지원 (Cloudflare R2)
- **알림 연동**: 새 공지 등록 시 전체 회원에게 푸시 알림 발송 (알림 설정 확인)
- **읽음 확인**: 회원별 읽음 여부 추적

### 주요 유스케이스

1. **버전 업그레이드 알림**: "v2.0 업데이트 안내 - 새로운 기능 추가!"
2. **기능 추가 공지**: "이제 Q&A 기능을 사용할 수 있습니다"
3. **비즈니스 모델 변경**: "요금제 변경 안내"
4. **사용법 안내**: "가족 플래너 200% 활용하기"
5. **중요 공지**: "서버 점검 일정 안내", "개인정보 처리방침 변경"

---

## ⬜ 공지사항 조회

### 공지사항 목록 조회 (`GET /announcements`)

- ⬜ 모든 회원 조회 가능 (JWT 인증)
- ⬜ 페이지네이션 지원 (page, limit)
- ⬜ 고정 공지 우선 정렬 (isPinned DESC → createdAt DESC)
- ⬜ 내가 읽었는지 여부 포함 (isRead)
- ⬜ 읽은 사람 수 포함 (readCount)

**Query Params**:

- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지 크기 (default: 20)
- `pinnedOnly`: 고정 공지만 조회 (default: false)

**관련 파일**:

- [src/announcement/announcement.controller.ts](../../src/announcement/announcement.controller.ts) (예정)
- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 상세 조회 (`GET /announcements/:id`)

- ⬜ 모든 회원 조회 가능
- ⬜ 조회 시 자동 읽음 처리 (AnnouncementRead 레코드 생성)
- ⬜ Soft Delete된 공지는 조회 불가

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

## ⬜ 공지사항 관리 (ADMIN 전용)

### 공지사항 작성 (`POST /announcements`)

- ⬜ ADMIN 권한 필요 (AdminGuard)
- ⬜ 제목, 내용, 고정 여부, 첨부파일 입력
- ⬜ 작성 후 전체 회원에게 알림 발송 (NotificationService)
- ⬜ 알림 카테고리: SYSTEM
- ⬜ 알림 설정이 켜진 사용자만 푸시 알림 수신

**부가 동작**:

- 모든 회원에게 SYSTEM 알림 발송 (NotificationService.sendBroadcastNotification)

**관련 파일**:

- [src/announcement/announcement.controller.ts](../../src/announcement/announcement.controller.ts) (예정)
- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 수정 (`PUT /announcements/:id`)

- ⬜ ADMIN 권한 필요
- ⬜ 제목, 내용, 고정 여부, 첨부파일 수정 가능
- ⬜ Soft Delete된 공지는 수정 불가

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 삭제 (`DELETE /announcements/:id`)

- ⬜ ADMIN 권한 필요
- ⬜ Soft Delete (`deletedAt` 설정)
- ⬜ 읽음 기록은 유지

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 고정/해제 (`PATCH /announcements/:id/pin`)

- ⬜ ADMIN 권한 필요
- ⬜ `isPinned` 토글 (true ↔ false)

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

## 📦 데이터베이스 스키마

### Announcement

| 컬럼        | 타입          | 설명                              | 제약조건      |
| ----------- | ------------- | --------------------------------- | ------------- |
| id          | String (UUID) | 기본 키                           | PK            |
| authorId    | String        | 작성자 ID (ADMIN)                 | FK, NOT NULL  |
| title       | String        | 공지 제목                         | NOT NULL      |
| content     | Text          | 공지 내용 (Markdown 지원)         | NOT NULL      |
| isPinned    | Boolean       | 상단 고정 여부                    | DEFAULT false |
| attachments | Json          | 첨부파일 목록 [{url, name, size}] | Nullable      |
| createdAt   | DateTime      | 작성 시간                         | AUTO          |
| updatedAt   | DateTime      | 수정 시간                         | AUTO          |
| deletedAt   | DateTime      | 삭제 시간 (Soft Delete)           | Nullable      |

**인덱스**:

- `isPinned, createdAt DESC` (고정 공지 우선 정렬)
- `createdAt DESC` (최신순 조회)

### AnnouncementRead

| 컬럼           | 타입          | 설명           | 제약조건     |
| -------------- | ------------- | -------------- | ------------ |
| id             | String (UUID) | 기본 키        | PK           |
| announcementId | String        | 공지사항 ID    | FK, NOT NULL |
| userId         | String        | 읽은 사용자 ID | FK, NOT NULL |
| readAt         | DateTime      | 읽은 시간      | AUTO         |

**Unique**: `(announcementId, userId)`

**인덱스**:

- `announcementId` (공지별 읽은 사람 조회)
- `userId` (사용자별 읽은 공지 조회)

---

## 🛠️ 구현 가이드

### 1. Prisma 스키마 작성

```prisma
model Announcement {
  id          String    @id @default(uuid())
  authorId    String
  title       String    @db.VarChar(200)
  content     String    @db.Text
  isPinned    Boolean   @default(false)
  attachments Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  author User              @relation(fields: [authorId], references: [id])
  reads  AnnouncementRead[]

  @@index([isPinned, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("announcements")
}

model AnnouncementRead {
  id             String    @id @default(uuid())
  announcementId String
  userId         String
  readAt         DateTime  @default(now())

  announcement Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id])

  @@unique([announcementId, userId])
  @@index([announcementId])
  @@index([userId])
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
  guards/
    admin.guard.ts  // ADMIN 권한 검증
  announcement.controller.ts
  announcement.service.ts
  announcement.module.ts
```

### 3. 핵심 비즈니스 로직

#### 공지사항 목록 조회 (고정 공지 우선)

- 고정 공지 우선 정렬: `orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]`
- 사용자별 읽음 여부 포함: `reads` 관계 조회 후 `isRead` 계산
- 읽은 사람 수 계산: `readCount = reads.length`

#### 공지사항 상세 조회 + 자동 읽음 처리

- `upsert`를 사용하여 이미 읽은 경우 중복 레코드 방지
- `@@unique([announcementId, userId])` 제약조건 활용

#### 공지사항 작성 + 전체 알림 발송

- SYSTEM 알림이 켜진 모든 사용자 조회
- 배치로 알림 발송 (`Promise.allSettled`)
- 알림 발송 실패 시에도 공지 작성은 성공

---

## 📝 API 엔드포인트

| Method | Endpoint                 | 설명               | Guard      |
| ------ | ------------------------ | ------------------ | ---------- |
| GET    | `/announcements`         | 공지사항 목록 조회 | JWT        |
| GET    | `/announcements/:id`     | 공지사항 상세 조회 | JWT        |
| POST   | `/announcements`         | 공지사항 작성      | JWT, Admin |
| PUT    | `/announcements/:id`     | 공지사항 수정      | JWT, Admin |
| DELETE | `/announcements/:id`     | 공지사항 삭제      | JWT, Admin |
| PATCH  | `/announcements/:id/pin` | 공지사항 고정/해제 | JWT, Admin |

---

## 🧪 테스트 시나리오

### 단위 테스트

- [ ] 공지사항 목록 조회 (고정 공지 우선 정렬)
- [ ] 공지사항 상세 조회 + 자동 읽음 처리
- [ ] 읽은 공지 재조회 시 중복 읽음 레코드 생성 안함
- [ ] ADMIN이 공지 작성 + 전체 알림 발송
- [ ] 일반 사용자가 공지 작성 시도 → 403 Forbidden
- [ ] 공지 고정/해제
- [ ] 공지 삭제 (Soft Delete)

### E2E 테스트

- [ ] 사용자가 공지 목록 조회 → 고정 공지 상단 표시
- [ ] 사용자가 공지 상세 조회 → 읽음 처리 확인
- [ ] ADMIN이 공지 작성 → SYSTEM 알림 켜진 사용자만 푸시 알림 수신
- [ ] 일반 사용자가 공지 작성 시도 → 403 Forbidden
- [ ] ADMIN이 공지 수정/삭제 성공

---

## 🚀 향후 개선 사항

- [ ] 공지사항 카테고리 추가 (공지, 이벤트, 점검, 업데이트 등)
- [ ] 공지사항 예약 발행 (scheduledAt 필드)
- [ ] 공지사항 댓글 기능
- [ ] 공지사항 좋아요 기능
- [ ] 공지사항 검색 기능
- [ ] 읽지 않은 공지 개수 API
- [ ] 이메일로도 공지 발송 (중요 공지)

---

## 📝 구현 체크리스트

- [ ] Prisma 스키마 작성 (Announcement, AnnouncementRead)
- [ ] AnnouncementModule 생성
- [ ] AnnouncementService 구현
  - [ ] 공지 목록 조회 (고정 우선 정렬)
  - [ ] 공지 상세 조회 (자동 읽음 처리)
  - [ ] 공지 작성 + 전체 알림 발송
  - [ ] 공지 수정
  - [ ] 공지 삭제 (Soft Delete)
  - [ ] 공지 고정/해제
- [ ] AnnouncementController 구현
- [ ] AdminGuard 구현
- [ ] DTO 작성
- [ ] Swagger 문서화
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성
- [ ] 데이터베이스 마이그레이션

---

**작성일**: 2025-12-29
