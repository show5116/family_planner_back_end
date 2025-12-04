# 08. 메모 관리 (Memo Management)

> **상태**: ⬜ 시작 안함
> **우선순위**: Medium
> **담당 Phase**: Phase 4

---

## 📋 개요

개인 및 그룹의 메모를 작성하고 공유하는 시스템입니다. Markdown/HTML 형식을 지원합니다.

---

## ⬜ 메모 등록

### 메모 정보
- 제목
- 본문 (Markdown/HTML)
- 카테고리
- 태그

### 에디터 지원
- Markdown 에디터
- HTML WYSIWYG 에디터
- 코드 하이라이팅
- 이미지 첨부

---

## ⬜ 메모 공유

### 공유 대상
- 본인만 보기
- 그룹 전체 공유
- 특정 멤버 선택 공유

### 권한 설정
- 조회만 가능
- 수정 가능
- 댓글 작성 가능

---

## ⬜ 카테고리 및 태그

### 카테고리
- 개인 메모
- 회의록
- 레시피
- 여행 계획
- 기타

### 태그
- 자유 태그 입력
- 태그 검색
- 태그별 필터링

---

## 🗄️ 데이터베이스 스키마 (예상)

```prisma
model Memo {
  id          String        @id @default(uuid())
  groupId     String?
  userId      String
  title       String
  content     String        @db.Text
  format      MemoFormat    @default(MARKDOWN)
  category    String?
  visibility  MemoVisibility @default(PRIVATE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  group       Group?        @relation(fields: [groupId], references: [id])
  user        User          @relation(fields: [userId], references: [id])
  participants MemoParticipant[]
  tags        MemoTag[]
  attachments MemoAttachment[]
}

enum MemoFormat {
  MARKDOWN
  HTML
  PLAIN
}

enum MemoVisibility {
  PRIVATE
  GROUP
  SELECTED
}

model MemoParticipant {
  id      String  @id @default(uuid())
  memoId  String
  userId  String
  canEdit Boolean @default(false)

  memo    Memo    @relation(fields: [memoId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([memoId, userId])
}

model MemoTag {
  id      String @id @default(uuid())
  memoId  String
  name    String
  color   String?

  memo    Memo   @relation(fields: [memoId], references: [id])
}

model MemoAttachment {
  id        String   @id @default(uuid())
  memoId    String
  fileName  String
  fileUrl   String
  fileSize  Int
  mimeType  String
  createdAt DateTime @default(now())

  memo      Memo     @relation(fields: [memoId], references: [id])
}
```

---

## 📝 API 엔드포인트 (예상)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/memos` | 메모 생성 | JWT |
| GET | `/memos` | 메모 목록 | JWT |
| GET | `/memos/:id` | 메모 상세 | JWT |
| PATCH | `/memos/:id` | 메모 수정 | JWT, Owner or CanEdit |
| DELETE | `/memos/:id` | 메모 삭제 | JWT, Owner |
| POST | `/memos/:id/participants` | 참여자 추가 | JWT, Owner |
| DELETE | `/memos/:id/participants/:userId` | 참여자 제거 | JWT, Owner |
| POST | `/memos/:id/tags` | 태그 추가 | JWT, Owner or CanEdit |
| POST | `/memos/:id/attachments` | 첨부파일 추가 | JWT, Owner or CanEdit |
| DELETE | `/memos/:id/attachments/:attachmentId` | 첨부파일 삭제 | JWT, Owner or CanEdit |

---

**Last Updated**: 2025-12-04
