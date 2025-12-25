# 03. 권한 관리 (Permissions Management)

> **상태**: ✅ 완료
> **우선순위**: High
> **담당 Phase**: Phase 2

---

## 📋 개요

시스템 전체의 권한(Permission)을 관리하는 시스템입니다. 운영자만 권한을 생성/수정/삭제할 수 있으며, 역할(Role)에 권한을 할당하여 세밀한 접근 제어를 구현합니다.

---

## ✅ 권한 CRUD

### 권한 전체 조회 (`GET /permissions`)

- ✅ 운영자(isAdmin=true) 권한 필요
- ✅ 카테고리별 그룹핑
- ✅ 삭제되지 않은 권한만 조회 (Soft Delete)

**관련 파일**:

- [src/permission/permission.controller.ts](../../src/permission/permission.controller.ts#L34-L42)
- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L42-L56)

---

### 권한 생성 (`POST /permissions`)

- ✅ 운영자 권한 필요
- ✅ 권한 코드 중복 체크
- ✅ 카테고리별 분류

**카테고리 목록**:

- `GROUP`: 그룹 관련 권한
- `MEMBER`: 멤버 관련 권한
- `ROLE`: 역할 관련 권한
- `SCHEDULE`: 일정 관련 권한
- `TODO`: 할일 관련 권한
- `MEMO`: 메모 관련 권한
- `ASSET`: 자산 관련 권한
- `HOUSEHOLD`: 가계부 관련 권한
- `CHILDCARE`: 육아 관련 권한
- `SYSTEM`: 시스템 관련 권한

**관련 파일**:

- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L61-L93)

---

### 권한 수정 (`PATCH /permissions/:id`)

- ✅ 운영자 권한 필요
- ✅ 코드 변경 시 중복 체크

**관련 파일**:

- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L98-L140)

---

### 권한 삭제 (Soft Delete) (`DELETE /permissions/:id`)

- ✅ 운영자 권한 필요
- ✅ Soft Delete 방식 (`deletedAt` 설정)
- ✅ 데이터는 유지되나 조회에서 제외

**관련 파일**:

- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L145-L182)

---

### 권한 영구 삭제 (Hard Delete) (`DELETE /permissions/:id/hard`)

- ✅ 운영자 권한 필요
- ✅ 데이터베이스에서 완전히 삭제
- ✅ 복구 불가능

**관련 파일**:

- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L187-L224)

---

## ✅ 권한 복원

### 삭제된 권한 복원 (`POST /permissions/:id/restore`)

- ✅ 운영자 권한 필요
- ✅ Soft Delete된 권한 복원
- ✅ `deletedAt`을 null로 설정

**관련 파일**:

- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L229-L266)

---

## ✅ 그룹별 권한 적용

### 역할에 권한 할당

- ✅ 역할 생성 시 권한 배열 지정 (`PermissionCode[]`)
- ✅ 권한 코드 enum으로 타입 안전하게 관리
- ✅ 예: `[INVITE_MEMBER, UPDATE_GROUP, MANAGE_ROLE]`

**관련 파일**:

- [prisma/schema.prisma](../../prisma/schema.prisma) - Role 모델의 permissions 필드

### 권한 검증

- ✅ `GroupPermissionGuard` 구현
- ✅ `@RequirePermission` 데코레이터로 필요한 권한 지정
- ✅ 사용자의 역할에서 권한 추출 및 검증
- ✅ 권한 없으면 `ForbiddenException` 발생

**관련 파일**:

- [src/group/guards/group-permission.guard.ts](../../src/group/guards/group-permission.guard.ts) - 권한 검증 가드
- [src/group/guards/index.ts](../../src/group/guards/index.ts) - Guards 내보내기

**사용 예시**:

```typescript
@UseGuards(JwtAuthGuard, GroupPermissionGuard)
@RequirePermission(PermissionCode.INVITE_MEMBER)
@Post(':groupId/members/invite')
async inviteByEmail(...) { ... }
```

**실제 적용 사례**:

- [src/group/group.controller.ts](../../src/group/group.controller.ts) - 그룹 수정/삭제
- [src/group/group-member.controller.ts](../../src/group/group-member.controller.ts) - 멤버 초대/관리
- [src/group/group-role.controller.ts](../../src/group/group-role.controller.ts) - 역할 관리

---

## 🗄️ 데이터베이스 스키마

### Permission 테이블

```prisma
model Permission {
  id          String              @id @default(uuid())
  code        String              @unique
  name        String
  description String?
  category    PermissionCategory
  sortOrder   Int                 @default(0)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  deletedAt   DateTime?

  @@index([sortOrder])
}

enum PermissionCategory {
  GROUP
  MEMBER
  ROLE
  SCHEDULE
  TODO
  MEMO
  ASSET
  HOUSEHOLD
  CHILDCARE
  SYSTEM
}
```

**특징**:

- `code`: 고유한 권한 식별자 (예: `group:read`, `member:update`)
- `category`: 권한을 기능별로 그룹핑
- `sortOrder`: 권한 정렬 순서 (낮을수록 먼저 표시, 기본값: 0)
- `deletedAt`: Soft Delete 지원

**관련 파일**:

- [prisma/schema.prisma](../../prisma/schema.prisma)

---

## 📝 API 엔드포인트

| Method | Endpoint                       | 설명                         | 권한       |
| ------ | ------------------------------ | ---------------------------- | ---------- |
| GET    | `/permissions`                 | 권한 전체 조회               | JWT, Admin |
| POST   | `/permissions`                 | 권한 생성                    | JWT, Admin |
| PATCH  | `/permissions/:id`             | 권한 수정                    | JWT, Admin |
| PATCH  | `/permissions/bulk/sort-order` | 권한 일괄 정렬 순서 업데이트 | JWT, Admin |
| DELETE | `/permissions/:id`             | 권한 삭제 (Soft)             | JWT, Admin |
| DELETE | `/permissions/:id/hard`        | 권한 영구 삭제               | JWT, Admin |
| POST   | `/permissions/:id/restore`     | 권한 복원                    | JWT, Admin |

---

## 📚 Swagger 문서

### Response DTO

- ✅ `PermissionDto`: 권한 기본 정보
- ✅ `GetAllPermissionsResponseDto`: 전체 조회 응답
- ✅ `CreatePermissionResponseDto`: 생성 응답
- ✅ `UpdatePermissionResponseDto`: 수정 응답
- ✅ `DeletePermissionResponseDto`: 삭제 응답
- ✅ `HardDeletePermissionResponseDto`: 영구 삭제 응답

**관련 파일**:

- [src/permission/dto/permission-response.dto.ts](../../src/permission/dto/permission-response.dto.ts)
- [src/permission/dto/create-permission.dto.ts](../../src/permission/dto/create-permission.dto.ts)
- [src/permission/dto/update-permission.dto.ts](../../src/permission/dto/update-permission.dto.ts)

---

## 🧪 테스트

### 단위 테스트 (Unit Tests)

- ✅ **PermissionService 테스트** - 8개 테스트 통과
  - 파일: [src/permission/permission.service.spec.ts](../../src/permission/permission.service.spec.ts)
  - 권한 전체 조회 (카테고리별 그룹화)
  - 카테고리 필터링 조회
  - 권한 코드 유효성 검증 (validatePermissions)
  - 권한 코드 → 이름 변환 (getPermissionNames)

- ✅ **PermissionController 테스트** - 3개 테스트 통과
  - 파일: [src/permission/permission.controller.spec.ts](../../src/permission/permission.controller.spec.ts)
  - Controller 레이어 메서드 호출 검증
  - AdminGuard 오버라이드를 통한 권한 검증 우회

**실행 결과**:
```bash
npm run test -- permission
✅ Test Suites: 2 passed, 2 total
✅ Tests: 11 passed, 11 total
```

### E2E 테스트

- ✅ **테스트 파일 작성 완료**
  - 파일: [test/permissions.e2e-spec.ts](../../test/permissions.e2e-spec.ts)
  - 권한 조회, 권한 검증 시스템, 카테고리별 권한 테스트

- ✅ **테스트 시나리오**
  - 권한 조회 플로우 (전체 조회, 카테고리 필터링)
  - 운영자 vs 일반 사용자 권한 검증
  - 그룹별 권한 검증 시스템 (GroupPermissionGuard)
  - 카테고리별 권한 존재 확인 (GROUP, MEMBER, ROLE)

**E2E 테스트 실행**:
```bash
npm run test:e2e -- permissions.e2e-spec.ts
```

---

## 📚 참고 자료

- [NestJS Guards](https://docs.nestjs.com/guards)
- [RBAC (Role-Based Access Control)](https://en.wikipedia.org/wiki/Role-based_access_control)

---

## 🎯 구현 완료 요약

### ✅ 완료된 기능

1. **권한 CRUD API**: 전체 조회, 생성, 수정, 삭제(Soft/Hard), 복원, 일괄 정렬 순서 업데이트
2. **운영자 권한 시스템**: `AdminGuard`를 통한 운영자 전용 API 보호
3. **그룹별 권한 시스템**: `GroupPermissionGuard` + `@RequirePermission` 데코레이터
4. **권한 카테고리**: 기능별 권한 그룹핑 (현재 GROUP 카테고리)
5. **권한 코드 enum**: 타입 안전한 권한 관리 (INVITE_MEMBER, DELETE_GROUP 등)
6. **Soft Delete**: 권한 삭제 후 복원 가능
7. **Swagger 문서화**: 모든 API 엔드포인트 문서화 완료

### ⬜ 향후 개선 사항

1. **추가 권한 카테고리**: SCHEDULE, TODO, MEMO 등 다른 기능의 권한 추가
2. **권한 미리보기**: 역할 생성/수정 시 권한 설명 UI 개선
3. **Guard 단위 테스트**: AdminGuard, GroupPermissionGuard 테스트 추가

---

**Last Updated**: 2025-12-25 (테스트 코드 완성)
