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

## 🎯 Phase 3: 협업 기능 (완료)

### ✅ 알림 시스템
- ✅ Firebase Cloud Messaging (FCM) 통합
- ✅ FCM 디바이스 토큰 관리 (등록, 삭제)
- ✅ 카테고리별 알림 설정 (SCHEDULE, TODO, HOUSEHOLD, ASSET, CHILDCARE, GROUP, SYSTEM, SAVINGS, WEATHER, FRIDGE)
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

### ✅ 일정 & 할일 통합 관리
- ✅ Tasks 테이블 통합 설계 (캘린더 + TODO)
- ✅ 카테고리 시스템 (이모지 지원)
- ✅ 우선순위 및 D-Day 관리
- ✅ 반복 일정 시스템 (스케줄러 자동 생성)
- ✅ 건너뛰기 및 일시정지 기능
- ✅ 변경 이력 추적
- ✅ 그룹 공유

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

### ✅ Q&A
- ✅ 질문/답변 CRUD
- ✅ 상태 관리 (PENDING, ANSWERED, RESOLVED)
- ✅ 재질문 기능 (ANSWERED → PENDING)
- ✅ 해결완료 처리 (수동/자동)
- ✅ 자동 해결완료 스케줄러 (1주일 경과)
- ✅ 카테고리별 분류
- ✅ 검색 기능
- ✅ 알림 연동 (앱 내 + Discord 웹훅)
- ✅ 에디터 이미지 업로드 API (공지사항과 공용)

### ✅ 그룹 투표
- ✅ 투표 CRUD (목록, 상세, 생성, 삭제)
- ✅ 복수 선택 지원 (`isMultiple`)
- ✅ 익명 투표 지원 (`isAnonymous`)
- ✅ 마감 시각 설정 (`endsAt`)
- ✅ 투표 참여/변경/취소
- ✅ 투표 상태 필터 (ONGOING / CLOSED)
- ✅ 삭제 권한 검증 (작성자 또는 그룹 OWNER)

---

## 🎯 Phase 4: 데이터 관리 기능 (완료)

### ✅ 자산 관리
- ✅ 계좌별 자산 데이터 관리
- ✅ 원금/수익금 추적 및 수익률 계산
- ✅ 통계 및 분석 (유형별 분류, 적립금 연동)
- ✅ 출금 내역 관리

### ✅ 가계부 관리
- ✅ 지출 내역 등록
- ✅ 카테고리별 분류 (COMMUNICATION 포함)
- ✅ 고정비용 자동 스케줄러 (매일 00:05, 날짜 clamp + 중복 방지)
- ✅ 통계 및 분석 (월별/연별)
- ✅ 영수증 업로드 (Cloudflare R2)
- ✅ 예산 설정 및 초과 알림 (개인/그룹/템플릿)
- ✅ 장보기 이력 연동 (`shoppingHistoryId`)

### ✅ 투자 지표
- ✅ 외부 API 연동 (Yahoo Finance, CoinGecko, FRED, BOK, 한국금거래소, CNN Fear & Greed)
- ✅ 스케줄러 기반 자동 수집 (5분~1시간 주기, Redis 분산 락)
- ✅ 지표 목록/상세/히스토리 조회 API
- ✅ 사용자별 즐겨찾기 (등록/해제/순서 변경)
- ✅ 어드민 과거 데이터 초기화 API
- ✅ 24개 지표 (주식/코인/채권/원자재/환율/경제지표/공포탐욕지수)

### ✅ 메모
- ✅ 메모 CRUD
- ✅ Markdown/HTML/Plain 지원
- ✅ 태그, 그룹 공유
- ✅ 핀 기능 (토글, 핀된 목록 조회)
- ✅ 체크리스트 기능 (순서 변경, 체크/언체크, 전체 선택/해제)
- ✅ 첨부파일 지원
- ✅ XSS 방어 (sanitize-html)

### ✅ 날씨
- ✅ GPS 좌표 기반 현재 날씨 조회 (기상청 초단기실황)
- ✅ 단기예보 조회 (향후 3일, 3시간 단위)
- ✅ 미세먼지/초미세먼지 조회 (에어코리아)
- ✅ Lambert 정각원추도법 격자 좌표 변환
- ✅ 날씨 알림 스케줄러 (매 정시, 강수/기온 변화 시 FCM 발송)
- ⬜ AI 연동 날씨 조언 (옷차림, 우산 여부 등)

---

## 🎯 Phase 5: 특화 기능 (완료)

### ✅ 육아 포인트
- ✅ 자녀 프로필 / 포인트 계정 관리
- ✅ 월 포인트 할당 (용돈 협상) + 히스토리
- ✅ 포인트 거래 내역 (shopItemId / ruleId / 직접 입력)
- ✅ 포인트 상점 (CRUD + 수동 순서 정렬)
- ✅ 규칙 관리 PLUS/MINUS/INFO (CRUD + 수동 순서 정렬)
- ✅ 거래 타입: ALLOWANCE/REWARD/BONUS/PENALTY/PURCHASE/CASHOUT/SAVINGS_DEPOSIT/SAVINGS_WITHDRAW/INTEREST
- ✅ 적금 플랜 (생성/조회/중도해지/예상이자 미리보기)
- ✅ 용돈 자동 지급 + 적금 자동 차감 스케줄러
- ✅ 적금 만기 자동 정산 스케줄러
- ✅ 연봉 협상일 알림 스케줄러

### ✅ 냉장고 관리
- ✅ 보관소 CRUD (냉장/냉동/실온, 순서 변경)
- ✅ 냉장고 품목 CRUD + 일괄 등록/수정
- ✅ 수량 변경 + 소진 시 자동 장바구니 등재
- ✅ 자주 사는 항목 CRUD (autoAdd 토글, 순서 변경)
- ✅ 품목 이름 자동완성 (`ItemNameHistory`)
- ✅ 유통기한 프리셋 (글로벌 기본값 + 그룹 커스텀 머지)
- ✅ 유통기한 임박/만료 FCM 알림 스케줄러 (매일 09:00)

### ✅ 스마트 장보기
- ✅ 그룹당 단일 활성 장바구니
- ✅ 장바구니 품목 추가/수정/삭제 + 일괄 처리
- ✅ 장보기 완료 (냉장고 이관 + 가계부 자동 등록, 단일 트랜잭션)
- ✅ 구매 이력 조회 (목록/상세, 페이지네이션)
- ✅ 가계부 ↔ 장보기 이력 양방향 딥링크

### ✅ 미니게임
- ✅ 게임 결과 저장 (사다리타기/룰렛)
- ✅ 그룹별 게임 이력 조회 (페이지네이션, 타입 필터)
- ✅ 이력 삭제 (본인 또는 그룹 관리자)

---

## 🎯 Phase 6: 최적화 및 배포

### ✅ 적립금 관리
- ✅ 적립 목표 CRUD (그룹당 여러 목표 동시 운영)
- ✅ 자동 적립 스케줄러 (매일 00:10, depositDay 기반, Redis 분산 락)
- ✅ 수동 입금 / 출금 (잔액 초과 시 400)
- ✅ 목표 달성률 계산 및 내역 조회 (페이지네이션)
- ✅ 자동 적립 일시 중지 / 재개
- ✅ 자산 통계 연동 (`includeInAssets`)

### 🟡 구독 관리
- ✅ 구독 상태 조회 / 업데이트 / 복원
- ✅ ADMIN 수동 관리 (tier/만료일 직접 수정, 사용자 목록/상세)
- ⬜ Apple App Store 결제 검증 (StoreKit API)
- ⬜ Google Play 결제 검증 (Play Developer API)
- ⬜ Apple/Google 웹훅 처리

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

| Phase | 상태 | 진행률 |
| ----- | ---- | ------ |
| Phase 1: 기반 구축 | ✅ 완료 | 100% |
| Phase 2: 핵심 기능 | ✅ 완료 | 100% |
| Phase 3: 협업 기능 | ✅ 완료 | 100% |
| Phase 4: 데이터 관리 | ✅ 완료 | 100% |
| Phase 5: 특화 기능 | ✅ 완료 | 100% |
| Phase 6: 최적화 및 배포 | 🟡 진행 중 | 30% (적립금 완료, 구독 기본 완료) |

---

**Last Updated**: 2026-05-26
