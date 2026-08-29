# CLAUDE.md

가족 플래너 NestJS 백엔드 프로젝트 가이드

## ⚠️ 문서 읽기 규칙 (필수)

**해당 기능의 문서만 읽으세요:**
- 공지사항 작업 → `docs/features/11-announcements.md`만
- 알림 작업 → `docs/features/10-notifications.md`만
- Q&A 작업 → `docs/features/12-qna.md`만
- 루틴 작업 → `docs/features/20-routine.md`만

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

### ⚠️ CREATE TABLE에는 반드시 COLLATE 명시

마이그레이션 SQL에서 **`CREATE TABLE`을 작성하면 반드시 콜레이션까지 명시**한다.

```sql
-- ❌ 금지: charset만 지정 (서버 기본 콜레이션을 따라감)
) DEFAULT CHARACTER SET utf8mb4;

-- ✅ 필수: 콜레이션까지 명시
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**이유:** MySQL 8.0부터 서버 기본 콜레이션이 `utf8mb4_general_ci` → `utf8mb4_0900_ai_ci`로 바뀌었다.
콜레이션을 생략하면 서버 버전마다 다른 값이 적용되어, **개발 DB에서는 통과하고 양산에서만 실패**한다.

양산 DB(MySQL 9.x)의 기존 테이블은 전부 `utf8mb4_unicode_ci`이므로, 콜레이션이 다른 테이블을 만들면
FK 생성 시 아래 에러로 마이그레이션이 죽는다. 타입이 같아도(`varchar(191)`) 콜레이션이 다르면 FK를 걸 수 없다.

```
Database error code: 3780
Referencing column 'userId' and referenced column 'id' in
foreign key constraint 'xxx_userId_fkey' are incompatible.
```

이 경우 MySQL은 DDL 트랜잭션을 지원하지 않아 **일부 테이블만 생성된 채 중단**되고,
이후 모든 배포가 P3009로 막힌다. 잔여물 정리 → `migrate resolve --rolled-back` → 재적용이 필요하다.

`prisma migrate dev`가 자동 생성한 SQL에도 `COLLATE`가 빠져 있으므로, **생성 후 반드시 확인**한다.

```bash
# CREATE TABLE 개수와 COLLATE 개수가 일치해야 정상
grep -c "CREATE TABLE" prisma/migrations/YYYYMMDD000000_설명/migration.sql
grep -c "COLLATE utf8mb4_unicode_ci" prisma/migrations/YYYYMMDD000000_설명/migration.sql
```

## API 실동작 검증 (curl 등)

**`POST /v1/auth/signup`으로 테스트 유저를 새로 만들지 말 것.** `AuthService.signup()`이 개발 환경 스킵 없이 무조건 실제 이메일 인증 메일을 발송한다(`isEmailVerified`를 나중에 DB에서 직접 true로 바꿔도 메일은 이미 발송된 뒤라 막을 수 없음).

이미 이메일 인증 완료 상태로 준비된 기존 테스트 계정(`test-owner@familyplanner.test` / `Test1234!` 등)을 재사용한다. 절차는 **[.claude/skills/api-smoke-test.md](.claude/skills/api-smoke-test.md)** 참고.

## Git 커밋

**커밋은 사용자가 명시적으로 요청했을 때만 한다.** 코드 작성이 끝났거나, `npm run check`/실동작 검증이 통과했다고 해서 자동으로 커밋하지 않는다. "커밋해줘" 같은 직접적인 요청이 없으면 변경 사항을 워킹 트리에 그대로 두고 결과만 보고한다.
