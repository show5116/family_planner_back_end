# 02. 그룹 관리 (Groups Management)

> **상태**: 🟨 진행 중
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

**Request Body**:
```json
{
  "name": "우리 가족",
  "description": "가족 그룹입니다",
  "defaultColor": "#FF5733"
}
```

**관련 파일**:
- [src/group/group.controller.ts](../../src/group/group.controller.ts#L33-L39)
- [src/group/group.service.ts](../../src/group/group.service.ts#L157-L192)

---

### 내가 속한 그룹 목록 조회 (`GET /groups`)
- ✅ 사용자가 속한 모든 그룹 조회
- ✅ 개인 커스텀 색상 포함
- ✅ 내 역할 정보 포함
- ✅ 멤버 수 포함

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "우리 가족",
    "description": "가족 그룹",
    "defaultColor": "#FF5733",
    "inviteCode": "aBc12XyZ",
    "myColor": "#00FF00",
    "myRole": {
      "id": "uuid",
      "name": "OWNER",
      "permissions": ["ALL"]
    },
    "_count": {
      "members": 4
    }
  }
]
```

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

### ⬜ 그룹장 양도 (`POST /groups/:id/transfer-ownership`)
- ⬜ 현재 OWNER만 가능
- ⬜ 다른 멤버에게 OWNER 역할 이전
- ⬜ 기존 OWNER는 다른 역할로 변경

---

## ✅ 초대 시스템

### 초대 코드 방식

#### 초대 코드로 그룹 가입 (`POST /groups/join`)
- ✅ 8자리 영문(대소문자 구분) + 숫자 조합 코드
- ✅ 사용자가 직접 코드 입력
- ✅ 중복 가입 방지
- ✅ 가입 시 is_default_role=true인 역할 자동 부여

**Request Body**:
```json
{
  "inviteCode": "aBc12XyZ"
}
```

**관련 파일**:
- [src/group/group.service.ts](../../src/group/group.service.ts#L326-L382)

---

#### 초대 코드 재생성 (`POST /groups/:id/regenerate-code`)
- ✅ REGENERATE_INVITE_CODE 권한 필요
- ✅ 백엔드에서 중복 검사 후 고유 코드 생성
- ✅ 보안을 위해 코드 재발급 가능

**Response**:
```json
{
  "inviteCode": "NewCode1"
}
```

**관련 파일**:
- [src/group/group.service.ts](../../src/group/group.service.ts#L564-L575)

---

### ⬜ 이메일 초대 방식

#### 이메일로 초대 (`POST /groups/:id/invite-by-email`)
- ⬜ 초대 권한이 있는 역할만 가능
- ⬜ 초대할 사용자 이메일 입력
- ⬜ 시스템에서 초대 이메일 자동 발송 (초대 코드 포함)
- ⬜ 수신자는 이메일의 초대 코드로 가입

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

### ⬜ 개인 그룹 색상 설정 (`PATCH /groups/:id/my-color`)
- 🟨 멤버십 확인 (완료)
- ⬜ 그룹의 기본 색상 대신 개인이 설정한 색상 사용
- ⬜ 미설정 시 그룹 기본 색상 사용

**Request Body**:
```json
{
  "customColor": "#00FF00"
}
```

**관련 파일**:
- [src/group/group.service.ts](../../src/group/group.service.ts#L580-L592)

---

### 멤버 역할 변경 (`PATCH /groups/:id/members/:userId/role`)
- ✅ ASSIGN_ROLE 권한 필요
- ✅ 자신의 역할은 변경 불가
- ✅ OWNER 역할은 양도만 가능 (변경 불가)
- ✅ OWNER 역할로는 변경할 수 없음

**Request Body**:
```json
{
  "roleId": "new-role-uuid"
}
```

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
| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/groups` | 그룹 생성 | JWT |
| GET | `/groups` | 내 그룹 목록 | JWT |
| GET | `/groups/:id` | 그룹 상세 | JWT, Member |
| PATCH | `/groups/:id` | 그룹 수정 | JWT, UPDATE |
| DELETE | `/groups/:id` | 그룹 삭제 | JWT, DELETE |
| POST | `/groups/join` | 초대 코드로 가입 | JWT |
| POST | `/groups/:id/regenerate-code` | 초대 코드 재생성 | JWT, REGENERATE_INVITE_CODE |
| POST | `/groups/:id/leave` | 그룹 나가기 | JWT |
| GET | `/groups/:id/members` | 멤버 목록 | JWT, Member |
| PATCH | `/groups/:id/members/:userId/role` | 멤버 역할 변경 | JWT, ASSIGN_ROLE |
| DELETE | `/groups/:id/members/:userId` | 멤버 삭제 | JWT, REMOVE_MEMBER |
| PATCH | `/groups/:id/my-color` | 내 색상 설정 | JWT, Member |

### 역할(Role) 관리

#### 공통 역할 관리 - 운영자 전용
| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/roles` | 공통 역할 전체 조회 | JWT, Admin |
| GET | `/roles?type=common` | 공통 역할만 조회 | JWT, Admin |
| GET | `/roles?groupId=uuid` | 특정 그룹 역할 조회 | JWT, Admin |
| GET | `/roles/:id` | 역할 단건 조회 | JWT, Admin |
| POST | `/roles` | 공통 역할 생성 (`groupId=null`) | JWT, Admin |
| PATCH | `/roles/:id` | 공통 역할 수정 | JWT, Admin |
| DELETE | `/roles/:id` | 공통 역할 삭제 | JWT, Admin |

#### 그룹별 역할 관리 - 그룹 OWNER 전용
| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/groups/:groupId/roles` | 그룹별 역할 전체 조회 (공통+커스텀) | JWT, Member |
| POST | `/groups/:groupId/roles` | 그룹별 커스텀 역할 생성 | JWT, OWNER |
| PATCH | `/groups/:groupId/roles/:id` | 그룹별 커스텀 역할 수정 | JWT, OWNER |
| DELETE | `/groups/:groupId/roles/:id` | 그룹별 커스텀 역할 삭제 | JWT, OWNER |

---

## 🧪 테스트

### 단위 테스트
- ⬜ GroupService 테스트
- ⬜ GroupController 테스트
- ⬜ 권한 체크 로직 테스트

### E2E 테스트
- ⬜ 그룹 생성 및 가입 플로우
- ⬜ 멤버 관리 플로우
- ⬜ 권한 검증 플로우

---

## 🔮 향후 활용

- **일정 관리**: 그룹 멤버와 일정 공유, 그룹별 필터링
- **ToDoList**: 그룹 내 할일 공유 및 협업, 역할별 권한 관리
- **육아 포인트**: 부모-자녀 역할 기반 포인트 관리
- **메모**: 그룹 멤버와 메모 공유, 역할별 접근 권한
- **가계부**: 가족 그룹 내 가계부 공유, 역할별 조회/수정 권한

---

## 📚 참고 자료

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [NestJS Guards](https://docs.nestjs.com/guards)

---

**Last Updated**: 2025-12-04
