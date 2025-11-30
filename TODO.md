# Family Planner - 기능 명세

> 상태 아이콘: ⬜ 시작 안함 | 🟨 진행 중 | ✅ 완료 | ⏸️ 보류 | ❌ 취소

---

## 🟨 1. 회원 가입 및 로그인

### ✅ LOCAL 인증 (이메일/비밀번호)

#### 회원가입 (`POST /auth/signup`)
- ✅ 이메일, 비밀번호(최소 6자), 이름 입력
- ✅ 이메일 중복 체크
- ✅ bcrypt로 비밀번호 해싱 (salt rounds: 10)
- ✅ 이메일 인증 토큰 생성 (24시간 유효, crypto.randomBytes 32bytes)
- ✅ AWS SES를 통한 인증 이메일 자동 발송
- ✅ 응답: 사용자 정보 (id, email, name, createdAt, isEmailVerified)

#### 이메일 인증 시스템
- ✅ 이메일 인증 (`POST /auth/verify-email`)
  - 토큰 유효성 검증
  - 만료 시간 확인 (24시간)
  - 인증 완료 시 `isEmailVerified = true`
- ✅ 인증 이메일 재전송 (`POST /auth/resend-verification`)
  - 새로운 토큰 생성 및 이메일 재발송
  - 소셜 로그인 사용자는 제외

#### 로그인 (`POST /auth/login`)
- ✅ 이메일/비밀번호 검증
- ✅ 이메일 인증 완료 여부 확인 (LOCAL 로그인만)
- ✅ JWT Access Token (15분) + Refresh Token (7일) 발급
- ✅ Refresh Token은 DB에 저장 (`refresh_tokens` 테이블)
- ✅ 응답: accessToken, refreshToken, 사용자 정보

#### RTR (Refresh Token Rotation) 방식
- ✅ 토큰 갱신 (`POST /auth/refresh`)
  - Refresh Token 유효성 검증 (DB 조회)
  - 만료 및 무효화 여부 확인
  - 기존 Refresh Token 자동 무효화 (`isRevoked = true`)
  - 새로운 Access Token + Refresh Token 쌍 발급
  - 새 Refresh Token DB 저장
- ✅ 다중 Refresh Token 지원 (여러 기기 로그인)
- ✅ Cascade 삭제 설정 (사용자 삭제 시 모든 토큰 삭제)

#### 로그아웃 (`POST /auth/logout`)
- ✅ Refresh Token 무효화 (`isRevoked = true`)
- ✅ 특정 기기만 로그아웃 (해당 Refresh Token만 무효화)

#### 인증 확인
- ✅ 사용자 정보 조회 (`GET /auth/me`)
  - JWT Guard로 보호
  - Bearer Token 필요
  - 응답: userId, email, name
- ✅ JWT Strategy (passport-jwt)
  - Bearer Token 추출
  - Access Token 검증 (15분 만료)
  - 사용자 존재 여부 확인

#### 비밀번호 찾기/재설정
- ✅ 비밀번호 재설정 요청 (`POST /auth/request-password-reset`)
  - 이메일 입력
  - 6자리 인증 코드 생성 (1시간 유효)
  - 이메일로 인증 코드 발송
  - LOCAL 로그인 사용자만 가능
- ✅ 비밀번호 재설정 (`POST /auth/reset-password`)
  - 이메일, 인증 코드, 새 비밀번호 입력
  - 인증 코드 유효성 검증 (1시간)
  - 비밀번호 해싱 후 업데이트
  - 인증 코드 삭제

#### 보안 구현
- ✅ bcrypt 비밀번호 해싱
- ✅ JWT Access Token (기본 15분, `JWT_ACCESS_SECRET` 환경변수)
- ✅ JWT Refresh Token (기본 7일, `JWT_REFRESH_SECRET` 환경변수)
- ✅ 토큰 만료시간 환경변수 설정 가능 (`JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`)
- ✅ 이메일 인증 필수 (LOCAL 로그인)
- ✅ Refresh Token DB 관리 및 무효화 메커니즘

#### 데이터베이스 스키마
- ✅ `User` 테이블
  - id (UUID), email (unique), name, profileImage
  - provider (GOOGLE | KAKAO | APPLE | LOCAL)
  - providerId (소셜 로그인 ID)
  - password (LOCAL만 사용, nullable)
  - isEmailVerified, emailVerificationToken, emailVerificationExpires
  - passwordResetToken, passwordResetExpires (비밀번호 재설정)
  - createdAt, updatedAt
- ✅ `RefreshToken` 테이블
  - id (UUID), token (unique), userId, expiresAt
  - isRevoked (무효화 여부)
  - createdAt
  - User와 1:N 관계 (Cascade 삭제)

### 🟨 소셜 로그인
- ✅ 구글 로그인 (OAuth 2.0)
  - GoogleStrategy 구현 (passport-google-oauth20)
  - GET /auth/google (로그인 시작)
  - GET /auth/google/callback (콜백 처리)
  - 자동 회원가입 및 로그인
- ✅ 카카오 로그인
  - KakaoStrategy 구현 (passport-kakao)
  - GET /auth/kakao (로그인 시작)
  - GET /auth/kakao/callback (콜백 처리)
  - 자동 회원가입 및 로그인
- ⬜ 애플 로그인
- ✅ Provider enum 정의 (GOOGLE, KAKAO, APPLE, LOCAL)
- ✅ User 스키마에 provider, providerId 필드 준비됨
- ✅ Passport 전략 구현 (google, kakao 완료, apple 대기)

#### 비밀번호 설정/변경
- ✅ 비밀번호 설정 (`POST /auth/set-password`)
  - 소셜 로그인 사용자가 비밀번호 설정
  - JWT 인증 필요 (로그인 상태에서만 가능)
  - 비밀번호 설정 후 이메일/비밀번호 로그인 가능
- ✅ 비밀번호 변경 (`POST /auth/change-password`)
  - 현재 비밀번호 확인 후 새 비밀번호로 변경
  - JWT 인증 필요
- ✅ 로그인 로직 개선
  - 소셜 로그인 사용자도 비밀번호 설정 시 이메일/비밀번호 로그인 가능
  - provider와 관계없이 비밀번호가 있으면 로그인 허용

#### 참고사항
- 소셜 로그인 사용자는 기본적으로 비밀번호가 null (선택적으로 설정 가능)
- 소셜 로그인 사용자는 이메일 인증 불필요
- provider + providerId 조합으로 유니크 제약
- 소셜 로그인 + 비밀번호 설정으로 다중 로그인 방법 지원

---

## 🟨 2. 그룹 관리

### 핵심 개념
- **구조**: 1명의 사용자는 여러 그룹에 소속 가능 (가족, 회사, 친구, 연인 등)
- **색상 정책**:
  - Default Color: 그룹장이 정한 그룹 기본 색상
  - Custom Color: 개인이 그룹별로 정한 커스텀 색상 (개인 설정 우선)
- **UI 필터**: 전체 UI에서 그룹별 필터 기능 제공 (일정, ToDo, 메모, 가계부 등)

### 그룹 생성 및 관리
- ✅ 그룹 생성 (`POST /groups`)
  - 그룹명, 설명, 기본 색상 입력
  - 생성자는 자동으로 OWNER(그룹장) 역할 부여 (고정, 삭제 불가)
  - 8자리 랜덤 초대 코드 자동 생성 (영문 대소문자 + 숫자)
- ✅ 내가 속한 그룹 목록 조회 (`GET /groups`)
  - 개인 커스텀 색상 포함
- ✅ 그룹 상세 조회 (`GET /groups/:id`)
  - 멤버만 조회 가능
  - 멤버 목록 포함
- ✅ 그룹 정보 수정 (`PATCH /groups/:id`)
  - OWNER, ADMIN(초대 권한 있는 역할)만 가능
  - 기본 색상 변경 가능
- ✅ 그룹 삭제 (`DELETE /groups/:id`)
  - OWNER만 가능
- ⬜ 그룹장 양도 (`POST /groups/:id/transfer-ownership`)
  - 현재 OWNER만 가능
  - 다른 멤버에게 OWNER 역할 이전
  - 기존 OWNER는 다른 역할로 변경

### 초대 시스템
#### 초대 코드 방식
- ✅ 초대 코드로 그룹 가입 (`POST /groups/join`)
  - 8자리 영문(대소문자 구분) + 숫자 조합 코드 (예: aBc12XyZ)
  - 사용자가 직접 코드 입력
  - 중복 가입 방지
  - 가입 시 is_default_role=true인 역할 자동 부여
- ✅ 초대 코드 재생성 (`POST /groups/:id/regenerate-code`)
  - 초대 권한이 있는 역할만 가능 (OWNER, ADMIN 등)
  - 백엔드에서 중복 검사 후 고유 코드 생성
  - 보안을 위해 코드 재발급 가능

#### 이메일 초대 방식 (신규)
- ⬜ 이메일로 초대 (`POST /groups/:id/invite-by-email`)
  - 초대 권한이 있는 역할만 가능
  - 초대할 사용자 이메일 입력
  - 시스템에서 초대 이메일 자동 발송 (초대 코드 포함)
  - 수신자는 이메일의 초대 코드로 가입

#### 향후 고려사항
- ⏸️ 카카오톡/문자로 초대 메시지 발송 기능

### 멤버 관리
- ✅ 그룹 멤버 목록 조회 (`GET /groups/:id/members`)
  - 멤버별 역할 정보 포함
- ⬜ 개인 그룹 색상 설정 (`PATCH /groups/:id/my-color`)
  - 그룹의 기본 색상 대신 개인이 설정한 색상 사용
  - 미설정 시 그룹 기본 색상 사용
- ⬜ 멤버 역할 변경 (`PATCH /groups/:id/members/:userId/role`)
  - OWNER만 가능
  - 자신의 역할은 변경 불가
  - OWNER 역할은 양도만 가능 (변경 불가)
- ✅ 멤버 삭제 (`DELETE /groups/:id/members/:userId`)
  - OWNER, ADMIN만 가능
  - 자신은 삭제 불가 (나가기 사용)
  - OWNER는 삭제 불가 (양도만 가능)
- ✅ 그룹 나가기 (`POST /groups/:id/leave`)
  - OWNER는 나갈 수 없음 (권한 양도 또는 그룹 삭제 필요)

### 역할(Role) 체계
#### 공통 역할 (group_id = null)
- ⬜ OWNER: 그룹장, 모든 권한 (그룹 생성 시 자동 부여, 삭제 불가, 양도만 가능)
- ⬜ ADMIN: 관리자, 초대 권한 포함 (그룹 수정, 멤버 관리, 초대 코드 재생성, 이메일 초대)
- ⬜ MEMBER: 일반 멤버, 조회만 가능

#### 그룹별 커스텀 역할 (group_id 지정)
- ⬜ 각 그룹마다 고유한 역할 생성 가능
- ⬜ `is_default_role` 플래그로 초대 시 자동 부여 역할 지정
- ⬜ 예: "가족" 그룹의 "부모", "자녀" 역할 / "회사" 그룹의 "팀장", "팀원" 역할

#### 권한 설정
- ⬜ 역할별 세부 권한 정의 (조회, 생성, 수정, 삭제, 초대 등)
- ⬜ 그룹장(OWNER)은 역할 생성 및 권한 편집 가능

### 데이터베이스 스키마
- ⬜ `Group` 테이블 (수정 필요)
  - id, name, description, inviteCode (unique, 8자리 영문+숫자)
  - defaultColor (그룹 기본 색상, 예: #FF5733)
  - createdAt, updatedAt
- ⬜ `GroupMember` 테이블 (수정 필요)
  - id, groupId, userId, roleId (Role 테이블 참조)
  - customColor (개인 설정 색상, nullable)
  - joinedAt
  - 복합 unique 제약: (groupId, userId)
- ⬜ `Role` 테이블 (신규)
  - id, name, groupId (nullable, null이면 공통 역할)
  - is_default_role (초대 시 자동 부여 여부)
  - permissions (JSON 또는 별도 테이블로 권한 관리)
  - createdAt, updatedAt
  - unique 제약: (name, groupId)

### 변경 사항 요약
#### 이전 설계 대비 변경점
1. **역할 시스템 확장**: 고정 enum(OWNER, ADMIN, MEMBER) → 유연한 Role 테이블
2. **색상 정책 추가**: 그룹 기본 색상 + 개인 커스텀 색상
3. **초대 방식 확장**: 초대 코드만 → 초대 코드 + 이메일 초대 병행
4. **그룹장 관리**: 삭제 불가 명시, 양도 기능 추가
5. **초대 코드 정책**: 재생성 시 중복 검사 명시

#### 새로 추가된 기능
1. UI 그룹 필터 기능 (전체 메뉴 적용)
2. 개인별 그룹 색상 커스터마이징
3. 이메일 초대 기능
4. 역할별 is_default_role 설정
5. 그룹별 커스텀 역할 생성
6. 그룹장 양도 기능

### 향후 활용
- 일정 관리: 그룹 멤버와 일정 공유, 그룹별 필터링
- ToDoList: 그룹 내 할일 공유 및 협업, 역할별 권한 관리
- 육아 포인트: 부모-자녀 역할 기반 포인트 관리
- 메모: 그룹 멤버와 메모 공유, 역할별 접근 권한
- 가계부: 가족 그룹 내 가계부 공유, 역할별 조회/수정 권한

---

## ⬜ 3. 메인화면

### 메인화면 view 선택
- 메인화면은 고정된 화면이 아닌 여러 view 중에서 선택해서 사용할 수 있게 함
- view는 각 메뉴의 요약을 보여줌
  - 캘린더 일정 view
  - 투자 지표 (나스닥, 코스피, 환율 차트)
  - To Do List view
  - 육아 관련 화면
  - 기타 사용자 정의 view

---

## ⬜ 4. 자산관리 메뉴

### 데이터 입력
- 매달 일정한 날마다 계좌별 자산 데이터 입력
- 추가한 원금 입력
- 수익금 입력 (이자나 주식 수익금)

### 데이터 조회 및 분석
- 계좌별 원금, 수익금, 수익률 표시
- 가족 구성원별 자산 현황
- 전체 원금 및 수익률 통계
- 표 및 차트 형식으로 시각화

---

## ⬜ 5. 투자지표 메뉴

### 제공 지표
- 코스피
- 나스닥
- 금 값
- 금 김치 프리미엄
- VIX 지수
- 원/달러 환율
- 버핏 지수
- 기타 사용자 선택 지표

### 기능
- 사용자가 필요로 하는 투자 지표 선택
- 선택한 지표를 화면으로 쉽게 조회
- 실시간 또는 주기적 업데이트

---

## ⬜ 6. 가계 관리 메뉴

### 가계부 작성
- 일일 지출 내역 입력
- 카테고리별 분류
  - 교통비
  - 식비
  - 여가비
  - 생활비
  - 기타

### 고정비용 관리
- 매달/매년 나가는 고정 금액 등록
- 해당 월 시작 시 자동 계산

### 데이터 분석
- 카테고리별 지출 통계
- 표 및 차트로 시각화
- 월별/연별 비교 분석

---

## ⬜ 7. 일정 관리 메뉴

### 일정 등록
- 당일 일정 등록
- 매년 반복 일정 등록
- 일정 제목, 시간, 장소, 메모 등 상세 정보

### 공유 대상
- 본인만 보기
- 가족 전체 공유
- 특정 인원 선택 공유

### 알람 기능
- 당일 오전(기상시간) 알람
- 1시간 전 알람
- 사용자 정의 시간 알람
- 푸시 알림 지원

---

## ⬜ 8. ToDoList 메뉴

### ToDo 등록
- 할 일 내용 입력
- 완료 예정일 설정
- 우선순위 설정 (높음/보통/낮음)

### 공유 대상
- 본인만 보기
- 가족 전체 공유
- 특정 인원 선택 공유

### Kanban board
- 칸반 보드 형식으로 ToDo 관리
- 드래그 앤 드롭으로 상태 변경

### 상태 관리
- 등록
- 진행 중
- 완료
- Drop
- Hold

---

## ⬜ 9. 육아 포인트 메뉴

### 육아 포인트
- 매달 정해진 금액의 포인트 지급
- 포인트 지급액은 부모가 설정
- 적금 기능
  - 아이가 매달 포인트 적금
  - 적금 시 이자 지급

### 육아 포인트 표
- 부모가 편집 가능
- 포인트 사용 항목 등록
  - 예: TV 30분 더보기 → 10 포인트
  - 예: 장난감 10,000원어치 사기 → 100 포인트
- 항목별 포인트 금액 설정

### 육아 포인트 Rule
- 부모가 편집 가능
- 규칙 위반 시 포인트 차감
- 차감 포인트 설정

### History
- 포인트 적립/사용 내역
- 계좌 이력처럼 조회 가능
- 날짜별 필터링

---

## ⬜ 10. 메모 메뉴

### 메모 등록
- HTML/Markdown 형식 지원
- 에디터를 통한 작성
- 제목 및 본문 입력
- 카테고리/태그 기능

### 메모 공유
- 본인만 보기
- 가족 전체 공유
- 특정 인원 선택 공유

---

## 향후 추가 예정 기능

이 섹션에는 나중에 추가될 수 있는 기능들을 기록합니다.

---

**Last Updated:** 2025-11-20