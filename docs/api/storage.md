# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

생성일: 2025-12-19T15:05:41.996Z

---

## Storage

**Base Path:** `/storage`

### POST `storage/upload`

**요약:** 파일 업로드

**설명:**
Cloudflare R2에 파일을 업로드합니다.

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| folder | string | Yes | - |

**Responses:**

#### 201 - 파일 업로드 성공

#### 400 - 파일이 제공되지 않음

---

### GET `storage/download`

**요약:** 파일 다운로드 URL 생성

**설명:**
파일 다운로드를 위한 Presigned URL을 생성합니다.

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | - |
| expiresIn | number | No | - |

**Responses:**

#### 200 - Presigned URL 생성 성공

---

### DELETE `storage`

**요약:** 파일 삭제

**설명:**
R2에서 파일을 삭제합니다.

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | - |

**Responses:**

#### 200 - 파일 삭제 성공

---

### GET `storage/exists`

**요약:** 파일 존재 여부 확인

**설명:**
R2에 파일이 존재하는지 확인합니다.

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| key | string | Yes | - |

**Responses:**

#### 200 - 파일 존재 여부

---

