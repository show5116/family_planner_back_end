# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

생성일: 2025-12-19T15:05:41.964Z

---

## permissions

**Base Path:** `/permissions`

### GET `permissions`

**요약:** 전체 권한 목록 조회

**설명:**
UI에서 권한 선택 시 사용. 카테고리별 필터링 가능

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| category | string | No | - |

**Responses:**

#### 200 - 권한 목록 조회 성공

```json
{
  "permissions": [
    {
      "id": "perm_clxxx123", // 권한 ID (string)
      "code": "VIEW", // 권한 코드 (PermissionCode)
      "name": "그룹 조회", // 권한 이름 (string)
      "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
      "category": "GROUP", // 권한 카테고리 (PermissionCategory)
      "isActive": true, // 활성화 여부 (boolean)
      "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
      "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
      "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
    }
  ], // 전체 권한 목록 (PermissionDto[])
  "groupedByCategory": {"GROUP":[{"id":"perm_clxxx123","code":"group:read","name":"그룹 조회","description":"그룹 정보를 조회할 수 있는 권한","category":"GROUP"}],"SCHEDULE":[{"id":"perm_clxxx456","code":"schedule:read","name":"일정 조회","description":"일정 정보를 조회할 수 있는 권한","category":"SCHEDULE"}]}, // 카테고리별로 그룹화된 권한 (Record<string, PermissionDto[]>)
  "categories": ["GROUP","SCHEDULE","TASK","BUDGET","PHOTO","ADMIN"] // 사용 가능한 카테고리 목록 (PermissionCategory[])
}
```

---

### POST `permissions`

**요약:** 권한 생성

**설명:**
새로운 권한을 생성합니다. 운영자 전용 API

**인증/권한:**
- AdminGuard

**Request Body:**

```json
{
  "code": "INVITE", // 권한 코드 (고유값) (PermissionCode)
  "name": "그룹 조회", // 권한 이름 (string)
  "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
  "category": "GROUP", // 권한 카테고리 (PermissionCategory)
  "isActive": true, // 활성화 여부 (boolean?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 201 - 

```json
{
  "message": "권한이 생성되었습니다.", // 응답 메시지 (string)
  "permission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 생성된 권한 정보 (PermissionDto)
}
```

---

### PATCH `permissions/:id`

**요약:** 권한 수정

**설명:**
기존 권한 정보를 수정합니다. 운영자 전용 API

**인증/권한:**
- AdminGuard

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | - |

**Request Body:**

```json
{
  "code": "VIEW", // 권한 코드 (고유값) (PermissionCode?)
  "name": "그룹 조회", // 권한 이름 (string?)
  "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
  "category": "GROUP", // 권한 카테고리 (PermissionCategory?)
  "isActive": true, // 활성화 여부 (boolean?)
  "sortOrder": 0 // 정렬 순서 (낮을수록 먼저 표시) (number?)
}
```

**Responses:**

#### 200 - 권한 수정 성공

```json
{
  "message": "권한이 수정되었습니다.", // 응답 메시지 (string)
  "permission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 수정된 권한 정보 (PermissionDto)
}
```

---

### DELETE `permissions/:id`

**요약:** 권한 삭제 (소프트 삭제)

**설명:**
권한을 소프트 삭제합니다 (isActive=false). 운영자 전용 API

**인증/권한:**
- AdminGuard

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | - |

**Responses:**

#### 200 - 권한 삭제 성공

```json
{
  "message": "권한이 비활성화되었습니다.", // 응답 메시지 (string)
  "permission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 삭제된 권한 정보 (PermissionDto)
}
```

---

### DELETE `permissions/:id/hard`

**요약:** 권한 완전 삭제 (하드 삭제)

**설명:**
권한을 데이터베이스에서 완전히 삭제합니다. 위험한 작업이므로 주의 필요. 운영자 전용 API

**인증/권한:**
- AdminGuard

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | - |

**Responses:**

#### 200 - 권한 완전 삭제 성공

```json
{
  "message": "권한이 완전히 삭제되었습니다.", // 응답 메시지 (string)
  "deletedPermission": {
    "id": "perm_clxxx123", // 권한 ID (string)
    "code": "VIEW", // 권한 코드 (PermissionCode)
    "name": "그룹 조회", // 권한 이름 (string)
    "description": "그룹 정보를 조회할 수 있는 권한", // 권한 설명 (string?)
    "category": "GROUP", // 권한 카테고리 (PermissionCategory)
    "isActive": true, // 활성화 여부 (boolean)
    "sortOrder": 0, // 정렬 순서 (낮을수록 먼저 표시) (number)
    "createdAt": "2024-01-01T00:00:00.000Z", // 생성 일시 (Date)
    "updatedAt": "2024-01-01T00:00:00.000Z" // 수정 일시 (Date)
  } // 삭제된 권한 정보 (PermissionDto)
}
```

---

### PATCH `permissions/bulk/sort-order`

**요약:** 권한 일괄 정렬 순서 업데이트 (운영자 전용)

**설명:**
여러 권한의 정렬 순서를 한 번에 업데이트합니다. 드래그 앤 드롭 후 사용하세요.

**인증/권한:**
- AdminGuard

**Request Body:**

```json
{
  "items": [{"id":"perm-1","sortOrder":0},{"id":"perm-2","sortOrder":1},{"id":"perm-3","sortOrder":2}] // 권한 ID와 정렬 순서 배열 (PermissionSortOrderItem[])
}
```

---

