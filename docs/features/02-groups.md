# 02. 그룹 관리 (Groups Management)

> **상태**: ✅ 완료
> **우선순위**: High
> **담당 Phase**: Phase 2

---

## 📋 개요

가족, 회사, 친구, 연인 등 다양한 그룹을 생성하고 관리하는 시스템입니다. 그룹별 색상, 역할, 권한을 지원합니다.

---

## 🎯 핵심 개념

### 구조

- 1명의 사용자는 여러 그룹에 소속 가능
- 각 그룹은 고유한 8자리 초대 코드 보유
- 그룹별로 역할(Role) 기반 권한 관리

### 색상 정책

- **Default Color**: 그룹장이 정한 그룹 기본 색상
- **Custom Color**: 개인이 그룹별로 정한 커스텀 색상 (우선 적용)

### UI 필터

- 전체 UI에서 그룹별 필터 기능 제공
- 일정, ToDo, 메모, 가계부 등 모든 데이터에 적용

---

## ✅ 그룹 생성 및 관리

### 그룹 생성 (`POST /groups`)

- ✅ 그룹명, 설명, 기본 색상 입력
- ✅ 생성자는 자동으로 OWNER(그룹장) 역할 부여
- ✅ 8자리 랜덤 초대 코드 자동 생성 (영문 대소문자 + 숫자)
- ✅ 초대 코드 중복 체크

**관련 파일**:

- [src/group/group.controller.ts](../../src/group/group.controller.ts#L33-L39)
- [src/group/group.service.ts](../../src/group/group.service.ts#L157-L192)

---

### 내가 속한 그룹 목록 조회 (`GET /groups`)

- ✅ 사용자가 속한 모든 그룹 조회
- ✅ 개인 커스텀 색상 포함
- ✅ 내 역할 정보 포함
- ✅ 멤버 수 포함

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L197-L232)

---

### 그룹 상세 조회 (`GET /groups/:id`)

- ✅ 멤버만 조회 가능
- ✅ 전체 멤버 목록 포함
- ✅ 멤버별 역할 및 사용자 정보

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L237-L271)

---

### 그룹 정보 수정 (`PATCH /groups/:id`)

- ✅ UPDATE 권한 필요
- ✅ 그룹명, 설명, 기본 색상 변경 가능

**권한 체크**:

- `checkPermissions(groupId, userId, ['UPDATE'])`

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L276-L308)

---

### 그룹 삭제 (`DELETE /groups/:id`)

- ✅ DELETE 권한 필요 (보통 OWNER만)
- ✅ Cascade 삭제로 멤버십도 함께 삭제

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L313-L321)

---

### ✅ 그룹장 양도 (`POST /groups/:id/transfer-ownership`)

- ✅ 현재 OWNER만 가능
- ✅ 다른 멤버에게 OWNER 역할 이전
- ✅ 기존 OWNER는 ADMIN 역할로 자동 변경

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L193-L214)
- [src/group/group-member.service.ts](../../src/group/group-member.service.ts#L298-L363)

---

## ✅ 초대 시스템

### 초대 코드 방식

#### 초대 코드로 그룹 가입 (`POST /groups/join`)

- ✅ 8자리 영문(대소문자 구분) + 숫자 조합 코드
- ✅ 사용자가 직접 코드 입력
- ✅ 중복 가입 방지
- ✅ **이메일 초대를 받은 경우**: INVITE 타입 요청이 있으면 즉시 승인 및 멤버 추가
- ✅ **일반 가입 요청**: REQUEST 타입으로 GroupJoinRequest 생성 (PENDING 상태)
- ✅ 일반 요청은 관리자(INVITE_MEMBER 권한)의 승인 필요

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L59-L75)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L105-L247)

---

#### 초대 코드 재생성 (`POST /groups/:id/regenerate-code`)

- ✅ REGENERATE_INVITE_CODE 권한 필요
- ✅ 백엔드에서 중복 검사 후 고유 코드 생성
- ✅ 보안을 위해 코드 재발급 가능

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L564-L575)

---

### ✅ 이메일 초대 방식

#### 이메일로 초대 (`POST /groups/:id/invite-by-email`)

- ✅ INVITE_MEMBER 권한 필요
- ✅ 초대할 사용자 이메일 입력
- ✅ 해당 이메일로 가입된 사용자 확인
- ✅ 이미 그룹 멤버인지 확인
- ✅ 초대 코드가 만료된 경우 자동으로 재생성
- ✅ 시스템에서 초대 이메일 자동 발송 (초대 코드 포함)
- ✅ 수신자는 이메일의 초대 코드로 가입

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L166-L189)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L435-L511)
- [src/email/email.service.ts](../../src/email/email.service.ts#L65-L91)

---

#### 초대 취소 (`DELETE /groups/:id/invites/:requestId`)

- ✅ INVITE_MEMBER 권한 필요
- ✅ INVITE 타입의 PENDING 상태 초대만 취소 가능
- ✅ 초대 요청 삭제

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L268-L282)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L513-L548)

---

#### 초대 재전송 (`POST /groups/:id/invites/:requestId/resend`)

- ✅ INVITE_MEMBER 권한 필요
- ✅ INVITE 타입의 PENDING 상태 초대만 재전송 가능
- ✅ 초대 코드가 만료된 경우 자동으로 재생성
- ✅ 초대 이메일 재발송

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L284-L302)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L550-L620)

---

### ✅ 가입 요청 관리

#### 가입 요청 목록 조회 (`GET /groups/:id/join-requests`)

- ✅ INVITE_MEMBER 권한 필요
- ✅ 그룹의 모든 가입 요청 조회
- ✅ status 쿼리 파라미터로 필터링 가능 (PENDING, ACCEPTED, REJECTED)

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L207-L220)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L219-L237)

---

#### 가입 요청 승인 (`POST /groups/:id/join-requests/:requestId/accept`)

- ✅ INVITE_MEMBER 권한 필요
- ✅ PENDING 상태의 가입 요청을 승인
- ✅ 그룹 멤버로 자동 추가
- ✅ 기본 역할 부여

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L222-L236)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L239-L320)

---

#### 가입 요청 거부 (`POST /groups/:id/join-requests/:requestId/reject`)

- ✅ INVITE_MEMBER 권한 필요
- ✅ PENDING 상태의 가입 요청을 거부

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L238-L251)
- [src/group/group-invite.service.ts](../../src/group/group-invite.service.ts#L322-L350)

---

## ✅ 멤버 관리

### 그룹 멤버 목록 조회 (`GET /groups/:id/members`)

- ✅ 멤버만 조회 가능
- ✅ 멤버별 역할 정보 포함
- ✅ 사용자 기본 정보 포함 (id, email, name, profileImage)
- ✅ 가입일순 정렬

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L421-L444)

---

### ✅ 개인 그룹 색상 설정 (`PATCH /groups/:id/my-color`)

- ✅ 멤버십 확인
- ✅ 그룹의 기본 색상 대신 개인이 설정한 색상 사용
- ✅ 미설정 시 그룹 기본 색상 사용

**관련 파일**:

- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts#L119-L134)
- [src/group/group-member.service.ts](../../src/group/group-member.service.ts)

---

### 멤버 역할 변경 (`PATCH /groups/:id/members/:userId/role`)

- ✅ ASSIGN_ROLE 권한 필요
- ✅ 자신의 역할은 변경 불가
- ✅ OWNER 역할은 양도만 가능 (변경 불가)
- ✅ OWNER 역할로는 변경할 수 없음

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L449-L518)

---

### 멤버 삭제 (`DELETE /groups/:id/members/:userId`)

- ✅ REMOVE_MEMBER 권한 필요
- ✅ 자신은 삭제 불가 (나가기 사용)
- ✅ OWNER는 삭제 불가

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L523-L559)

---

### 그룹 나가기 (`POST /groups/:id/leave`)

- ✅ OWNER는 나갈 수 없음 (권한 양도 또는 그룹 삭제 필요)

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L387-L416)

---

## ✅ 역할(Role) 체계

### ✅ 공통 역할 관리 (group_id = null) - 운영자 전용

공통 역할은 모든 그룹에서 사용할 수 있는 기본 역할입니다. 운영자만 CRUD 가능합니다.

#### 역할 전체 조회 (`GET /roles`)

- ✅ 운영자(isAdmin=true) 권한 필요
- ✅ 공통 역할 및 그룹별 역할 조회
- ✅ 필터: `?type=common` (공통 역할만), `?groupId=uuid` (특정 그룹 역할만)

#### 역할 생성 (`POST /roles`)

- ✅ 운영자 권한 필요
- ✅ 역할명, 권한 배열, 기본 역할 여부 설정
- ✅ 공통 역할은 `groupId: null` (자동 설정)
- ✅ `groupId`가 제공된 경우 에러 (그룹별 역할은 다른 엔드포인트 사용)

#### 역할 수정 (`PATCH /roles/:id`)

- ✅ 운영자 권한 필요
- ✅ 역할명, 권한, 기본 역할 여부 수정
- ✅ 공통 역할(`groupId=null`)만 수정 가능
- ✅ OWNER 역할은 수정 불가

#### 역할 삭제 (`DELETE /roles/:id`)

- ✅ 운영자 권한 필요
- ✅ 공통 역할(`groupId=null`)만 삭제 가능
- ✅ OWNER 역할은 삭제 불가
- ✅ 사용 중인 역할 삭제 시 에러

#### 기본 공통 역할

- ✅ **OWNER**: 그룹장, 모든 권한 (그룹 생성 시 자동 부여, 삭제 불가, 양도만 가능)
- ✅ **ADMIN**: 관리자, 초대 권한 포함
- ✅ **MEMBER**: 일반 멤버, 조회만 가능

**관련 파일**:

- [src/role/role.controller.ts](../../src/role/role.controller.ts)
- [src/role/role.service.ts](../../src/role/role.service.ts)
- [src/auth/admin.guard.ts](../../src/auth/admin.guard.ts)

---

### ✅ 그룹별 커스텀 역할 (group_id 지정) - 그룹 OWNER 전용

- ✅ 각 그룹마다 고유한 역할 생성 가능
- ✅ 그룹 OWNER만 생성/수정/삭제 가능
- ✅ `is_default_role` 플래그로 초대 시 자동 부여 역할 지정
- ✅ 예: "가족" 그룹의 "부모", "자녀" 역할
- ✅ 예: "회사" 그룹의 "팀장", "팀원" 역할

#### 그룹별 역할 전체 조회 (`GET /groups/:groupId/roles`)

- ✅ 그룹 멤버만 조회 가능
- ✅ 공통 역할 + 해당 그룹의 커스텀 역할 모두 조회
- ✅ 역할 배정 시 사용할 수 있는 모든 역할 목록 제공

#### 그룹별 역할 생성 (`POST /groups/:groupId/roles`)

- ✅ 그룹 OWNER 권한 필요
- ✅ 역할명 중복 체크 (같은 그룹 내에서)
- ✅ 해당 그룹에만 적용되는 커스텀 역할 생성

#### 그룹별 역할 수정 (`PATCH /groups/:groupId/roles/:id`)

- ✅ 그룹 OWNER 권한 필요
- ✅ 해당 그룹의 역할인지 확인
- ✅ 역할명, 권한, 기본 역할 여부 수정

#### 그룹별 역할 삭제 (`DELETE /groups/:groupId/roles/:id`)

- ✅ 그룹 OWNER 권한 필요
- ✅ 해당 그룹의 역할인지 확인
- ✅ 사용 중인 역할 삭제 시 에러

**관련 파일**:

- [src/group/group.controller.ts](../../src/group/group.controller.ts#L178-L249)
- [src/role/role.service.ts](../../src/role/role.service.ts#L278-L426)
- [src/group/group-owner.guard.ts](../../src/group/group-owner.guard.ts)

---

### 권한 설정

- ✅ 역할별 세부 권한 정의 (JSON 배열)
- ✅ 권한 코드 예시: `["group:read", "group:update", "member:read", "invite"]`
- ✅ 그룹장(OWNER)은 그룹별 역할 생성 및 권한 편집 가능

---

## 🗄️ 데이터베이스 스키마

### Group 테이블

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

### GroupMember 테이블

```prisma
model GroupMember {
  id          String   @id @default(uuid())
  groupId     String
  userId      String
  roleId      String
  customColor String?
  joinedAt    DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  role  Role  @relation(fields: [roleId], references: [id])

  @@unique([groupId, userId])
}
```

### Role 테이블

```prisma
model Role {
  id              String   @id @default(uuid())
  name            String
  groupId         String?
  isDefaultRole   Boolean  @default(false)
  permissions     Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  group           Group?        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupMembers    GroupMember[]

  @@unique([name, groupId])
}
```

### GroupJoinRequest 테이블

```prisma
model GroupJoinRequest {
  id        String            @id @default(uuid())
  groupId   String
  group     Group             @relation(fields: [groupId], references: [id], onDelete: Cascade)
  type      JoinRequestType   @default(REQUEST) // REQUEST: 사용자 요청, INVITE: 관리자 초대
  email     String            @db.VarChar(255) // 초대 대상 이메일
  status    JoinRequestStatus @default(PENDING) // PENDING, ACCEPTED, REJECTED
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@index([groupId])
  @@index([email])
  @@index([status])
}
```

**Enum Types**:

```prisma
enum JoinRequestType {
  REQUEST // 사용자가 초대 코드로 가입 요청
  INVITE  // 관리자가 이메일로 초대
}

enum JoinRequestStatus {
  PENDING  // 대기 중
  ACCEPTED // 승인됨
  REJECTED // 거부됨
}
```

**관련 파일**:

- [prisma/schema.prisma](../../prisma/schema.prisma)

---

## 🔐 권한 체크 시스템

### checkPermissions 메서드

```typescript
private async checkPermissions(
  groupId: string,
  userId: string,
  requiredPermissions: string[],
)
```

- ✅ 그룹 멤버십 확인
- ✅ 역할별 권한 JSON 파싱
- ✅ 필요한 권한 보유 여부 확인
- ✅ 권한 없으면 `ForbiddenException` 발생

**관련 파일**:

- [src/group/group.service.ts](../../src/group/group.service.ts#L95-L129)

---

## 📝 API 엔드포인트

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

### 역할(Role) 관리

#### 공통 역할 관리 - 운영자 전용

| Method | Endpoint                 | 설명                              | 권한       |
| ------ | ------------------------ | --------------------------------- | ---------- |
| GET    | `/roles`                 | 공통 역할 전체 조회               | JWT, Admin |
| GET    | `/roles?type=common`     | 공통 역할만 조회                  | JWT, Admin |
| GET    | `/roles?groupId=uuid`    | 특정 그룹 역할 조회               | JWT, Admin |
| GET    | `/roles/:id`             | 역할 단건 조회                    | JWT, Admin |
| POST   | `/roles`                 | 공통 역할 생성 (`groupId=null`)   | JWT, Admin |
| PATCH  | `/roles/:id`             | 공통 역할 수정                    | JWT, Admin |
| DELETE | `/roles/:id`             | 공통 역할 삭제                    | JWT, Admin |
| PATCH  | `/roles/bulk/sort-order` | 공통 역할 일괄 정렬 순서 업데이트 | JWT, Admin |

#### 그룹별 역할 관리 - 그룹 OWNER 전용

| Method | Endpoint                                 | 설명                                | 권한             |
| ------ | ---------------------------------------- | ----------------------------------- | ---------------- |
| GET    | `/groups/:groupId/roles`                 | 그룹별 역할 전체 조회 (공통+커스텀) | JWT, Member      |
| POST   | `/groups/:groupId/roles`                 | 그룹별 커스텀 역할 생성             | JWT, OWNER       |
| PATCH  | `/groups/:groupId/roles/:id`             | 그룹별 커스텀 역할 수정             | JWT, OWNER       |
| DELETE | `/groups/:groupId/roles/:id`             | 그룹별 커스텀 역할 삭제             | JWT, OWNER       |
| PATCH  | `/groups/:groupId/roles/bulk/sort-order` | 그룹별 역할 일괄 정렬 순서 업데이트 | JWT, MANAGE_ROLE |

---

## 🧪 테스트

### 단위 테스트

- ⬜ GroupService 테스트 (TODO)
- ⬜ GroupMemberService 테스트 (TODO)
- ⬜ GroupInviteService 테스트 (TODO)
- ⬜ GroupController 테스트 (TODO)
- ⬜ 권한 체크 로직 테스트 (TODO)

### E2E 테스트

- ⬜ 그룹 생성 및 가입 플로우 (TODO)
- ⬜ 초대 시스템 플로우 (TODO)
- ⬜ 멤버 관리 플로우 (TODO)
- ⬜ 역할 관리 플로우 (TODO)
- ⬜ 권한 검증 플로우 (TODO)

---

## 🎯 구현 완료 요약

### ✅ 완료된 핵심 기능

1. **그룹 CRUD**: 생성, 조회, 수정, 삭제
2. **초대 시스템**:
   - 초대 코드 방식 (8자리 랜덤 코드)
   - 이메일 초대 방식 (초대 이메일 발송)
   - 초대 취소 및 재전송
   - 초대 코드 재생성
3. **가입 요청 관리**: 요청 조회, 승인, 거부
4. **멤버 관리**: 목록 조회, 역할 변경, 멤버 삭제, 그룹 나가기
5. **그룹장 양도**: OWNER 권한 이전
6. **개인 색상 설정**: 그룹별 커스텀 색상
7. **역할 체계**:
   - 공통 역할 (운영자 전용 CRUD)
   - 그룹별 커스텀 역할 (OWNER 전용 CRUD)
8. **권한 시스템**:
   - Guard 기반 권한 검증 (GroupPermissionGuard, GroupOwnerGuard, GroupMembershipGuard)
   - PermissionCode enum으로 타입 안전한 권한 관리

### ⬜ 향후 개선 사항

1. **테스트 코드 작성**: 단위 테스트 및 E2E 테스트
2. **그룹 통계**: 활동 통계, 멤버 활동 내역
3. **그룹 설정**: 공개/비공개 설정, 가입 승인 방식 설정

---

## 📚 참고 자료

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [NestJS Guards](https://docs.nestjs.com/guards)

---

**Last Updated**: 2025-12-24
