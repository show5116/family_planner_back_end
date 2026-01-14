# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Q&A (ADMIN)

**Base Path:** `/qna/admin`

### GET `qna/admin/questions`

**요약:** 모든 질문 목록 조회 (ADMIN 전용)

**설명:**
통합 API (/qna/questions?filter=all) 사용 권장. 이 엔드포인트는 하위 호환성을 위해 유지됩니다.

**Query Parameters:**

- `page` (`number`): 페이지 번호
- `limit` (`number`): 페이지 크기
- `status` (`QuestionStatus`) (Optional): 상태 필터 (PENDING, ANSWERED, RESOLVED)
- `category` (`QuestionCategory`) (Optional): 카테고리 필터
- `search` (`string`) (Optional): 검색어 (제목/내용)
- `filter` (`'public' | 'my' | 'all'`) (Optional): 질문 필터 (public: 공개 질문만, my: 내 질문만, all: 모든 질문 - ADMIN 전용)

**Responses:**

#### 200 - 질문 목록 조회 성공

```json
{
  "data": [
    {
      "id": "uuid", // 질문 ID (string)
      "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
      "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데...", // 내용 (미리보기 100자) (string)
      "category": null, // 카테고리 (QuestionCategory)
      "status": null, // 질문 상태 (QuestionStatus)
      "visibility": null, // 공개 여부 (QuestionVisibility)
      "answerCount": 1, // 답변 수 (number)
      "user": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 질문 목록 (QuestionListDto[])
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } // 페이지네이션 메타 정보 ({ total: number; page: number; limit: number; totalPages: number; })
}
```

---

### GET `qna/admin/statistics`

**요약:** 통계 조회 (ADMIN 전용)

**Responses:**

#### 200 - 통계 조회 성공

```json
{
  "totalQuestions": 150, // 전체 질문 수 (number)
  "pendingQuestions": 10, // 답변 대기 중 질문 수 (number)
  "answeredQuestions": 130, // 답변 완료 질문 수 (number)
  "resolvedQuestions": 120 // 해결 완료 질문 수 (number)
}
```

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

```json
{
  "id": "uuid", // 답변 ID (string)
  "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
  "adminId": "uuid", // 작성자 ID (string)
  "admin": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

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

```json
{
  "id": "uuid", // 답변 ID (string)
  "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
  "adminId": "uuid", // 작성자 ID (string)
  "admin": {
    "id": "uuid", // 사용자 ID (string)
    "name": "홍길동" // 사용자 이름 (string)
  }, // 작성자 정보 (QuestionUserDto)
  "attachments": [
    {
      "url": "", // 파일 URL (string)
      "name": "", // 파일 이름 (string)
      "size": 0 // 파일 크기 (bytes) (number)
    }
  ], // 첨부파일 목록 (AttachmentDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 답변을 찾을 수 없습니다

---

### DELETE `qna/admin/questions/:questionId/answers/:id`

**요약:** 답변 삭제 (ADMIN 전용)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 답변 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 답변을 찾을 수 없습니다

---
