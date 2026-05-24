# CLAUDE.md

가족 플래너 NestJS 백엔드 프로젝트 가이드

## ⚠️ 문서 읽기 규칙 (필수)

**해당 기능의 문서만 읽으세요:**
- 공지사항 작업 → `docs/features/11-announcements.md`만
- 알림 작업 → `docs/features/10-notifications.md`만
- Q&A 작업 → `docs/features/12-qna.md`만

**절대 전체 문서를 읽지 마세요!** 토큰 낭비입니다.

## 문서 구조

개발 시 **해당 기능 문서만** 참고:
- 기능별 문서: `docs/features/XX-기능명.md`
- 유지보수 문서: `docs/maintenance/` — 현재 구현 상태, 권한 현황, 알림 맵 등
- 전체 로드맵: [ROADMAP.md](ROADMAP.md)
- 코드 스타일: [CODE_STYLE.md](CODE_STYLE.md)

## 개발 워크플로우

**.claude/skills/** 디렉토리의 스킬 참고

## 코드 작성 규칙

**[CODE_STYLE.md](CODE_STYLE.md)** 필수 확인
- 절대 경로 (`@/`)
- Response DTO 클래스 사용
- `@Request() req` → `req.user.userId`
- Controller에서 async 제거

## 중요 명령어

```bash
npm run check              # 코드 수정 후 반드시 실행!
npm run prisma:generate    # Prisma 스키마 수정 후
```

## 데이터베이스

- MySQL (Railway 배포)
- Prisma ORM
- `.env`에서 `DATABASE_URL` 설정
- 개발 DB(`family_dev`)와 양산 DB가 분리되어 있음

### ⚠️ 스키마 변경 시 필수 절차

`prisma db push`로 개발 DB에 반영하더라도 **반드시 마이그레이션 파일을 함께 생성**해야 한다.
마이그레이션 파일이 없으면 양산 DB에 적용 불가.

```bash
# 1. 개발 DB 반영
npx prisma db push

# 2. 마이그레이션 파일 수동 생성
#    prisma/migrations/YYYYMMDD000000_설명/migration.sql 작성

# 3. 히스토리 등록
npx prisma migrate resolve --applied YYYYMMDD000000_설명

# 4. 확인
npx prisma migrate status
```

shadow DB 문제가 없다면 `npx prisma migrate dev --name 설명` 한 번으로 가능.
