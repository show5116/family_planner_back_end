# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 역할(Role) - 공통 역할 관리

**Base Path:** `/roles`

### GET `roles`

**요약:** 공통 역할 전체 조회 (운영자 전용)

**설명:**
⚠️ groupId=null인 공통 역할만 조회합니다. 그룹별 역할은 GET /groups/:groupId/roles 사용

**Responses:**

#### 200 - 공통 역할 목록 반환 (groupId=null)

```json
{
  "data": [
    {
      "id": "uuid", // 역할 ID (string)
      "name": "OWNER", // 역할명 (string)
      "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
      "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
    }
  ] // RoleDto[]
}
```

---

### POST `roles`

**요약:** 공통 역할 생성 (운영자 전용)

**설명:**
⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 생성합니다. 그룹별 역할은 POST /groups/:groupId/roles 사용

**Request Body:**

```json
{
  "name": "ADMIN", // 역할명 (string)
  "groupId": null, // 그룹 ID (null이면 공통 역할) (string | null?)
  "isDefaultRole": false, // 기본 역할 여부 (초대 시 자동 부여) (boolean?)
  "permissions": ["VIEW", "CREATE", "UPDATE"], // 권한 배열 (PermissionCode[])
  "color": "#6366F1", // 역할 색상 (HEX 형식) (string?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 201 -

```json
{
  "data": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  } // RoleDto
}
```

---

### PATCH `roles/:id`

**요약:** 공통 역할 수정 (운영자 전용)

**설명:**
⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 수정합니다. 그룹별 역할은 PATCH /groups/:groupId/roles/:id 사용

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "ADMIN", // 역할명 (string?)
  "isDefaultRole": false, // 기본 역할 여부 (초대 시 자동 부여) (boolean?)
  "permissions": ["VIEW", "CREATE", "UPDATE"], // 권한 배열 (PermissionCode[]?)
  "color": "#6366F1", // 역할 색상 (HEX 형식) (string?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 200 - 역할 수정 성공

```json
{
  "data": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  } // RoleDto
}
```

---

### DELETE `roles/:id`

**요약:** 공통 역할 삭제 (운영자 전용)

**설명:**
⚠️ 이 엔드포인트는 공통 역할(groupId=null)만 삭제합니다. 그룹별 역할은 DELETE /groups/:groupId/roles/:id 사용

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 역할 삭제 성공

```json
{
  "message": "역할이 삭제되었습니다", // string
  "deletedRole": {
    "id": "uuid", // 역할 ID (string)
    "name": "OWNER", // 역할명 (string)
    "color": "#6366F1", // 역할 색상 (HEX 형식) (string)
    "permissions": ["INVITE_MEMBER", "UPDATE_GROUP"] // 권한 배열 (string[])
  } // RoleDto
}
```

---

### PATCH `roles/bulk/sort-order`

**요약:** 공통 역할 일괄 정렬 순서 업데이트 (운영자 전용)

**설명:**
여러 역할의 정렬 순서를 한 번에 업데이트합니다. 드래그 앤 드롭 후 사용하세요.

**Request Body:**

```json
{
  "items": [
    { "id": "role-1", "sortOrder": 0 },
    { "id": "role-2", "sortOrder": 1 },
    { "id": "role-3", "sortOrder": 2 }
  ] // 역할 ID와 정렬 순서 배열 (RoleSortOrderItem[])
}
```

---
