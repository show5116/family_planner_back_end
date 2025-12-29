# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Q&A

**Base Path:** `/qna`

### GET `qna/public-questions`

**요약:** 공개 질문 목록 조회

**Query Parameters:**

- `page` (`number`): 페이지 번호
- `limit` (`number`): 페이지 크기
- `status` (`QuestionStatus`) (Optional): 상태 필터 (PENDING, ANSWERED, RESOLVED)
- `category` (`QuestionCategory`) (Optional): 카테고리 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)
- `pinnedOnly` (`boolean`) (Optional): 고정 공지만 조회 여부

**Responses:**

#### 200 - 공개 질문 목록 조회 성공

---

### GET `qna/my-questions`

**요약:** 내 질문 목록 조회

**Query Parameters:**

- `page` (`number`): 페이지 번호
- `limit` (`number`): 페이지 크기
- `status` (`QuestionStatus`) (Optional): 상태 필터 (PENDING, ANSWERED, RESOLVED)
- `category` (`QuestionCategory`) (Optional): 카테고리 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)
- `pinnedOnly` (`boolean`) (Optional): 고정 공지만 조회 여부

**Responses:**

#### 200 - 내 질문 목록 조회 성공

---

### GET `qna/questions/:id`

**요약:** 질문 상세 조회

**인증/권한:**

- QuestionVisibilityGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 상세 조회 성공

#### 404 - 질문을 찾을 수 없습니다

---

### POST `qna/questions`

**요약:** 질문 작성

**Request Body:**

```json
{
  "title": "앱이 자꾸 종료돼요", // 질문 제목 (string)
  "content": "홈 화면에서 특정 버튼을 누르면 앱이 종료됩니다.", // 질문 내용 (string)
  "category": null, // 질문 카테고리 (QuestionCategory)
  "visibility": null, // 공개 여부 (PUBLIC: 모든 사용자 조회 가능, PRIVATE: 본인/ADMIN만 조회 가능) (QuestionVisibility?)
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

#### 201 - 질문 작성 성공

---

### PUT `qna/questions/:id`

**요약:** 질문 수정 (본인만, PENDING 상태만)

**Path Parameters:**

- `id` (`string`)

**Request Body:**

```json
{
  "title": "", // 질문 제목 (string?)
  "content": "", // 질문 내용 (string?)
  "category": null, // 질문 카테고리 (QuestionCategory?)
  "visibility": null, // 공개 여부 (QuestionVisibility?)
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

#### 200 - 질문 수정 성공

#### 404 - 질문을 찾을 수 없습니다

---

### DELETE `qna/questions/:id`

**요약:** 질문 삭제 (본인만)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 404 - 질문을 찾을 수 없습니다

---

### PATCH `qna/questions/:id/resolve`

**요약:** 질문 해결 완료 처리 (본인만, ANSWERED 상태만)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 해결 완료 처리 성공

#### 404 - 질문을 찾을 수 없습니다

---
