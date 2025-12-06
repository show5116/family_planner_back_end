# 03. 권한 관리 (Permissions Management)

> **상태**: 🟨 진행 중
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

**Response**:

```json
[
  {
    "id": "uuid",
    "code": "group:read",
    "name": "그룹 조회",
    "description": "그룹 정보를 조회할 수 있습니다",
    "category": "GROUP",
    "createdAt": "2025-12-04T00:00:00Z",
    "updatedAt": "2025-12-04T00:00:00Z"
  }
]
```

**관련 파일**:

- [src/permission/permission.controller.ts](../../src/permission/permission.controller.ts#L34-L42)
- [src/permission/permission.service.ts](../../src/permission/permission.service.ts#L42-L56)

---

### 권한 생성 (`POST /permissions`)

- ✅ 운영자 권한 필요
- ✅ 권한 코드 중복 체크
- ✅ 카테고리별 분류

**Request Body**:

```json
{
  "code": "group:update",
  "name": "그룹 수정",
  "description": "그룹 정보를 수정할 수 있습니다",
  "category": "GROUP"
}
```

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

## ⬜ 그룹별 권한 적용

### 역할에 권한 할당

- ⬜ 역할 생성 시 권한 배열 지정
- ⬜ 권한 코드 배열로 관리
- ⬜ 예: `["group:read", "group:update", "member:read"]`

### 권한 검증

- ⬜ 각 API 엔드포인트에서 필요한 권한 체크
- ⬜ 사용자의 역할에서 권한 추출
- ⬜ 권한 없으면 `ForbiddenException` 발생

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
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  deletedAt   DateTime?
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
- `deletedAt`: Soft Delete 지원

**관련 파일**:

- [prisma/schema.prisma](../../prisma/schema.prisma)

---

## 📝 API 엔드포인트

| Method | Endpoint                   | 설명             | 권한       |
| ------ | -------------------------- | ---------------- | ---------- |
| GET    | `/permissions`             | 권한 전체 조회   | JWT, Admin |
| POST   | `/permissions`             | 권한 생성        | JWT, Admin |
| PATCH  | `/permissions/:id`         | 권한 수정        | JWT, Admin |
| DELETE | `/permissions/:id`         | 권한 삭제 (Soft) | JWT, Admin |
| DELETE | `/permissions/:id/hard`    | 권한 영구 삭제   | JWT, Admin |
| POST   | `/permissions/:id/restore` | 권한 복원        | JWT, Admin |

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

### 단위 테스트

- ⬜ PermissionService 테스트
- ⬜ PermissionController 테스트
- ⬜ AdminGuard 테스트

### E2E 테스트

- ⬜ 권한 CRUD 플로우
- ⬜ Soft Delete 및 복원 플로우
- ⬜ 운영자 권한 검증

---

## 🔮 향후 계획

1. **권한 시드 데이터 작성**
   - 기본 권한 목록 정의
   - 시드 스크립트 작성

2. **역할-권한 매핑**
   - 역할 생성 시 권한 할당
   - 권한 변경 시 역할 업데이트

3. **권한 검증 데코레이터**
   - `@RequirePermissions(['group:read'])` 커스텀 데코레이터
   - 자동 권한 체크

4. **권한 관리 UI 연동**
   - 프론트엔드 권한 관리 화면
   - 역할별 권한 매트릭스

---

## 📚 참고 자료

- [NestJS Guards](https://docs.nestjs.com/guards)
- [RBAC (Role-Based Access Control)](https://en.wikipedia.org/wiki/Role-based_access_control)

---

**Last Updated**: 2025-12-04
