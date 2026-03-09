# 그룹 권한 체계 (Group Permissions)

> **목적**: 개발/유지보수 시 그룹 관련 권한 구조를 빠르게 파악하기 위한 참고 문서
> **관련 기능 문서**: [docs/features/02-groups.md](../features/02-groups.md)

---

## 권한 레이어 구조

```
요청
 │
 ├─ JwtAuthGuard (전역 APP_GUARD)
 │   ├─ @Public() 있으면 → 통과
 │   └─ JWT 유효 → req.user.userId 주입
 │
 ├─ GroupMembershipGuard
 │   └─ GroupMember 테이블에서 groupId_userId 조합 존재 확인
 │
 └─ GroupPermissionGuard + @RequirePermission(PermissionCode)
     └─ 멤버의 role.permissions JSON 배열에 필요 권한 포함 여부 확인
```

> **GroupOwnerGuard**: 정의되어 있으나 현재 어떤 엔드포인트에도 적용되지 않음.
> `transfer-ownership`은 서비스 레이어에서 OWNER 여부를 직접 확인함.

---

## Guards 상세

### GroupMembershipGuard
- **파일**: [src/group/guards/group-membership.guard.ts](../../src/group/guards/group-membership.guard.ts)
- **확인**: `GroupMember` 테이블에서 `{ groupId, userId }` 존재 여부
- **groupId 추출**: `params.groupId` 또는 `params.id`
- **부작용**: 멤버 정보를 `req.groupMember`에 주입

### GroupPermissionGuard
- **파일**: [src/group/guards/group-permission.guard.ts](../../src/group/guards/group-permission.guard.ts)
- **확인**: 멤버의 `role.permissions` (JSON 배열)에 `@RequirePermission`으로 지정한 코드 포함 여부
- **groupId 추출 순서**: `params.groupId` → `params.id` → `body.groupId` → `query.groupId`
- **주의**: `@RequirePermission` 없이 단독 사용 시 런타임 에러 발생

### GroupOwnerGuard
- **파일**: [src/group/guards/group-owner.guard.ts](../../src/group/guards/group-owner.guard.ts)
- **확인**: `member.role.name === 'OWNER'`
- **groupId 추출**: `params.groupId` (id 폴백 없음)
- **현재 상태**: 미사용

---

## PermissionCode 목록

Prisma schema의 `PermissionCode` enum. `Role.permissions` JSON 배열에 저장됨.

| 코드 | 설명 | 적용 엔드포인트 |
|------|------|----------------|
| `INVITE_MEMBER` | 초대 관련 모든 작업 | `POST /:id/regenerate-code`<br>`POST /:id/invite-by-email`<br>`GET /:id/join-requests`<br>`POST /:id/join-requests/:rid/accept`<br>`POST /:id/join-requests/:rid/reject`<br>`DELETE /:id/invites/:rid`<br>`POST /:id/invites/:rid/resend` |
| `DELETE_GROUP` | 그룹 삭제 | `DELETE /groups/:id` |
| `UPDATE_GROUP` | 그룹 정보 수정 | `PATCH /groups/:id` |
| `MANAGE_ROLE` | 커스텀 역할 CRUD + 정렬 | `POST /:groupId/roles`<br>`PATCH /:groupId/roles/:id`<br>`DELETE /:groupId/roles/:id`<br>`PATCH /:groupId/roles/bulk/sort-order` |
| `MANAGE_MEMBER` | 멤버 역할 변경, 멤버 강퇴 | `PATCH /:id/members/:userId/role`<br>`DELETE /:id/members/:userId` |
| `READ_TASK` | 태스크 조회 | **미사용** (Guard 미적용) |
| `CREATE_TASK` | 태스크 생성 | **미사용** (Guard 미적용) |
| `UPDATE_TASK` | 태스크 수정 | **미사용** (Guard 미적용) |
| `DELETE_TASK` | 태스크 삭제 | **미사용** (Guard 미적용) |
| `MANAGE_CATEGORY` | 태스크 카테고리 관리 | **미사용** (Guard 미적용) |

---

## 엔드포인트별 권한 적용 현황

### 그룹 관리 (`GroupController`)

| Method | Endpoint | Guard | 필요 권한 |
|--------|----------|-------|----------|
| `POST` | `/groups` | - (JWT only) | - |
| `GET` | `/groups` | - (JWT only) | - |
| `GET` | `/groups/:id` | `GroupMembershipGuard` | 멤버이기만 하면 됨 |
| `PATCH` | `/groups/:id` | `GroupPermissionGuard` | `UPDATE_GROUP` |
| `DELETE` | `/groups/:id` | `GroupPermissionGuard` | `DELETE_GROUP` |

### 멤버 관리 (`GroupMemberController`)

| Method | Endpoint | Guard | 필요 권한 |
|--------|----------|-------|----------|
| `POST` | `/groups/join` | - (JWT only) | - |
| `POST` | `/groups/:id/leave` | - (JWT only) | - |
| `GET` | `/groups/:id/members` | `GroupMembershipGuard` | 멤버이기만 하면 됨 |
| `PATCH` | `/groups/:id/members/:userId/role` | `GroupPermissionGuard` | `MANAGE_MEMBER` |
| `PATCH` | `/groups/:id/my-color` | `GroupMembershipGuard` | 멤버이기만 하면 됨 |
| `DELETE` | `/groups/:id/members/:userId` | `GroupPermissionGuard` | `MANAGE_MEMBER` |
| `POST` | `/groups/:id/regenerate-code` | `GroupPermissionGuard` | `INVITE_MEMBER` |
| `POST` | `/groups/:id/invite-by-email` | `GroupPermissionGuard` | `INVITE_MEMBER` |
| `POST` | `/groups/:id/transfer-ownership` | - (JWT only) | 서비스 레이어에서 OWNER 확인 |
| `GET` | `/groups/:id/join-requests` | `GroupPermissionGuard` | `INVITE_MEMBER` |
| `POST` | `/groups/:id/join-requests/:requestId/accept` | `GroupPermissionGuard` | `INVITE_MEMBER` |
| `POST` | `/groups/:id/join-requests/:requestId/reject` | `GroupPermissionGuard` | `INVITE_MEMBER` |
| `DELETE` | `/groups/:id/invites/:requestId` | `GroupPermissionGuard` | `INVITE_MEMBER` |
| `POST` | `/groups/:id/invites/:requestId/resend` | `GroupPermissionGuard` | `INVITE_MEMBER` |

### 역할 관리 (`GroupRoleController`)

| Method | Endpoint | Guard | 필요 권한 |
|--------|----------|-------|----------|
| `GET` | `/groups/:groupId/roles` | `GroupMembershipGuard` | 멤버이기만 하면 됨 |
| `POST` | `/groups/:groupId/roles` | `GroupPermissionGuard` | `MANAGE_ROLE` |
| `PATCH` | `/groups/:groupId/roles/:id` | `GroupPermissionGuard` | `MANAGE_ROLE` |
| `DELETE` | `/groups/:groupId/roles/:id` | `GroupPermissionGuard` | `MANAGE_ROLE` |
| `PATCH` | `/groups/:groupId/roles/bulk/sort-order` | `GroupPermissionGuard` | `MANAGE_ROLE` |

### 공통 역할 관리 (`RoleController`) — 시스템 어드민 전용

| Method | Endpoint | Guard | 필요 권한 |
|--------|----------|-------|----------|
| `GET` | `/roles` | `AdminGuard` | `User.isAdmin === true` |
| `POST` | `/roles` | `AdminGuard` | `User.isAdmin === true` |
| `PATCH` | `/roles/:id` | `AdminGuard` | `User.isAdmin === true` |
| `DELETE` | `/roles/:id` | `AdminGuard` | `User.isAdmin === true` |

---

## 알려진 이슈

| 이슈 | 내용 |
|------|------|
| 태스크 권한 미적용 | `READ_TASK`, `CREATE_TASK`, `UPDATE_TASK`, `DELETE_TASK`, `MANAGE_CATEGORY`가 schema에 정의되어 있으나 태스크 컨트롤러에 `GroupPermissionGuard` 미적용 |
| `GroupOwnerGuard` 미사용 | Guard가 정의되어 있으나 어떤 엔드포인트에도 사용되지 않음 |
| `transfer-ownership` Guard 없음 | OWNER 검증이 서비스 레이어에서만 이루어짐 — 컨트롤러 레벨 방어 없음 |

---

**Last Updated**: 2026-03-10
