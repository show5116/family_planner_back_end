# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 링크 프리뷰

**Base Path:** `/link-preview`

### GET `link-preview`

**요약:** URL 링크 미리보기 (OG 태그 파싱)

**Query Parameters:**

- `query` (`LinkPreviewQueryDto`)

**Responses:**

#### 200 - 링크 미리보기 성공

```json
{
  "url": "https://example.com/article", // 요청한 URL (string)
  "title": "페이지 제목", // 페이지 제목 (string | null)
  "description": "페이지 설명", // 페이지 설명 (string | null)
  "image": "https://example.com/og.jpg", // OG 이미지 URL (string | null)
  "siteName": "Example" // 사이트명 (string | null)
}
```

#### 403 - 내부 네트워크 주소는 허용되지 않습니다

---
