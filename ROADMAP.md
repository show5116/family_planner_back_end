# Family Planner Backend - ROADMAP

## 📋 프로젝트 개요

가족 플래너 시스템을 위한 NestJS 백엔드 REST API입니다.

### 기술 스택
- **Framework**: NestJS v11
- **Language**: TypeScript v5.7
- **Database**: MySQL (Prisma ORM v6.19)
- **Authentication**: JWT (passport-jwt)
- **Testing**: Jest v30

---

## 🎯 Phase 1: 기반 구축 (완료)

### ✅ 프로젝트 초기 설정
- NestJS 프로젝트 구조 설정
- Prisma ORM 연동
- TypeScript 설정
- 환경 변수 관리

### ✅ 인증/인가 시스템
- LOCAL 인증 (이메일/비밀번호)
- 소셜 로그인 (Google, Kakao)
- JWT 토큰 관리 (RTR 방식)
- 이메일 인증 시스템
- 비밀번호 재설정

---

## 🎯 Phase 2: 핵심 기능 (완료)

### ✅ 그룹 관리
- ✅ 그룹 CRUD
- ✅ 초대 코드 시스템 (8자리 랜덤 코드)
- ✅ 이메일 초대 시스템 (초대 이메일 발송)
- ✅ 가입 요청 관리 (승인/거부)
- ✅ 멤버 관리 (역할 변경, 삭제, 나가기)
- ✅ 그룹장 양도 (OWNER 권한 이전)
- ✅ 개인 색상 설정
- ✅ 역할 체계 (공통 역할 + 그룹별 커스텀 역할)

### ✅ 권한 관리
- ✅ 권한 CRUD (운영자 전용)
- ✅ 권한 카테고리 관리
- ✅ Soft Delete/복원 지원
- ✅ 그룹별 권한 적용 (GroupPermissionGuard)
- ✅ 운영자 권한 시스템 (AdminGuard)
- ✅ PermissionCode enum 기반 타입 안전 관리

---

## 🎯 Phase 3: 협업 기능 (진행 중)

### ✅ 알림 시스템
- ✅ Firebase Cloud Messaging (FCM) 통합
- ✅ FCM 디바이스 토큰 관리 (등록, 삭제)
- ✅ 카테고리별 알림 설정 (SCHEDULE, TODO, HOUSEHOLD, ASSET, CHILDCARE, GROUP, SYSTEM)
- ✅ 알림 히스토리 관리 (조회, 읽음 처리, 삭제)
- ✅ 페이지네이션 지원
- ✅ 다중 디바이스 지원 (iOS, Android, Web)
- ✅ **Two-Track Queue System (Redis 기반 큐 시스템)**
  - ✅ Ready Queue (즉시 발송) - Redis List + BLPOP
  - ✅ Waiting Room (예약 발송) - Redis Sorted Set
  - ✅ 실시간 Worker (0ms 딜레이, 병렬 처리)
  - ✅ Graceful Shutdown 구현
  - ✅ Redis 연결 분리 (BLPOP 전용 클라이언트)
- ✅ Look-Aside Caching (FCM 토큰 캐싱)
- ✅ 공지사항 FCM Topic 발송

### ✅ 프로필 관리
- ✅ 프로필 조회/수정
- ✅ 프로필 이미지 업로드 (Cloudflare R2)

### ⬜ 일정 & 할일 통합 관리
- ⬜ Tasks 테이블 통합 설계 (캘린더 + TODO)
- ⬜ 카테고리 시스템 (이모지 지원)
- ⬜ 우선순위 및 D-Day 관리
- ⬜ 반복 일정 시스템 (스케줄러 자동 생성)
- ⬜ 건너뛰기 및 일시정지 기능
- ⬜ 알림 시스템 연동
- ⬜ 변경 이력 추적
- ⬜ 그룹 공유

### ✅ 공지사항
- ✅ 공지사항 CRUD (목록, 상세, 작성, 수정, 삭제)
- ✅ 카테고리 시스템 (ANNOUNCEMENT, EVENT, UPDATE)
- ✅ 고정 기능 (isPinned)
- ✅ 읽음 확인 기능 (AnnouncementRead)
- ✅ 조회수 추적 (Redis Write-Back)
- ✅ Redis 캐싱 (목록 5분, 상세 7일 TTL)
- ✅ 알림 연동 (FCM Topic 발송, 예약 발송, 자동 복구)
- ✅ E2E 테스트 작성
- ✅ 에디터 이미지 업로드 API (`POST /storage/editor-upload`)

### ⬜ Q&A
- ⬜ 질문/답변 CRUD
- ⬜ 답변 채택 기능
- ⬜ 투표 기능 (좋아요/싫어요)
- ⬜ 카테고리별 분류
- ⬜ 검색 기능
- ⬜ 알림 연동
- ✅ 에디터 이미지 업로드 API (공지사항과 공용)

---

## 🎯 Phase 4: 데이터 관리 기능

### ⬜ 자산 관리
- ⬜ 계좌별 자산 데이터 관리
- ⬜ 원금/수익금 추적
- ⬜ 수익률 계산
- ⬜ 통계 및 분석

### ⬜ 가계부 관리
- ⬜ 지출 내역 등록
- ⬜ 카테고리별 분류
- ⬜ 고정비용 관리
- ⬜ 통계 및 분석

### ⬜ 투자 지표
- ⬜ 외부 API 연동
- ⬜ 지표 데이터 수집
- ⬜ 사용자별 관심 지표 관리

### ⬜ 메모
- ⬜ 메모 CRUD
- ⬜ Markdown/HTML 지원
- ⬜ 카테고리/태그
- ⬜ 그룹 공유

---

## 🎯 Phase 5: 특화 기능

### ⬜ 육아 포인트
- 포인트 지급/사용
- 적금 기능
- 포인트 표 관리
- 규칙 관리
- 히스토리

---

## 🎯 Phase 6: 최적화 및 배포

### ⬜ 성능 최적화
- 쿼리 최적화
- 캐싱 전략
- 페이지네이션
- 인덱싱

### ⬜ 보안 강화
- Rate Limiting
- CORS 설정
- 입력 검증 강화
- 보안 헤더

### ⬜ 모니터링
- 로깅 시스템
- 에러 추적
- 성능 모니터링

### ⬜ 배포
- Docker 컨테이너화
- CI/CD 파이프라인
- Railway 배포
- 백업 전략

---

## 📊 전체 진행률

### 완료된 Phase
- ✅ **Phase 1**: 기반 구축 (100%)
- ✅ **Phase 2**: 핵심 기능 (100%)

### 진행 중인 Phase
- 🟨 **Phase 3**: 협업 기능 (50%)

### Phase 3 주요 성과

#### 2026-01-16: 에디터 이미지 업로드 기능 구현
1. **에디터 이미지 업로드 API** (`POST /storage/editor-upload`)
   - Q&A 및 공지사항 에디터용 이미지 첨부 기능
   - 이미지 최적화 (최대 1200px 너비, JPEG 변환, 품질 85%)
   - PNG 투명 배경 → 흰색 배경 처리 (flatten)
   - 모바일 사진 EXIF 방향 자동 회전 (rotate)
   - 브라우저 캐싱 최적화 (Cache-Control: 1년, immutable)
   - 클라이언트/서버 에러 로그 레벨 분리

#### 2026-01-13: 공지사항 시스템 구현 완료
1. **공지사항 핵심 기능**
   - CRUD + 카테고리 시스템 (ANNOUNCEMENT, EVENT, UPDATE)
   - 고정 기능 (isPinned), 읽음 확인, 조회수 추적
   - Redis 캐싱 (목록 5분, 상세 7일 TTL)
   - Redis Write-Back 전략 (조회수/읽음 처리)
   - N+1 쿼리 최적화 (Promise.all 병렬 처리)

2. **알림 연동 및 예약 발송**
   - FCM Topic 발송 (전체 회원 1회 API 호출)
   - 저녁 6시~오전 9시 자동 예약 (조용한 시간대)
   - 서버 재시작 시 미발송 알림 자동 복구
   - 실패 시 재시도 (최대 3회, 5분 간격)

3. **E2E 테스트**
   - 전체 공지사항 API 테스트 작성 완료
   - ADMIN 권한 검증, Soft Delete 등 모든 시나리오 커버

#### 2026-01-11: Two-Track Queue System 구현
1. **Redis 기반 알림 큐 시스템**
   - Ready Queue (즉시 발송): Redis List + BLPOP
   - Waiting Room (예약 발송): Redis Sorted Set
   - BLPOP 기반 실시간 처리 (0ms 딜레이, Cron 대비 5배 빠름)
   - 병렬 처리 (Concurrency: 5)
   - Graceful Shutdown 구현 (서버 재시작 시 데이터 손실 방지)
   - Redis 연결 분리 (BLPOP 전용 클라이언트)

2. **Look-Aside Caching**
   - FCM 토큰 Redis 캐싱 (TTL: 1시간)
   - 캐시 무효화 전략 (토큰 추가/삭제 시)

3. **공지사항 FCM Topic 발송**
   - 1:N 전체 알림 (100만 명에게 1번 API 호출)
   - DB 저장하지 않는 휘발성 설계

#### 2025-12-28: 알림 시스템 기반 구축
1. **Firebase FCM 통합**
   - Firebase Admin SDK 통합
   - FCM 디바이스 토큰 관리 (등록/삭제, 다중 디바이스 지원)
   - 카테고리별 알림 설정 (7개 카테고리)
   - 알림 히스토리 관리 (페이지네이션, 읽음 처리)
   - 웹/Android/iOS 모든 플랫폼 지원

2. **프로필 관리**
   - 프로필 조회/수정 완료
   - Cloudflare R2 기반 프로필 이미지 업로드 완료

### Phase 2 주요 성과 (2025-12-24)
1. **그룹 관리 시스템**
   - 그룹 생성, 초대, 멤버 관리 전체 구현
   - 초대 코드 + 이메일 초대 이중 방식 지원
   - 그룹장 양도, 개인 색상 설정 등 부가 기능 완료

2. **역할 기반 접근 제어 (RBAC)**
   - 공통 역할 + 그룹별 커스텀 역할 체계
   - PermissionCode enum 기반 타입 안전 권한 관리
   - Guard 기반 권한 검증 (3종: Permission, Owner, Membership)

3. **이메일 시스템**
   - Gmail SMTP (Nodemailer) 연동
   - 이메일 인증, 비밀번호 재설정, 그룹 초대 이메일 발송

### 다음 단계
- 🎯 **Phase 3 계속**: Q&A, 일정 & 할일 통합 관리
- 📋 **우선순위**: Q&A → 일정 & 할일 통합

---

**Last Updated**: 2026-01-16
