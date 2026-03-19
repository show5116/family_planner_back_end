# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 메모

**Base Path:** `/memos`

### POST `memos`

**요약:** 메모 생성

**Request Body:**

```json
{
  "title": "회의 메모", // 메모 제목 (string)
  "content": "# 회의 내용
- 항목 1
- 항목 2", // 메모 본문 (string)
  "format": null, // 메모 형식 (MemoFormat?)
  "type": null, // 메모 타입 (NOTE: 일반, CHECKLIST: 체크리스트) (MemoType?)
  "visibility": null, // 공개 범위 (MemoVisibility?)
  "groupId": "", // 그룹 ID (GROUP 공개 시 필수) (string?)
  "tags": [
    {
      "name": "중요" // 태그 이름 (string)
    }
  ] // 태그 목록 (CreateMemoTagDto[]?)
}
```

**Responses:**

#### 201 - 메모 생성 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요" // 태그 이름 (string)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `memos`

**요약:** 메모 목록 조회

**Query Parameters:**

- `page` (`number`) (Optional): 페이지 번호
- `limit` (`number`) (Optional): 페이지 크기
- `visibility` (`MemoVisibility`) (Optional): 공개 범위 필터
- `tag` (`string`) (Optional): 태그 이름 필터
- `groupId` (`string`) (Optional): 그룹 ID 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)

**Responses:**

#### 200 - 메모 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid-1234", // 메모 ID (string)
      "title": "회의 메모", // 제목 (string)
      "content": "", // 본문 (string)
      "format": null, // 메모 형식 (MemoFormat)
      "type": null, // 메모 타입 (MemoType)
      "visibility": null, // 공개 범위 (MemoVisibility)
      "isPinned": false, // 핀 여부 (boolean)
      "groupId": null, // 그룹 ID (string | null)
      "user": {
        "id": "uuid-1234",
        "name": "홍길동"
      }, // 작성자 정보 (MemoAuthorDto)
      "tags": {
        "id": "uuid-1234",
        "name": "중요"
      }, // 태그 목록 (MemoTagDto[])
      "attachments": {
        "id": "uuid-1234",
        "fileName": "document.pdf",
        "fileUrl": "",
        "fileSize": 1024,
        "mimeType": "application/pdf",
        "createdAt": "2025-01-01T00:00:00Z"
      }, // 첨부파일 목록 (MemoAttachmentDto[])
      "checklistItems": {
        "id": "uuid-1234",
        "content": "여권 챙기기",
        "isChecked": false,
        "order": 0,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }, // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 메모 목록 (MemoDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `memos/pinned`

**요약:** 핀된 메모 목록 조회 (대시보드 위젯용)

**Responses:**

#### 200 - 핀된 메모 목록 조회 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요" // 태그 이름 (string)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

---

### GET `memos/:id`

**요약:** 메모 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 메모 상세 조회 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요" // 태그 이름 (string)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 메모에 접근할 권한이 없습니다

---

### PATCH `memos/:id`

**요약:** 메모 수정

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 메모 수정 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요" // 태그 이름 (string)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id`

**요약:** 메모 삭제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 메모 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 삭제할 수 있습니다

---

### POST `memos/:id/pin`

**요약:** 메모 핀 토글 (핀 ↔ 핀 해제)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 핀 토글 성공

```json
{
  "id": "uuid-1234", // 메모 ID (string)
  "title": "회의 메모", // 제목 (string)
  "content": "", // 본문 (string)
  "format": null, // 메모 형식 (MemoFormat)
  "type": null, // 메모 타입 (MemoType)
  "visibility": null, // 공개 범위 (MemoVisibility)
  "isPinned": false, // 핀 여부 (boolean)
  "groupId": null, // 그룹 ID (string | null)
  "user": {
    "id": "uuid-1234", // 작성자 ID (string)
    "name": "홍길동" // 작성자 이름 (string)
  }, // 작성자 정보 (MemoAuthorDto)
  "tags": [
    {
      "id": "uuid-1234", // 태그 ID (string)
      "name": "중요" // 태그 이름 (string)
    }
  ], // 태그 목록 (MemoTagDto[])
  "attachments": [
    {
      "id": "uuid-1234", // 첨부파일 ID (string)
      "fileName": "document.pdf", // 파일 이름 (string)
      "fileUrl": "", // 파일 URL (string)
      "fileSize": 1024, // 파일 크기 (bytes) (number)
      "mimeType": "application/pdf", // MIME 타입 (string)
      "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
    }
  ], // 첨부파일 목록 (MemoAttachmentDto[])
  "checklistItems": [
    {
      "id": "uuid-1234", // 항목 ID (string)
      "content": "여권 챙기기", // 항목 내용 (string)
      "isChecked": false, // 체크 여부 (boolean)
      "order": 0, // 정렬 순서 (number)
      "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
    }
  ], // 체크리스트 항목 목록 (type=CHECKLIST일 때) (ChecklistItemDto[])
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 핀 설정할 수 있습니다

---

### POST `memos/:id/tags`

**요약:** 메모 태그 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "name": "중요" // 태그 이름 (string)
}
```

**Responses:**

#### 201 - 태그 추가 성공

```json
{
  "id": "uuid-1234", // 태그 ID (string)
  "name": "중요" // 태그 이름 (string)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id/tags/:tagId`

**요약:** 메모 태그 삭제

**Path Parameters:**

- `id` (`string`)
- `tagId` (`string`)

**Responses:**

#### 200 - 태그 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 태그를 찾을 수 없습니다

---

### POST `memos/:id/attachments`

**요약:** 메모 첨부파일 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "fileName": "document.pdf", // 파일 이름 (string)
  "fileUrl": "", // 파일 URL (string)
  "fileSize": 1024, // 파일 크기 (bytes) (number)
  "mimeType": "application/pdf" // MIME 타입 (string)
}
```

**Responses:**

#### 201 - 첨부파일 추가 성공

```json
{
  "id": "uuid-1234", // 첨부파일 ID (string)
  "fileName": "document.pdf", // 파일 이름 (string)
  "fileUrl": "", // 파일 URL (string)
  "fileSize": 1024, // 파일 크기 (bytes) (number)
  "mimeType": "application/pdf", // MIME 타입 (string)
  "createdAt": "2025-01-01T00:00:00Z" // 생성일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id/attachments/:attachmentId`

**요약:** 메모 첨부파일 삭제

**Path Parameters:**

- `id` (`string`)
- `attachmentId` (`string`)

**Responses:**

#### 200 - 첨부파일 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 첨부파일을 찾을 수 없습니다

---

### POST `memos/:id/checklist`

**요약:** 체크리스트 항목 추가

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "content": "여권 챙기기", // 항목 내용 (string)
  "order": 0 // 정렬 순서 (number?)
}
```

**Responses:**

#### 201 - 항목 추가 성공

```json
{
  "id": "uuid-1234", // 항목 ID (string)
  "content": "여권 챙기기", // 항목 내용 (string)
  "isChecked": false, // 체크 여부 (boolean)
  "order": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### PATCH `memos/:id/checklist/:itemId`

**요약:** 체크리스트 항목 수정 (내용/순서)

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Request Body:**

```json
{
  "content": "여권 챙기기", // 항목 내용 (string?)
  "order": 1 // 정렬 순서 (number?)
}
```

**Responses:**

#### 200 - 항목 수정 성공

```json
{
  "id": "uuid-1234", // 항목 ID (string)
  "content": "여권 챙기기", // 항목 내용 (string)
  "isChecked": false, // 체크 여부 (boolean)
  "order": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 항목을 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### DELETE `memos/:id/checklist/:itemId`

**요약:** 체크리스트 항목 삭제

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Responses:**

#### 200 - 항목 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 항목을 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### POST `memos/:id/checklist/:itemId/toggle`

**요약:** 체크리스트 항목 체크/해제 토글

**Path Parameters:**

- `id` (`string`)
- `itemId` (`string`)

**Responses:**

#### 200 - 토글 성공

```json
{
  "id": "uuid-1234", // 항목 ID (string)
  "content": "여권 챙기기", // 항목 내용 (string)
  "isChecked": false, // 체크 여부 (boolean)
  "order": 0, // 정렬 순서 (number)
  "createdAt": "2025-01-01T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-01-01T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 항목을 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---

### POST `memos/:id/checklist/reset`

**요약:** 체크리스트 전체 체크 해제

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 전체 체크 해제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 메모를 찾을 수 없습니다

#### 403 - 본인의 메모만 수정할 수 있습니다

---
