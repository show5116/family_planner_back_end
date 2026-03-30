# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## AI

**Base Path:** `/ai/market-briefing`

### GET `ai/market-briefing`

**요약:** 시황 브리핑 조회 (매크로, 국내, 글로벌)

**Responses:**

#### 200 - 시황 브리핑 조회 성공

```json
{
  "macro": {
    "title": "매크로 동향 현황 업데이트", // 브리핑 제목 (string)
    "content": "", // 브리핑 내용 (string)
    "updated_at": "2026-03-30T07:00:00.000Z" // 마지막 업데이트 시각 (ISO 8601) (string)
  }, // MarketBriefingDto | null
  "domestic_market": {
    "title": "매크로 동향 현황 업데이트", // 브리핑 제목 (string)
    "content": "", // 브리핑 내용 (string)
    "updated_at": "2026-03-30T07:00:00.000Z" // 마지막 업데이트 시각 (ISO 8601) (string)
  }, // MarketBriefingDto | null
  "global_market": {
    "title": "매크로 동향 현황 업데이트", // 브리핑 제목 (string)
    "content": "", // 브리핑 내용 (string)
    "updated_at": "2026-03-30T07:00:00.000Z" // 마지막 업데이트 시각 (ISO 8601) (string)
  } // MarketBriefingDto | null
}
```

---
