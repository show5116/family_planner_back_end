# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Q&A (ADMIN)

**Base Path:** `/qna/admin`

### GET `qna/admin/questions`

**요약:** 모든 질문 목록 조회 (ADMIN 전용)

**Query Parameters:**

- `page` (`number`): 페이지 번호
- `limit` (`number`): 페이지 크기
- `status` (`QuestionStatus`) (Optional): 상태 필터 (PENDING, ANSWERED, RESOLVED)
- `category` (`QuestionCategory`) (Optional): 카테고리 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)
- `pinnedOnly` (`boolean`) (Optional): 고정 공지만 조회 여부

**Responses:**

#### 200 - 질문 목록 조회 성공

---

### GET `qna/admin/statistics`

**요약:** 통계 조회 (ADMIN 전용)

**Responses:**

#### 200 - 통계 조회 성공

---

### POST `qna/admin/questions/:questionId/answers`

**요약:** 답변 작성 (ADMIN 전용)

**Path Parameters:**

- `questionId` (`string`)

**Request Body:**

```json
{
  "content": "해당 문제는 최신 버전에서 수정되었습니다. 앱을 업데이트 해주세요.", // 답변 내용 (string)
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

#### 201 - 답변 작성 성공

#### 404 - 질문을 찾을 수 없습니다

---

### PUT `qna/admin/questions/:questionId/answers/:id`

**요약:** 답변 수정 (ADMIN 전용)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "content": "", // 답변 내용 (string?)
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

#### 200 - 답변 수정 성공

#### 404 - 답변을 찾을 수 없습니다

---

### DELETE `qna/admin/questions/:questionId/answers/:id`

**요약:** 답변 삭제 (ADMIN 전용)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 404 - 답변을 찾을 수 없습니다

---
