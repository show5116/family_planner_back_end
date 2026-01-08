# Pre Development Workflow

개발 시작 전 필요한 문서를 자동으로 찾아 요약하고 가이드를 제공합니다.

## ⚠️ 중요 규칙

**해당 기능 문서만 읽기:**
- ❌ docs/features/ 전체 읽기 금지
- ✅ 해당 기능 문서만 읽기

예: "공지사항 개발" → `docs/features/11-announcements.md`만 읽음

## 실행 순서

### 1. 기능명 추출 및 정규화
사용자 입력에서 기능명 추출:
- "공지사항 개발" → "announcement" 또는 "공지사항"
- "알림 기능" → "notification" 또는 "알림"
- "Q&A" → "qna" 또는 "Q&A"

### 2. 문서 찾기 (토큰 최적화)

**우선순위 1: 정확한 패턴 매칭**
```bash
# 영문명으로 직접 검색
find docs/features/ -name "*announcement*.md"
find docs/features/ -name "*notification*.md"

# 또는 디렉토리명으로 검색
ls docs/features/ | grep -i "announcement"
```

**우선순위 2: 한글명 매핑 테이블**
```
공지사항 → 11-announcements.md
알림 → 10-notifications.md
Q&A → 12-qna.md
사용자 관리 → 01-user-management.md
그룹 → 02-groups.md
```

**우선순위 3: ROADMAP.md에서 검색** (마지막 수단)
```bash
# 키워드로 섹션 찾기
grep -A 5 "공지사항" ROADMAP.md
```

### 3. 해당 문서만 읽기
찾은 문서 파일만 읽기 (전체 디렉토리 스캔 금지)

### 4. 문서 요약
해당 문서의 요구사항, API, DB 스키마 확인

### 5. CODE_STYLE 핵심 규칙
```markdown
📖 CODE_STYLE 핵심 규칙

Controller:
✅ 절대 경로: import ... from '@/...'
✅ 한글 태그: @ApiTags('인증')
✅ Response DTO: @ApiSuccess({ type: UserDto })
❌ async 제거
✅ @Request() req → req.user.userId

Service:
✅ userId 첫 번째 파라미터
✅ JSDoc 주석
✅ 에러 처리

DTO:
✅ @ApiProperty({ description, example })
✅ Response DTO 별도 파일
```

### 6. 개발 시작 가이드
```markdown
🚀 개발 시작 가이드

1. 구현 순서
- Prisma 스키마
- DTO (Request, Response)
- Service (비즈니스 로직)
- Controller (엔드포인트)
- Swagger 문서화
- 테스트

2. 주의사항
⚠️  CODE_STYLE.md 준수

3. 완료 후 체크
- [ ] npm run check
- [ ] Swagger UI
- [ ] 문서 업데이트
```

## 토큰 최적화 전략

### 1. 직접 경로 접근 (가장 효율적)
```
사용자: "공지사항 개발 시작"
→ docs/features/11-announcements.md 직접 읽기
→ 토큰 사용: ~2000 (문서 1개)
```

### 2. 패턴 검색 (보통)
```
사용자: "알림 기능"
→ find docs/features/ -name "*notification*"
→ docs/features/10-notifications.md 읽기
→ 토큰 사용: ~2500 (검색 + 문서)
```

### 3. ROADMAP 검색 (비효율, 최후 수단)
```
사용자: "새 기능"
→ ROADMAP.md 읽기 → 전체 기능 목록 확인
→ 토큰 사용: ~5000+ (ROADMAP + 문서)
```

**권장:** 항상 우선순위 1-2 사용, 3은 피하기

## 문서 찾기 실패 시
```
⚠️  docs/features/에서 [기능명] 문서를 찾을 수 없습니다

시도한 패턴:
- *announcement*.md
- *공지사항*.md
- 11-announcements.md

다음 중 선택:
1. 정확한 파일명 알려주기
2. ROADMAP.md에서 검색 (토큰 많이 사용)
3. 새 기능 문서 생성
```

## 참고
- [ROADMAP.md](../../../ROADMAP.md)
- [CODE_STYLE.md](../../../CODE_STYLE.md)
- [post-dev.md](post-dev.md)
