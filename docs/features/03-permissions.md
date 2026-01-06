# 03. 권한 관리 (Permissions Management)

> **상태**: ✅ 완료
> **Phase**: Phase 2

---

## 개요

시스템 전체의 권한(Permission)을 관리하는 시스템입니다. 운영자만 권한 CRUD 가능하며, 역할(Role)에 권한을 할당하여 세밀한 접근 제어를 구현합니다.

---

## 권한 CRUD

### 권한 전체 조회 (`GET /permissions`)
- ADMIN 권한 필요
- 카테고리별 그룹핑
- Soft Delete된 권한 제외

### 권한 생성 (`POST /permissions`)
- ADMIN 권한 필요
- 권한 코드 중복 체크
- 카테고리별 분류 (GROUP, MEMBER, ROLE, SCHEDULE, TODO, MEMO, ASSET, HOUSEHOLD, CHILDCARE, SYSTEM)

### 권한 수정 (`PATCH /permissions/:id`)
- ADMIN 권한 필요
- 코드 변경 시 중복 체크

### 권한 삭제
- **Soft Delete** (`DELETE /permissions/:id`): `deletedAt` 설정, 데이터 유지
- **Hard Delete** (`DELETE /permissions/:id/hard`): DB에서 완전 삭제, 복구 불가

### 권한 복원 (`POST /permissions/:id/restore`)
- Soft Delete된 권한 복원
- `deletedAt`을 null로 설정

---

## 그룹별 권한 적용

### 역할에 권한 할당
- 역할 생성 시 권한 배열 지정 (`PermissionCode[]`)
- 예: `[INVITE_MEMBER, UPDATE_GROUP, MANAGE_ROLE]`

### 권한 검증
- `GroupPermissionGuard` 구현
- `@RequirePermission` 데코레이터로 필요한 권한 지정
- 사용자 역할에서 권한 추출 및 검증
- 권한 없으면 `ForbiddenException`

사용 예시:
```typescript
@UseGuards(JwtAuthGuard, GroupPermissionGuard)
@RequirePermission(PermissionCode.INVITE_MEMBER)
@Post(':groupId/members/invite')
async inviteByEmail(...) { ... }
```

---

## 데이터베이스

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
  GROUP, MEMBER, ROLE, SCHEDULE, TODO, MEMO,
  ASSET, HOUSEHOLD, CHILDCARE, SYSTEM
}
```

---

## 구현 상태

### ✅ 완료
- [x] 권한 전체 조회 (ADMIN)
- [x] 권한 생성 (ADMIN)
- [x] 권한 수정 (ADMIN)
- [x] 권한 일괄 정렬 순서 업데이트
- [x] 권한 Soft Delete
- [x] 권한 Hard Delete
- [x] 권한 복원 (Soft Delete 복구)
- [x] 카테고리별 권한 분류 (10개 카테고리)
- [x] GroupPermissionGuard 구현
- [x] @RequirePermission 데코레이터
- [x] 역할에 권한 할당 시스템
- [x] 단위 테스트 (11개 통과)
- [x] E2E 테스트

### ⬜ TODO / 향후 고려
- [ ] 권한 그룹핑 (상위/하위 권한)
- [ ] 권한 의존성 관리
- [ ] 권한 변경 이력
- [ ] 권한 템플릿

---

## API 엔드포인트

| Method | Endpoint                       | 설명                   | 권한       |
| ------ | ------------------------------ | ---------------------- | ---------- |
| GET    | `/permissions`                 | 권한 전체 조회         | JWT, Admin |
| POST   | `/permissions`                 | 권한 생성              | JWT, Admin |
| PATCH  | `/permissions/:id`             | 권한 수정              | JWT, Admin |
| PATCH  | `/permissions/bulk/sort-order` | 권한 일괄 정렬 순서    | JWT, Admin |
| DELETE | `/permissions/:id`             | 권한 삭제 (Soft)       | JWT, Admin |
| DELETE | `/permissions/:id/hard`        | 권한 영구 삭제         | JWT, Admin |
| POST   | `/permissions/:id/restore`     | 권한 복원              | JWT, Admin |

---

## 테스트 (11개 통과)

- PermissionService: 권한 조회, 카테고리 필터링, 권한 검증
- PermissionController: Controller 레이어 검증
- E2E: 권한 조회, 권한 검증 시스템, 카테고리별 권한

---

**Last Updated**: 2025-12-25
