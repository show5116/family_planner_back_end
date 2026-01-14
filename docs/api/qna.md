# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## Q&A

**Base Path:** `/qna`

### GET `qna/questions`

**요약:** 질문 목록 조회 (통합)

**설명:**
filter 파라미터로 조회 범위 설정: public(공개 질문), my(내 질문), all(모든 질문-ADMIN 전용)

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

### GET `qna/questions/:id`

**요약:** 질문 상세 조회

**인증/권한:**

- QuestionVisibilityGuard

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 상세 조회 성공

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
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
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

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

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
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
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

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

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
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
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 질문을 찾을 수 없습니다

---

### DELETE `qna/questions/:id`

**요약:** 질문 삭제 (본인만)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 삭제 성공

```json
{
  "message": "작업이 완료되었습니다" // string
}
```

#### 404 - 질문을 찾을 수 없습니다

---

### PATCH `qna/questions/:id/resolve`

**요약:** 질문 해결 완료 처리 (본인만, ANSWERED 상태만)

**Path Parameters:**

- `id` (`string`)

**Responses:**

#### 200 - 질문 해결 완료 처리 성공

```json
{
  "id": "uuid", // 질문 ID (string)
  "title": "그룹 초대는 어떻게 하나요?", // 제목 (string)
  "content": "안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.", // 내용 (string)
  "category": null, // 카테고리 (QuestionCategory)
  "status": null, // 질문 상태 (QuestionStatus)
  "visibility": null, // 공개 여부 (QuestionVisibility)
  "user": {
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
  "answers": [
    {
      "id": "uuid", // 답변 ID (string)
      "content": "그룹 초대는 그룹 설정 메뉴에서 가능합니다...", // 답변 내용 (string)
      "adminId": "uuid", // 작성자 ID (string)
      "admin": {
        "id": "uuid",
        "name": "홍길동"
      }, // 작성자 정보 (QuestionUserDto)
      "attachments": {
        "url": "",
        "name": "",
        "size": 0
      }, // 첨부파일 목록 (AttachmentDto[])
      "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
      "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
    }
  ], // 답변 목록 (AnswerDto[])
  "createdAt": "2025-12-30T00:00:00Z", // 생성일 (Date)
  "updatedAt": "2025-12-30T00:00:00Z" // 수정일 (Date)
}
```

#### 404 - 질문을 찾을 수 없습니다

---
