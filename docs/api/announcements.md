# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 공지사항

**Base Path:** `/announcements`

### GET `announcements`

**요약:** 공지사항 목록 조회

**Query Parameters:**

- `page` (`number`) (Optional): 페이지 번호
- `limit` (`number`) (Optional): 페이지 크기
- `pinnedOnly` (`boolean`) (Optional): 고정 공지만 조회

**Responses:**

#### 200 - 공지사항 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // 공지사항 ID (string)
      "title": "시스템 점검 안내", // 제목 (string)
      "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
      "isPinned": false, // 고정 여부 (boolean)
      "author": {
        "id": "uuid",
        "name": "관리자"
      }, // 작성자 정보 (AnnouncementAuthorDto)
      "readCount": 42, // 읽은 사람 수 (number)
      "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 공지사항 목록 (AnnouncementDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `announcements/:id`

**요약:** 공지사항 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 공지사항 상세 조회 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

### POST `announcements`

**요약:** 공지사항 작성 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Request Body:**

```json
{
  "title": "v2.0 업데이트 안내", // 공지사항 제목 (string)
  "content": "새로운 기능이 추가되었습니다...", // 공지사항 내용 (Markdown 지원) (string)
  "isPinned": false, // 상단 고정 여부 (boolean?)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ] // 첨부파일 목록 (AttachmentDto[]?)
}
```

**Responses:**

#### 201 - 공지사항 작성 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

---

### PUT `announcements/:id`

**요약:** 공지사항 수정 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{}
```

**Responses:**

#### 200 - 공지사항 수정 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

### DELETE `announcements/:id`

**요약:** 공지사항 삭제 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 공지사항 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---

### PATCH `announcements/:id/pin`

**요약:** 공지사항 고정/해제 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "isPinned": true // 고정 여부 (boolean)
}
```

**Responses:**

#### 200 - 공지사항 고정/해제 성공

```json
{
  "id": "uuid", // 공지사항 ID (string)
  "title": "시스템 점검 안내", // 제목 (string)
  "content": "2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.", // 내용 (string)
  "isPinned": false, // 고정 여부 (boolean)
  "author": {
    "id": "uuid", // 작성자 ID (string)
    "name": "관리자" // 작성자 이름 (string)
  }, // 작성자 정보 (AnnouncementAuthorDto)
  "readCount": 42, // 읽은 사람 수 (number)
  "isRead": false, // 현재 사용자가 읽었는지 여부 (boolean)
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 공지사항을 찾을 수 없습니다

---
