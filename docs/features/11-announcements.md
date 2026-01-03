# 11. 공지사항 (Announcements)

> **상태**: ✅ 완료 (카테고리 기능 추가 완료)
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
- **카테고리 분류**: 공지/이벤트/업데이트로 구분하여 관리
- **고정 기능**: 중요한 공지를 상단에 고정 (pinned)
- **파일 첨부**: 이미지/문서 첨부 지원 (Cloudflare R2)
- **알림 연동**: 새 공지 등록 시 전체 회원에게 푸시 알림 발송 (알림 설정 확인)
- **읽음 확인**: 회원별 읽음 여부 추적

### 카테고리 종류

| 카테고리                | 설명                                             | 예시                                                                     |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| **공지** (ANNOUNCEMENT) | 시스템 운영, 정책 변경, 점검 안내 등 중요한 알림 | "서버 점검 안내", "개인정보 처리방침 변경", "요금제 변경 안내"           |
| **이벤트** (EVENT)      | 프로모션, 이벤트, 혜택 관련 소식                 | "신규 가입 이벤트", "추석 맞이 특별 혜택", "설문조사 참여하고 쿠폰 받기" |
| **업데이트** (UPDATE)   | 버전 업그레이드, 신기능 추가, 버그 수정 안내     | "v2.0 업데이트 안내", "Q&A 기능 추가", "알림 기능 개선"                  |

### 주요 유스케이스

1. **공지**: "서버 점검 일정 안내 (2025-01-15 02:00~04:00)"
2. **공지**: "개인정보 처리방침 변경 안내"
3. **이벤트**: "가족 플래너 1주년 기념 이벤트!"
4. **이벤트**: "친구 초대하고 포인트 받기"
5. **업데이트**: "v2.0 업데이트 - 새로운 캘린더 기능 추가!"
6. **업데이트**: "이제 Q&A 기능을 사용할 수 있습니다"

---

## ✅ 공지사항 조회

### 공지사항 목록 조회 (`GET /announcements`)

- ✅ 모든 회원 조회 가능 (JWT 인증)
- ✅ 페이지네이션 지원 (page, limit)
- ✅ 카테고리 필터링 지원 (category)
- ✅ 고정 공지 우선 정렬 (isPinned DESC → createdAt DESC)
- ✅ 내가 읽었는지 여부 포함 (isRead)
- ✅ 읽은 사람 수 포함 (readCount)

**Query Params**:

- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지 크기 (default: 20)
- `category`: 카테고리 필터 (ANNOUNCEMENT | EVENT | UPDATE, 선택사항)
- `pinnedOnly`: 고정 공지만 조회 (default: false)

**관련 파일**:

- [src/announcement/announcement.controller.ts](../../src/announcement/announcement.controller.ts) (예정)
- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 상세 조회 (`GET /announcements/:id`)

- ✅ 모든 회원 조회 가능
- ✅ 조회 시 자동 읽음 처리 (AnnouncementRead 레코드 생성)
- ✅ Soft Delete된 공지는 조회 불가

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

## ✅ 공지사항 관리 (ADMIN 전용)

### 공지사항 작성 (`POST /announcements`)

- ✅ ADMIN 권한 필요 (AdminGuard)
- ✅ 제목, 내용, 카테고리, 고정 여부, 첨부파일 입력
- ✅ 카테고리는 ANNOUNCEMENT | EVENT | UPDATE 중 선택 (필수)
- ✅ 작성 후 전체 회원에게 알림 발송 (NotificationService)
- ✅ 알림 카테고리: SYSTEM
- ✅ 알림 설정이 켜진 사용자만 푸시 알림 수신

**부가 동작**:

- 모든 회원에게 SYSTEM 알림 발송 (NotificationService.sendBroadcastNotification)

**관련 파일**:

- [src/announcement/announcement.controller.ts](../../src/announcement/announcement.controller.ts) (예정)
- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 수정 (`PUT /announcements/:id`)

- ✅ ADMIN 권한 필요
- ✅ 제목, 내용, 카테고리, 고정 여부, 첨부파일 수정 가능
- ✅ Soft Delete된 공지는 수정 불가

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 삭제 (`DELETE /announcements/:id`)

- ✅ ADMIN 권한 필요
- ✅ Soft Delete (`deletedAt` 설정)
- ✅ 읽음 기록은 유지

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

### 공지사항 고정/해제 (`PATCH /announcements/:id/pin`)

- ✅ ADMIN 권한 필요
- ✅ `isPinned` 토글 (true ↔ false)

**관련 파일**:

- [src/announcement/announcement.service.ts](../../src/announcement/announcement.service.ts) (예정)

---

## 📦 데이터베이스 스키마

### Announcement

| 컬럼        | 타입          | 설명                                   | 제약조건      |
| ----------- | ------------- | -------------------------------------- | ------------- |
| id          | String (UUID) | 기본 키                                | PK            |
| authorId    | String        | 작성자 ID (ADMIN)                      | FK, NOT NULL  |
| title       | String        | 공지 제목                              | NOT NULL      |
| content     | Text          | 공지 내용 (Markdown 지원)              | NOT NULL      |
| category    | Enum          | 카테고리 (ANNOUNCEMENT, EVENT, UPDATE) | NOT NULL      |
| isPinned    | Boolean       | 상단 고정 여부                         | DEFAULT false |
| attachments | Json          | 첨부파일 목록 [{url, name, size}]      | Nullable      |
| createdAt   | DateTime      | 작성 시간                              | AUTO          |
| updatedAt   | DateTime      | 수정 시간                              | AUTO          |
| deletedAt   | DateTime      | 삭제 시간 (Soft Delete)                | Nullable      |

**인덱스**:

- `isPinned, createdAt DESC` (고정 공지 우선 정렬)
- `category` (카테고리별 조회)
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

**AnnouncementCategory Enum**:

```prisma
enum AnnouncementCategory {
  ANNOUNCEMENT  // 공지
  EVENT         // 이벤트
  UPDATE        // 업데이트
}
```

**Announcement 모델**:

```prisma
model Announcement {
  id          String                @id @default(uuid())
  authorId    String
  title       String                @db.VarChar(200)
  content     String                @db.Text
  category    AnnouncementCategory
  isPinned    Boolean               @default(false)
  attachments Json?
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  deletedAt   DateTime?

  author User              @relation(fields: [authorId], references: [id])
  reads  AnnouncementRead[]

  @@index([isPinned, createdAt(sort: Desc)])
  @@index([category])
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
    announcement-query.dto.ts       // category 필터 포함
    announcement-response.dto.ts
  enums/
    announcement-category.enum.ts   // ANNOUNCEMENT, EVENT, UPDATE
  guards/
    admin.guard.ts  // ADMIN 권한 검증
  announcement.controller.ts
  announcement.service.ts
  announcement.module.ts
```

### 3. 핵심 비즈니스 로직

#### 공지사항 목록 조회 (고정 공지 우선)

- 카테고리 필터링: `where: { category: query.category }` (선택사항)
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

- [x] 공지사항 목록 조회 (고정 공지 우선 정렬)
- [x] 공지사항 상세 조회 + 자동 읽음 처리
- [x] 읽은 공지 재조회 시 중복 읽음 레코드 생성 안함
- [x] ADMIN이 공지 작성 + 전체 알림 발송
- [x] 일반 사용자가 공지 작성 시도 → 403 Forbidden
- [x] 공지 고정/해제
- [x] 공지 삭제 (Soft Delete)

### E2E 테스트

- [x] 사용자가 공지 목록 조회 → 고정 공지 상단 표시
- [x] 사용자가 공지 상세 조회 → 읽음 처리 확인
- [x] ADMIN이 공지 작성 → SYSTEM 알림 켜진 사용자만 푸시 알림 수신
- [x] 일반 사용자가 공지 작성 시도 → 403 Forbidden
- [x] ADMIN이 공지 수정/삭제 성공

---

## 🚀 향후 개선 사항

- [ ] 공지사항 예약 발행 (scheduledAt 필드)
- [ ] 공지사항 댓글 기능
- [ ] 공지사항 좋아요 기능
- [ ] 공지사항 검색 기능 (제목, 내용)
- [ ] 읽지 않은 공지 개수 API
- [ ] 이메일로도 공지 발송 (중요 공지)
- [ ] 카테고리별 통계 API (각 카테고리별 공지 개수)

---

## 📝 구현 체크리스트

- [x] Prisma 스키마 수정
  - [x] AnnouncementCategory Enum 추가 (ANNOUNCEMENT, EVENT, UPDATE)
  - [x] Announcement 모델에 category 필드 추가
  - [x] category 인덱스 추가
- [x] AnnouncementCategory Enum 파일 생성
- [x] AnnouncementService 수정
  - [x] 공지 목록 조회 (카테고리 필터링 추가)
  - [x] 공지 작성 (카테고리 필수 입력)
  - [x] 공지 수정 (카테고리 수정 가능)
- [x] AnnouncementController 수정
  - [x] GET /announcements - category 쿼리 파라미터 추가
  - [x] POST /announcements - category 필드 필수
  - [x] PUT /announcements/:id - category 필드 수정 가능
- [x] DTO 수정
  - [x] CreateAnnouncementDto - category 필드 추가 (필수)
  - [x] UpdateAnnouncementDto - category 필드 추가 (선택)
  - [x] AnnouncementQueryDto - category 필터 추가 (선택)
  - [x] AnnouncementResponseDto - category 필드 추가
- [x] Swagger 문서화 업데이트
- [ ] 단위 테스트 업데이트
- [ ] E2E 테스트 업데이트
- [x] 데이터베이스 마이그레이션

---

## 🎉 구현 완료 요약

**최초 완료일**: 2025-12-29
**카테고리 기능 추가 완료일**: 2026-01-02

### 구현된 주요 기능

#### 1. 데이터베이스 스키마

- **Announcement 모델**: 공지사항 정보, 고정 여부, 첨부파일 지원
- **AnnouncementRead 모델**: 읽음 추적 (사용자당 공지별 1회만)
- **Soft Delete**: 데이터 복구를 위한 논리 삭제
- **인덱스**: 고정 공지 우선 정렬을 위한 복합 인덱스

#### 2. API 엔드포인트

**사용자용 API**:

- `GET /announcements` - 공지사항 목록 조회 (고정 공지 우선)
- `GET /announcements/:id` - 공지사항 상세 조회 (자동 읽음 처리)

**관리자용 API** (ADMIN 전용):

- `POST /announcements` - 공지사항 작성 (전체 알림 발송)
- `PUT /announcements/:id` - 공지사항 수정
- `DELETE /announcements/:id` - 공지사항 삭제
- `PATCH /announcements/:id/pin` - 공지사항 고정/해제

#### 3. 핵심 구현 내용

**고정 공지 우선 정렬**:

- `orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]`
- 고정된 공지가 항상 상단에 표시

**자동 읽음 처리**:

- 공지 상세 조회 시 `upsert` 패턴으로 자동 읽음 처리
- `@@unique([announcementId, userId])` 제약으로 중복 방지

**알림 시스템 통합**:

- 공지 작성 시 SYSTEM 알림이 켜진 모든 사용자에게 푸시 알림 발송
- `Promise.allSettled`로 일부 알림 실패 시에도 공지 작성 성공 보장

**읽음 상태 추적**:

- 각 공지마다 읽은 사용자 수(`readCount`) 제공
- 사용자별 읽음 여부(`isRead`) 제공

#### 4. 생성된 파일

```
src/announcement/
├── dto/
│   ├── create-announcement.dto.ts
│   ├── update-announcement.dto.ts
│   ├── pin-announcement.dto.ts
│   └── announcement-query.dto.ts
├── announcement.controller.ts (6개 엔드포인트)
├── announcement.service.ts
└── announcement.module.ts
```

#### 5. 기술적 특징

- **Upsert Pattern**: 읽음 처리에서 중복 레코드 방지
- **Batch Notification**: Promise.allSettled로 안전한 배치 알림 발송
- **Soft Delete**: 삭제된 공지도 데이터베이스에 보관
- **Priority Sorting**: 고정 공지 우선 + 최신순 정렬
- **AdminGuard**: 기존 Guard 재사용으로 일관성 유지
- **API Documentation**: Swagger 자동 문서화 완료

---

### Redis 캐싱 및 조회수 시스템 (2026-01-02 추가)

#### 추가된 기능

**1. 조회수 카운트 (Write-Back 전략)**
- Redis에만 조회수를 증가시키고 DB 부하 감소
- 스케줄러가 매 10분마다 자동으로 DB에 동기화
- 조회수 추적을 위한 Set 자료구조 사용

**2. 읽음 처리 (Write-Back 전략)** ✨ NEW
- 개인별 읽음 상태도 Redis에만 먼저 기록
- 스케줄러가 매 10분마다 자동으로 DB에 동기화
- 즉각적인 DB 업데이트 제거로 부하 대폭 감소

**3. 공지사항 목록 캐싱** ✨ NEW
- 목록 조회 결과를 Redis에 캐싱 (TTL: 5분)
- 사용자 ID + 페이지 + 카테고리별 캐시 키 생성
- 캐시 히트 시 DB 조회 완전 생략

**4. 공지사항 내용 캐싱**
- 공지사항 상세 조회 시 Redis에 캐싱 (TTL: 7일)
- 오래된 공지사항은 TTL로 자동 삭제
- 캐시 히트 시 DB 조회 생략으로 성능 향상

**5. 캐시 무효화 전략**
- 공지사항 수정 시: 해당 공지 캐시 + 목록 캐시 무효화
- 공지사항 삭제 시: 해당 공지 캐시 + 목록 캐시 무효화
- 새 공지 작성 시: 목록 캐시 무효화

**6. 스케줄러 동작**
- Cron 스케줄: 매 10분마다 실행
- **조회수 동기화**: Redis 조회수를 DB에 반영 후 Redis 카운트 초기화
- **읽음 처리 동기화**: Redis 읽음 기록을 DB에 반영 후 Redis 기록 삭제
- 실패한 항목은 로그 기록

#### 수정된 파일
- `prisma/schema.prisma`: viewCount 필드 추가
- `src/redis/redis.service.ts`: 공지사항 전용 Redis 메서드 추가 (목록 캐싱, 읽음 처리 포함)
- `src/announcement/announcement.service.ts`: Redis 캐싱, 조회수, 읽음 처리 로직 추가
- `src/announcement/announcement.scheduler.ts`: 조회수 + 읽음 처리 동기화 스케줄러
- `src/announcement/announcement.module.ts`: 스케줄러 등록

#### 성능 개선 효과
- **DB 쓰기 감소**: 조회수 + 읽음 처리 업데이트가 10분마다 배치로 처리 (~90% 감소)
- **DB 읽기 감소**: 목록 + 상세 조회 시 캐시 우선 확인으로 DB 부하 대폭 감소
- **응답 속도 향상**: Redis 캐시 히트 시 ~10ms 이내 응답
- **확장성 향상**: DB 부하 감소로 더 많은 동시 사용자 지원 가능

---

**작성일**: 2025-12-29
**구현 완료일**: 2025-12-29
**카테고리 기능 추가일**: 2026-01-02
**Redis 캐싱 시스템 추가일**: 2026-01-02
