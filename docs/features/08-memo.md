# 08. 메모 관리 (Memo Management)

> **상태**: ✅ 완료
> **Phase**: Phase 4

---

## 개요

개인 및 그룹의 메모를 작성하고 공유하는 시스템입니다. Markdown/HTML 형식을 지원합니다.

---

## 주요 기능

### 메모 등록
- 제목, 본문 (Markdown/HTML), 태그
- Markdown 에디터, HTML WYSIWYG 에디터, 코드 하이라이팅, 이미지 첨부

### 메모 공유
- 공유 대상: 본인만, 그룹 전체, 특정 멤버 선택
- 권한 설정: 조회만, 수정 가능, 댓글 작성 가능

### 태그
- 자유 태그 입력, 태그 검색, 태그별 필터링

### 체크리스트 메모 (Checklist)
- 메모 타입을 `CHECKLIST`로 지정하면 체크리스트 모드로 동작
- 여행 준비물, 장보기 목록 등 반복 사용 가능한 체크리스트 작성
- 각 항목(`ChecklistItem`)별 체크 여부(`isChecked`) 저장
- **전체 선택/해제**: `checkAll` 쿼리 파라미터로 전체 선택 또는 전체 해제
- 항목 순서(`order`) 지정으로 정렬 유지
- 메모 수정 API에서 `checklistItems` 포함 시 기존 항목 전체 교체 (순서 포함)

### 핀 기능
- 메모 핀 토글 (`POST /memos/:id/pin`)
- 핀된 메모 목록 조회 — 대시보드 위젯용 (`GET /memos/pinned`)
- 목록 조회 시 핀된 메모 최상단 정렬 (`isPinned: desc`)

---

## 데이터베이스 (예상)

```prisma
model Memo {
  id             String         @id @default(uuid())
  groupId        String?
  userId         String
  title          String         @db.VarChar(200)
  content        String         @db.Text
  format         MemoFormat     @default(MARKDOWN)
  type           MemoType       @default(NOTE)      // NOTE | CHECKLIST
  visibility     MemoVisibility @default(PRIVATE)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  deletedAt      DateTime?

  tags           MemoTag[]
  attachments    MemoAttachment[]
  checklistItems ChecklistItem[]
}

enum MemoFormat {
  MARKDOWN
  HTML
  PLAIN
}

enum MemoType {
  NOTE       // 일반 메모
  CHECKLIST  // 체크리스트 메모
}

enum MemoVisibility {
  PRIVATE
  GROUP
}

model MemoTag {
  id     String  @id @default(uuid())
  memoId String
  name   String  @db.VarChar(50)
  memo   Memo    @relation(fields: [memoId], references: [id], onDelete: Cascade)
}

model MemoAttachment {
  id        String   @id @default(uuid())
  memoId    String
  fileName  String   @db.VarChar(255)
  fileUrl   String   @db.VarChar(500)
  fileSize  Int
  mimeType  String   @db.VarChar(100)
  createdAt DateTime @default(now())
  memo      Memo     @relation(fields: [memoId], references: [id], onDelete: Cascade)
}

// 체크리스트 항목
model ChecklistItem {
  id        String   @id @default(uuid())
  memoId    String
  content   String   @db.VarChar(300)  // 항목 내용
  isChecked Boolean  @default(false)   // 체크 여부
  order     Int      @default(0)       // 정렬 순서
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  memo      Memo     @relation(fields: [memoId], references: [id], onDelete: Cascade)

  @@index([memoId, order])
}
```

---

## 구현 상태

### ✅ 완료
- [x] 메모 CRUD (생성, 조회, 수정, 삭제)
- [x] Markdown/HTML/PLAIN 형식 지원
- [x] 태그 시스템 (자유 태그 입력, 추가, 삭제)
- [x] 태그별 필터링 및 검색
- [x] 태그 이름 목록 조회 (중복 제거, 그룹/개인 필터)
- [x] 파일 첨부 (추가, 삭제)
- [x] 그룹 공유 (`MemoVisibility.GROUP`)
- [x] 핀 기능 (토글, 핀된 목록 조회)
- [x] 체크리스트 메모 (`MemoType.CHECKLIST`)
  - [x] ChecklistItem CRUD (항목 생성, 수정, 삭제)
  - [x] 항목 순서 지정 (`order`)
  - [x] 메모 수정 시 체크리스트 항목 일괄 교체 (순서 포함)
  - [x] 항목 체크/해제 토글 (`POST /memos/:id/checklist/:itemId/toggle`)
  - [x] 전체 선택/해제 (`POST /memos/:id/checklist/toggle-all?checkAll=true|false`)
- [x] XSS 방어 (sanitize-html, HTML content 입력 시 화이트리스트 기반 sanitize)

### ⬜ TODO / 향후 고려
- [ ] 이미지 첨부 (Cloudflare R2)
- [ ] 메모 버전 관리
- [ ] 메모 템플릿

---

## API 엔드포인트

### 메모 기본

| Method | Endpoint         | 설명                      | 권한       |
| ------ | ---------------- | ------------------------- | ---------- |
| POST   | `/memos`         | 메모 생성                 | JWT        |
| GET    | `/memos`         | 메모 목록 (페이지네이션)  | JWT        |
| GET    | `/memos/pinned`  | 핀된 메모 목록            | JWT        |
| GET    | `/memos/tags`    | 태그 이름 목록 (중복 제거) | JWT        |
| GET    | `/memos/:id`     | 메모 상세                 | JWT        |
| PATCH  | `/memos/:id`     | 메모 수정 (체크리스트 포함) | JWT, Owner |
| DELETE | `/memos/:id`     | 메모 삭제                 | JWT, Owner |
| POST   | `/memos/:id/pin` | 핀 토글                   | JWT, Owner |

### 태그 / 첨부파일

| Method | Endpoint                               | 설명          | 권한       |
| ------ | -------------------------------------- | ------------- | ---------- |
| POST   | `/memos/:id/tags`                      | 태그 추가     | JWT, Owner |
| DELETE | `/memos/:id/tags/:tagId`               | 태그 삭제     | JWT, Owner |
| POST   | `/memos/:id/attachments`               | 첨부파일 추가 | JWT, Owner |
| DELETE | `/memos/:id/attachments/:attachmentId` | 첨부파일 삭제 | JWT, Owner |

### 체크리스트 (MemoType = CHECKLIST)

| Method | Endpoint                                          | 설명                                         | 권한       |
| ------ | ------------------------------------------------- | -------------------------------------------- | ---------- |
| POST   | `/memos/:id/checklist`                            | 항목 추가                                    | JWT, Owner |
| PATCH  | `/memos/:id/checklist/:itemId`                    | 항목 내용/순서 수정                          | JWT, Owner |
| DELETE | `/memos/:id/checklist/:itemId`                    | 항목 삭제                                    | JWT, Owner |
| POST   | `/memos/:id/checklist/:itemId/toggle`             | 항목 체크/해제 토글                          | JWT, Owner |
| POST   | `/memos/:id/checklist/toggle-all?checkAll=<bool>` | 전체 선택(`true`) / 전체 해제(`false`, 기본) | JWT, Owner |

---

**Last Updated**: 2026-03-22
