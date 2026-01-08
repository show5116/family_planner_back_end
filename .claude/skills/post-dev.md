# Post Development Workflow

⚠️ **DEPRECATED**: 이 스킬은 더 이상 사용되지 않습니다.

**대신 사용:**
- `/validate` - 빠른 검증 (TypeScript/ESLint/CODE_STYLE)
- `/finalize` - 문서화 및 마무리

자세한 내용은 [WORKFLOW.md](WORKFLOW.md)를 참고하세요.

---

<details>
<summary>기존 문서 (참고용)</summary>

개발 완료 후 자동으로 실행하는 체크리스트 워크플로우입니다.

## 사용 시점
- 기능 구현 완료 후
- Git commit 전

## 실행 순서

### 1. 코드 검사
```bash
npm run check
```
- TypeScript 컴파일 에러 0개
- ESLint 에러 0개
- 통과 시 다음 단계 진행

### 2. 코드 스타일 검사
- 절대 경로 import
- Controller async 제거
- Response DTO 누락
- @ApiProperty 누락

### 3. 문서 업데이트
**대상:**
- `docs/features/[기능명]/api.md`
- `docs/features/[기능명]/database.md`
- `docs/features/[기능명]/implementation.md`
- `docs/features/[기능명]/requirements.md` (⬜ → 🟨 → ✅)

### 4. ROADMAP 진행률 업데이트
- 전체/완료 작업 수 계산
- 진행률 업데이트: `(완료 / 전체) × 100`
- 상태 아이콘 (🔴 → 🟡 → 🟢)

```markdown
### Phase 1: 사용자 관리 🟢
**진행률: 85% → 95%**
- [x] ~~사용자 인증~~ ✅
- [x] 이메일 인증 ✅ (새로 완료)
```

### 5. 최종 확인
- [ ] `npm run check` 통과
- [ ] 코드 스타일 검사 통과
- [ ] 문서 체크박스 업데이트
- [ ] 구현 완료 요약 작성
- [ ] ROADMAP 진행률 업데이트
- [ ] Swagger UI 확인
- [ ] Git commit 준비

## 통합 스킬
1. check-errors
2. code-style-check
3. update-docs
4. ROADMAP 진행률 계산

## 참고
- [check-errors.md](check-errors.md)
- [code-style-check.md](code-style-check.md)
- [update-docs.md](update-docs.md)

</details>
