# Pre Development Workflow

개발 시작 전 필요한 문서를 자동으로 찾아 요약하고 가이드를 제공합니다.

## 사용 시점
- 새로운 기능 개발 시작 전
- 버그 수정 시작 전

## 실행 순서

### 1. 기능명 입력
예: "공지사항", "알림", "이메일 인증"

### 2. ROADMAP 우선순위 확인
```markdown
📍 ROADMAP 정보
- Phase: Phase 1 - 사용자 관리 및 그룹 기능
- 우선순위: 높음
- 상태: 🟡 In Progress
- 진행률: 85%
```

### 3. 기능 문서 요약
`docs/features/[기능명]/` 검색

```markdown
📚 기능 문서 요약
- requirements.md: 요구사항 (✅/🟨/⬜)
- api.md: API 엔드포인트
- database.md: DB 스키마
- implementation.md: 구현 상세
```

### 4. CODE_STYLE 핵심 규칙
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

### 5. 개발 시작 가이드
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

## 문서 찾기 실패 시
```
⚠️  docs/features/xxx/ 없음
📝 새 기능 문서를 생성하시겠습니까?
```

## 참고
- [ROADMAP.md](../../../ROADMAP.md)
- [CODE_STYLE.md](../../../CODE_STYLE.md)
- [post-dev.md](post-dev.md)
