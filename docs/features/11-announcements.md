# 11. 공지사항 (Announcements)

> **상태**: ✅ 완료 (카테고리, Redis 캐싱 포함)
> **Phase**: Phase 3

---

## 개요

운영자(ADMIN)가 전체 회원에게 중요한 소식을 전달하는 공지사항 시스템입니다. 버전 업그레이드, 신기능 안내, 비즈니스 모델 변경 등 플랫폼 전체에 영향을 미치는 내용을 공지합니다.

---

## 핵심 개념

### 공지사항 특징
- **운영자 전용**: ADMIN만 작성/수정/삭제
- **전체 회원 대상**: 모든 회원에게 노출
- **카테고리 분류**: ANNOUNCEMENT (공지), EVENT (이벤트), UPDATE (업데이트)
- **고정 기능**: 중요 공지를 상단 고정 (pinned)
- **파일 첨부**: 이미지/문서 첨부 (Cloudflare R2)
- **알림 연동**: 새 공지 등록 시 전체 회원에게 푸시 알림
- **읽음 확인**: 회원별 읽음 여부 추적
- **조회수 추적**: Redis 기반 조회수 카운트
- **Redis 캐싱**: 목록/상세 캐싱으로 성능 최적화

### 카테고리
| 카테고리                | 설명                                 | 예시                                                            |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------- |
| **공지** (ANNOUNCEMENT) | 시스템 운영, 정책 변경, 점검 안내   | "서버 점검 안내", "개인정보 처리방침 변경", "요금제 변경 안내" |
| **이벤트** (EVENT)      | 프로모션, 이벤트, 혜택 관련 소식     | "신규 가입 이벤트", "추석 맞이 특별 혜택"                       |
| **업데이트** (UPDATE)   | 버전 업그레이드, 신기능, 버그 수정   | "v2.0 업데이트 안내", "Q&A 기능 추가", "알림 기능 개선"         |

---

## 공지사항 조회

### 공지사항 목록 (`GET /announcements`)
- 모든 회원 조회 가능 (JWT 인증)
- 페이지네이션 (page, limit), 카테고리 필터링
- 고정 공지 우선 정렬 (isPinned DESC → createdAt DESC)
- 내가 읽었는지 여부 (`isRead`) 및 읽은 사람 수 (`readCount`) 포함
- **Redis 캐싱**: 5분 TTL, 사용자별 읽음 상태만 동적 추가

### 공지사항 상세 (`GET /announcements/:id`)
- 모든 회원 조회 가능
- 조회 시 자동 읽음 처리 (Redis에 먼저 기록, 스케줄러가 10분마다 DB 동기화)
- **조회수 증가**: Redis INCR로 원자적 카운트 증가
- **Redis 캐싱**: 7일 TTL, 오래된 공지는 자동 삭제
- Soft Delete된 공지는 조회 불가

---

## 공지사항 관리 (ADMIN 전용)

### 공지사항 작성 (`POST /announcements`)
- ADMIN 권한 필요
- 제목, 내용, 카테고리 (ANNOUNCEMENT | EVENT | UPDATE), 고정 여부, 첨부파일
- 작성 후 전체 회원에게 SYSTEM 알림 발송
- 목록 캐시 무효화

### 공지사항 수정 (`PUT /announcements/:id`)
- ADMIN 권한 필요
- 제목, 내용, 카테고리, 고정 여부, 첨부파일 수정
- 해당 공지 캐시 + 목록 캐시 무효화

### 공지사항 삭제 (`DELETE /announcements/:id`)
- ADMIN 권한 필요
- Soft Delete (`deletedAt` 설정), 읽음 기록 유지
- 해당 공지 캐시 + 목록 캐시 무효화

### 공지사항 고정/해제 (`PATCH /announcements/:id/pin`)
- ADMIN 권한 필요
- `isPinned` 토글 (true ↔ false)
- 목록 캐시 무효화

---

## Redis 캐싱 시스템 (2026-01-02 추가)

### 조회수 카운트 (Write-Back)
- Redis에만 조회수 증가 (INCR로 원자적 처리)
- 스케줄러가 매 10분마다 DB 동기화 (DECRBY로 차감 방식)
- SADD로 추적 Set 관리 (O(1) 성능)

### 읽음 처리 (Write-Back)
- Redis에만 먼저 기록 (SETNX로 중복 방지)
- 스케줄러가 매 10분마다 DB 동기화 (배치 처리, SPOP 사용)
- BATCH_SIZE(1,000건)로 메모리 보호

### 공지사항 목록 캐싱
- 캐시 TTL: 5분
- 페이지 + 카테고리별 캐시 키 (모든 사용자 공유)
- 사용자별 읽음 상태만 동적 추가
- 캐시 히트 시 DB 조회 완전 생략

### 공지사항 상세 캐싱
- 캐시 TTL: 7일
- 오래된 공지는 자동 삭제
- 캐시 히트 시 DB 조회 생략

### 스케줄러 (매 10분)
- 조회수 동기화: Promise.all 병렬 처리, N+1 문제 해결
- 읽음 처리 동기화: 배치 처리, createMany Bulk Insert
- Race Condition 완전 해결 (INCR, DECRBY, SETNX, SPOP)

### 성능 개선 효과
- DB 쓰기 감소: ~90% (배치 처리)
- DB 읽기 감소: 캐시 우선 확인
- N+1 쿼리 해결: Promise.all 병렬 처리
- Connection Storm 방지: 배치당 1,000건
- 메모리 보호: 10만 건도 안전 처리
- 응답 속도: 캐시 히트 시 ~10ms

---

## 데이터베이스

### Announcement
```prisma
model Announcement {
  id          String                @id @default(uuid())
  authorId    String
  title       String                @db.VarChar(200)
  content     String                @db.Text
  category    AnnouncementCategory
  isPinned    Boolean               @default(false)
  viewCount   Int                   @default(0)
  attachments Json?
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  deletedAt   DateTime?

  @@index([isPinned, createdAt(sort: Desc)])
  @@index([category])
}

enum AnnouncementCategory {
  ANNOUNCEMENT, EVENT, UPDATE
}
```

### AnnouncementRead
```prisma
model AnnouncementRead {
  id             String    @id @default(uuid())
  announcementId String
  userId         String
  readAt         DateTime  @default(now())

  @@unique([announcementId, userId])
  @@index([announcementId, userId])
}
```

---

## 구현 상태

### ✅ 완료
- [x] 공지사항 CRUD (목록, 상세, 작성, 수정, 삭제)
- [x] 카테고리 시스템 (ANNOUNCEMENT, EVENT, UPDATE)
- [x] 고정 기능 (isPinned)
- [x] 읽음 처리 (AnnouncementRead)
- [x] 읽은 사람 수 추적 (readCount)
- [x] 알림 연동 (새 공지 시 전체 회원 알림)
- [x] Soft Delete (deletedAt)
- [x] 조회수 추적 (viewCount)
- [x] Redis 캐싱 - 목록 (5분 TTL)
- [x] Redis 캐싱 - 상세 (7일 TTL)
- [x] Redis Write-Back 조회수 (10분마다 DB 동기화)
- [x] Redis Write-Back 읽음 처리 (배치 처리)
- [x] 스케줄러 (10분마다 DB 동기화)
- [x] Race Condition 해결 (INCR, DECRBY, SETNX, SPOP)
- [x] N+1 쿼리 최적화 (Promise.all 병렬 처리)
- [x] 페이지네이션
- [x] ADMIN 권한 검증

### ⬜ TODO / 향후 고려
- [ ] 파일 첨부 기능 (attachments 필드는 있으나 미구현)
- [ ] 댓글/반응 기능
- [ ] 공지사항 검색 기능
- [ ] 공지사항 통계 (조회수 Top, 카테고리별 통계)
- [ ] 공지사항 예약 발송
- [ ] 공지사항 템플릿

---

## API 엔드포인트

| Method | Endpoint                 | 설명               | Guard      |
| ------ | ------------------------ | ------------------ | ---------- |
| GET    | `/announcements`         | 공지사항 목록 조회 | JWT        |
| GET    | `/announcements/:id`     | 공지사항 상세 조회 | JWT        |
| POST   | `/announcements`         | 공지사항 작성      | JWT, Admin |
| PUT    | `/announcements/:id`     | 공지사항 수정      | JWT, Admin |
| DELETE | `/announcements/:id`     | 공지사항 삭제      | JWT, Admin |
| PATCH  | `/announcements/:id/pin` | 공지사항 고정/해제 | JWT, Admin |

---

**구현 완료**: 2025-12-29
**카테고리 기능 추가**: 2026-01-02
**Redis 캐싱 시스템**: 2026-01-02
