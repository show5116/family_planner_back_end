# 08. 메모 관리 (Memo Management)

> **상태**: 🟡 진행 중
> **Phase**: Phase 4

---

## 개요

개인 및 그룹의 메모를 작성하고 공유하는 시스템입니다. Markdown/HTML 형식을 지원합니다.

---

## 주요 기능

### 메모 등록
- 제목, 본문 (Markdown/HTML), 카테고리, 태그
- Markdown 에디터, HTML WYSIWYG 에디터, 코드 하이라이팅, 이미지 첨부

### 메모 공유
- 공유 대상: 본인만, 그룹 전체, 특정 멤버 선택
- 권한 설정: 조회만, 수정 가능, 댓글 작성 가능

### 카테고리 및 태그
- 카테고리: 개인 메모, 회의록, 레시피, 여행 계획, 기타
- 태그: 자유 태그 입력, 태그 검색, 태그별 필터링

### 체크리스트 메모 (Checklist)
- 메모 타입을 `CHECKLIST`로 지정하면 체크리스트 모드로 동작
- 여행 준비물, 장보기 목록 등 반복 사용 가능한 체크리스트 작성
- 각 항목(`ChecklistItem`)별 체크 여부(`isChecked`) 저장
- **전체 체크 해제**: 체크리스트 항목을 모두 미체크 상태로 초기화 → 다음번 재사용 지원
- 항목 순서(`order`) 지정으로 정렬 유지

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
  category       String?        @db.VarChar(50)
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
  color  String? @db.VarChar(7)
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
- [x] 카테고리 관리 (개인 메모, 회의록, 레시피 등)
- [x] 태그 시스템 (자유 태그 입력)
- [x] 태그별 필터링
- [x] 태그 검색
- [x] 파일 첨부

### 🚧 진행 중
- [ ] 체크리스트 메모 (`MemoType.CHECKLIST`)
  - [ ] ChecklistItem CRUD (항목 생성, 수정, 삭제, 순서 변경)
  - [ ] 항목 체크/해제 (`PATCH /memos/:id/checklist/:itemId/toggle`)
  - [ ] 전체 체크 해제 (`POST /memos/:id/checklist/reset`)

### ⬜ TODO / 향후 고려
- [ ] 메모 공유 (그룹 전체)
- [ ] Markdown 에디터 통합
- [ ] HTML WYSIWYG 에디터
- [ ] 코드 하이라이팅
- [ ] 이미지 첨부 (Cloudflare R2)
- [ ] 메모 버전 관리
- [ ] 메모 검색 기능
- [ ] 메모 템플릿

---

## API 엔드포인트

### 메모 기본

| Method | Endpoint    | 설명      | 권한       |
| ------ | ----------- | --------- | ---------- |
| POST   | `/memos`    | 메모 생성 | JWT        |
| GET    | `/memos`    | 메모 목록 | JWT        |
| GET    | `/memos/:id` | 메모 상세 | JWT        |
| PATCH  | `/memos/:id` | 메모 수정 | JWT, Owner |
| DELETE | `/memos/:id` | 메모 삭제 | JWT, Owner |

### 태그 / 첨부파일

| Method | Endpoint                               | 설명          | 권한       |
| ------ | -------------------------------------- | ------------- | ---------- |
| POST   | `/memos/:id/tags`                      | 태그 추가     | JWT, Owner |
| DELETE | `/memos/:id/tags/:tagId`               | 태그 삭제     | JWT, Owner |
| POST   | `/memos/:id/attachments`               | 첨부파일 추가 | JWT, Owner |
| DELETE | `/memos/:id/attachments/:attachmentId` | 첨부파일 삭제 | JWT, Owner |

### 체크리스트 (MemoType = CHECKLIST)

| Method | Endpoint                              | 설명                | 권한       |
| ------ | ------------------------------------- | ------------------- | ---------- |
| POST   | `/memos/:id/checklist`                | 항목 추가           | JWT, Owner |
| PATCH  | `/memos/:id/checklist/:itemId`        | 항목 내용/순서 수정 | JWT, Owner |
| DELETE | `/memos/:id/checklist/:itemId`        | 항목 삭제           | JWT, Owner |
| POST   | `/memos/:id/checklist/:itemId/toggle` | 항목 체크/해제 토글 | JWT, Owner |
| POST   | `/memos/:id/checklist/reset`          | 전체 체크 해제      | JWT, Owner |

---

**Last Updated**: 2026-02-23
