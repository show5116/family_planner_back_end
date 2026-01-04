# Prisma Workflow

Prisma 스키마 변경 시 안전하게 generate → migrate 워크플로우를 실행합니다.

## 사용 시점
- Prisma 스키마 파일 수정 후
- 새로운 모델 추가 후
- 필드 추가/수정/삭제 후

## 실행 순서

### 1. 스키마 변경 확인
```bash
git diff prisma/schema.prisma
```

### 2. Prisma Client 생성
```bash
npm run prisma:generate
```
- TypeScript 타입 생성
- `@prisma/client` 업데이트

### 3. 마이그레이션 생성
```bash
npm run prisma:migrate
# ? Enter a name: add_email_verification
```

**이름 규칙:** 영문 소문자 + 언더스코어
- `add_email_verification`
- `add_announcement_table`
- `update_user_profile_fields`

### 4. SQL 미리보기
```bash
cat prisma/migrations/$(ls -t prisma/migrations | head -1)/migration.sql
```

**확인:**
- ✅ 테이블/필드 이름
- ✅ 필드 타입
- ✅ 외래 키 관계
- ❌ 데이터 손실 위험 (DROP COLUMN, DROP TABLE)

### 5. 데이터베이스 확인
```bash
npm run prisma:studio
```

### 6. 문서 업데이트
`docs/features/[기능명]/database.md` 업데이트

## 에러 처리

### Generate 실패
```
❌ Schema parsing failed
→ 스키마 문법/중복 모델/관계 설정 확인
```

### Migrate 실패
```
❌ Migration failed
→ DATABASE_URL/연결 상태/외래 키 제약 확인
→ 필요 시: npx prisma migrate reset (⚠️ 개발 환경만!)
```

## 체크리스트

**스키마:**
- [ ] 모델 PascalCase (예: `EmailVerification`)
- [ ] 필드 camelCase (예: `expiresAt`)
- [ ] `@id`, `@default`, `@relation` 확인
- [ ] 인덱스 (`@@index`) 확인

**마이그레이션:**
- [ ] `prisma:generate` 성공
- [ ] `prisma:migrate` 성공
- [ ] SQL 미리보기
- [ ] Prisma Studio 확인

**문서:**
- [ ] `database.md` 업데이트

**Git:**
- [ ] `prisma/schema.prisma` 커밋
- [ ] `prisma/migrations/` 커밋

## 주의사항
- 항상 generate → migrate 순서
- 프로덕션: `migrate deploy` 사용
- 데이터 손실 위험 변경은 신중하게

## 참고
- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
