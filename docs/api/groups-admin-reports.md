# API Documentation

> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.

---

## 그룹 신고 (ADMIN)

**Base Path:** `/groups/admin/reports`

### GET `groups/admin/reports`

**요약:** 신고 목록 조회

**설명:**
status 쿼리로 필터 가능 (PENDING, REVIEWING, RESOLVED, DISMISSED)

**Query Parameters:**

- `status` (`ReportStatus`) - Optional

**Responses:**

#### 200 - 신고 목록 조회 성공

```json
{
  "id": "uuid", // 신고 ID (string)
  "groupId": "uuid", // 그룹 ID (string)
  "groupName": "우리 가족", // 그룹명 (string)
  "reporterName": "홍길동", // 신고자 이름 (string)
  "reportedName": "김철수", // 피신고자 이름 (string)
  "reason": "ABUSE", // 신고 사유 (string)
  "detail": null, // 상세 내용 (string | null)
  "status": "PENDING", // 처리 상태 (string)
  "resolveNote": null, // 처리 메모 (string | null)
  "resolvedAt": "2025-01-01T00:00:00Z", // 처리일 (Date | null)
  "resolvedByName": null, // 처리자 이름 (string | null)
  "createdAt": "2026-06-12T00:00:00Z" // 신고일 (Date)
}
```

---

### PATCH `groups/admin/reports/:reportId`

**요약:** 신고 처리 (상태 변경)

**Path Parameters:**

- `reportId` (`string`)

**Request Body:**

```json
{
  "status": null, // 처리 상태 (ReportStatus)
  "resolveNote": "확인 후 경고 조치 완료" // 처리 메모 (string?)
}
```

**Responses:**

#### 200 - 신고 처리 성공

```json
{
  "id": "uuid", // 신고 ID (string)
  "groupId": "uuid", // 그룹 ID (string)
  "reporterId": "uuid", // 신고자 ID (string)
  "reportedId": "uuid", // 피신고자 ID (string)
  "reason": "ABUSE", // 신고 사유 (string)
  "detail": "지속적으로 욕설을 사용합니다.", // 상세 내용 (string | null)
  "status": "PENDING", // 처리 상태 (string)
  "createdAt": "2026-06-12T00:00:00Z" // 신고일 (Date)
}
```

#### 404 - 신고를 찾을 수 없음

---
