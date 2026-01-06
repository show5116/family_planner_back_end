# 02. 그룹 관리 (Groups Management)

> **상태**: ✅ 완료
> **Phase**: Phase 2

---

## 개요

가족, 회사, 친구 등 다양한 그룹을 생성하고 관리하는 시스템입니다. 역할 기반 권한 관리, 초대 시스템, 멤버 관리 기능을 제공합니다.

---

## 핵심 개념

### 구조
- 1명의 사용자는 여러 그룹에 소속 가능
- 그룹별 고유한 8자리 초대 코드
- 역할(Role) 기반 권한 관리

### 색상 정책
- **Default Color**: 그룹 기본 색상
- **Custom Color**: 개인별 커스텀 색상 (우선 적용)

---

## 그룹 CRUD

### 그룹 생성 (`POST /groups`)
- 그룹명, 설명, 기본 색상 입력
- 생성자는 자동으로 OWNER 역할
- 8자리 랜덤 초대 코드 자동 생성 (중복 체크)

### 내 그룹 목록 (`GET /groups`)
- 사용자가 속한 모든 그룹 조회
- 개인 커스텀 색상, 역할, 멤버 수 포함

### 그룹 상세 (`GET /groups/:id`)
- 멤버만 조회 가능
- 전체 멤버 목록 및 역할 정보 포함

### 수정/삭제
- **수정** (`PATCH /groups/:id`): UPDATE 권한 필요
- **삭제** (`DELETE /groups/:id`): DELETE 권한 필요, Cascade 삭제
- **그룹장 양도** (`POST /groups/:id/transfer-ownership`): OWNER → 다른 멤버, 기존 OWNER는 ADMIN으로 변경

---

## 초대 시스템

### 초대 코드 방식
- **가입** (`POST /groups/join`):
  - 8자리 코드 입력
  - 이메일 초대인 경우: 즉시 승인 및 멤버 추가
  - 일반 요청: REQUEST 타입으로 PENDING 상태 생성, 관리자 승인 대기

- **코드 재생성** (`POST /groups/:id/regenerate-code`):
  - REGENERATE_INVITE_CODE 권한 필요
  - 중복 검사 후 고유 코드 생성

### 이메일 초대
- **초대** (`POST /groups/:id/invite-by-email`):
  - INVITE_MEMBER 권한 필요
  - 초대 이메일 자동 발송 (초대 코드 포함)
  - 초대 코드 만료 시 자동 재생성

- **취소** (`DELETE /groups/:id/invites/:requestId`): INVITE 타입 PENDING 초대만 취소 가능
- **재전송** (`POST /groups/:id/invites/:requestId/resend`): 초대 이메일 재발송

### 가입 요청 관리
- **목록** (`GET /groups/:id/join-requests`): 상태별 필터링 가능
- **승인** (`POST /groups/:id/join-requests/:requestId/accept`): 멤버로 자동 추가, 기본 역할 부여
- **거부** (`POST /groups/:id/join-requests/:requestId/reject`)

---

## 멤버 관리

### 멤버 목록 (`GET /groups/:id/members`)
- 멤버별 역할, 사용자 정보, 가입일순 정렬

### 개인 색상 설정 (`PATCH /groups/:id/my-color`)
- 그룹 기본 색상 대신 개인 색상 사용

### 역할 변경 (`PATCH /groups/:id/members/:userId/role`)
- ASSIGN_ROLE 권한 필요
- 자신의 역할 변경 불가
- OWNER 역할은 양도만 가능

### 멤버 삭제 (`DELETE /groups/:id/members/:userId`)
- REMOVE_MEMBER 권한 필요
- 자신 및 OWNER 삭제 불가

### 그룹 나가기 (`POST /groups/:id/leave`)
- OWNER는 나갈 수 없음 (양도 또는 삭제 필요)

---

## 역할(Role) 체계

### 공통 역할 (운영자 전용)
- `groupId = null`인 기본 역할
- 운영자만 CRUD 가능
- 모든 그룹에서 사용 가능

기본 역할:
- **OWNER**: 그룹장, 모든 권한 (삭제 불가, 양도만 가능)
- **ADMIN**: 관리자
- **MEMBER**: 일반 멤버

API:
- `GET /roles`: 전체 역할 조회
- `POST /roles`: 공통 역할 생성
- `PATCH /roles/:id`: 수정
- `DELETE /roles/:id`: 삭제

### 그룹별 커스텀 역할 (OWNER 전용)
- 각 그룹마다 고유한 역할 생성 가능
- 예: "가족" 그룹의 "부모", "자녀" 역할

API:
- `GET /groups/:groupId/roles`: 공통 + 커스텀 역할 조회
- `POST /groups/:groupId/roles`: 커스텀 역할 생성
- `PATCH /groups/:groupId/roles/:id`: 수정
- `DELETE /groups/:groupId/roles/:id`: 삭제

---

## 데이터베이스

### Group
```prisma
model Group {
  id           String   @id @default(uuid())
  name         String
  description  String?
  inviteCode   String   @unique
  defaultColor String   @default("#6366F1")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  members      GroupMember[]
}
```

### GroupMember
```prisma
model GroupMember {
  id          String   @id @default(uuid())
  groupId     String
  userId      String
  roleId      String
  customColor String?
  joinedAt    DateTime @default(now())

  @@unique([groupId, userId])
}
```

### Role
```prisma
model Role {
  id              String   @id @default(uuid())
  name            String
  groupId         String?
  isDefaultRole   Boolean  @default(false)
  permissions     Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([name, groupId])
}
```

### GroupJoinRequest
```prisma
model GroupJoinRequest {
  id        String            @id @default(uuid())
  groupId   String
  type      JoinRequestType   @default(REQUEST) // REQUEST, INVITE
  email     String
  status    JoinRequestStatus @default(PENDING) // PENDING, ACCEPTED, REJECTED
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@index([groupId, email, status])
}
```

---

## 구현 상태

### ✅ 완료
- [x] 그룹 생성 (OWNER 자동 할당)
- [x] 그룹 목록 조회 (내 그룹 목록)
- [x] 그룹 상세 조회 (멤버 정보 포함)
- [x] 그룹 수정 (UPDATE 권한)
- [x] 그룹 삭제 (DELETE 권한, Cascade)
- [x] 그룹장 양도 (OWNER → 다른 멤버)
- [x] 8자리 초대 코드 자동 생성
- [x] 초대 코드 재생성
- [x] 초대 코드로 그룹 가입
- [x] 이메일 초대 시스템
- [x] 초대 취소 및 재전송
- [x] 가입 요청 관리 (승인/거부)
- [x] 멤버 목록 조회
- [x] 멤버 역할 변경 (ASSIGN_ROLE 권한)
- [x] 멤버 삭제 (REMOVE_MEMBER 권한)
- [x] 그룹 나가기
- [x] 개인별 커스텀 색상 설정
- [x] 공통 역할 관리 (OWNER, ADMIN, MEMBER)
- [x] 그룹별 커스텀 역할 생성
- [x] 역할 기반 권한 시스템
- [x] 단위 테스트 (39개 통과)
- [x] E2E 테스트 (17개)

### ⬜ TODO / 향후 고려
- [ ] 그룹 프로필 이미지
- [ ] 그룹 설정 (비공개/공개)
- [ ] 그룹 검색 기능
- [ ] 멤버 초대 이력
- [ ] 그룹 활동 로그

---

## API 엔드포인트

### 그룹 관리
| Method | Endpoint                                      | 설명                | 권한               |
| ------ | --------------------------------------------- | ------------------- | ------------------ |
| POST   | `/groups`                                     | 그룹 생성           | JWT                |
| GET    | `/groups`                                     | 내 그룹 목록        | JWT                |
| GET    | `/groups/:id`                                 | 그룹 상세           | JWT, Member        |
| PATCH  | `/groups/:id`                                 | 그룹 수정           | JWT, UPDATE        |
| DELETE | `/groups/:id`                                 | 그룹 삭제           | JWT, DELETE        |
| POST   | `/groups/join`                                | 초대 코드로 가입    | JWT                |
| POST   | `/groups/:id/regenerate-code`                 | 초대 코드 재생성    | JWT, INVITE_MEMBER |
| POST   | `/groups/:id/invite-by-email`                 | 이메일로 초대       | JWT, INVITE_MEMBER |
| DELETE | `/groups/:id/invites/:requestId`              | 초대 취소           | JWT, INVITE_MEMBER |
| POST   | `/groups/:id/invites/:requestId/resend`       | 초대 재전송         | JWT, INVITE_MEMBER |
| GET    | `/groups/:id/join-requests`                   | 가입 요청 목록 조회 | JWT, INVITE_MEMBER |
| POST   | `/groups/:id/join-requests/:requestId/accept` | 가입 요청 승인      | JWT, INVITE_MEMBER |
| POST   | `/groups/:id/join-requests/:requestId/reject` | 가입 요청 거부      | JWT, INVITE_MEMBER |
| POST   | `/groups/:id/leave`                           | 그룹 나가기         | JWT                |
| GET    | `/groups/:id/members`                         | 멤버 목록           | JWT, Member        |
| PATCH  | `/groups/:id/members/:userId/role`            | 멤버 역할 변경      | JWT, MANAGE_MEMBER |
| DELETE | `/groups/:id/members/:userId`                 | 멤버 삭제           | JWT, MANAGE_MEMBER |
| PATCH  | `/groups/:id/my-color`                        | 내 색상 설정        | JWT, Member        |
| POST   | `/groups/:id/transfer-ownership`              | OWNER 권한 양도     | JWT, OWNER         |

### 역할 관리
| Method | Endpoint                                 | 설명                         | 권한         |
| ------ | ---------------------------------------- | ---------------------------- | ------------ |
| GET    | `/roles`                                 | 공통 역할 조회               | JWT, Admin   |
| POST   | `/roles`                                 | 공통 역할 생성               | JWT, Admin   |
| PATCH  | `/roles/:id`                             | 공통 역할 수정               | JWT, Admin   |
| DELETE | `/roles/:id`                             | 공통 역할 삭제               | JWT, Admin   |
| GET    | `/groups/:groupId/roles`                 | 그룹별 역할 조회 (공통+커스텀) | JWT, Member  |
| POST   | `/groups/:groupId/roles`                 | 커스텀 역할 생성             | JWT, OWNER   |
| PATCH  | `/groups/:groupId/roles/:id`             | 커스텀 역할 수정             | JWT, OWNER   |
| DELETE | `/groups/:groupId/roles/:id`             | 커스텀 역할 삭제             | JWT, OWNER   |

---

## 테스트

### 단위 테스트 (39개 통과)
- GroupService: 그룹 생성, 조회, 수정, 삭제
- GroupInviteService: 초대 코드, 가입 요청, 이메일 초대
- GroupController: Controller 레이어 검증

### E2E 테스트 (17개 작성)
- 그룹 생성 및 조회 플로우
- 초대 코드 가입 플로우
- 이메일 초대 플로우
- 멤버 관리 플로우

---

**Last Updated**: 2025-12-25
