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
