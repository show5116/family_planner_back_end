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

---

### GET `announcements/:id`

**요약:** 공지사항 상세 조회

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 공지사항 상세 조회 성공

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

#### 404 - 공지사항을 찾을 수 없습니다

---

### DELETE `announcements/:id`

**요약:** 공지사항 삭제 (ADMIN 전용)

**인증/권한:**

- AdminGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

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

#### 404 - 공지사항을 찾을 수 없습니다

---
