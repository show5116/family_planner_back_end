# 테스트 계정 현황

플레이 스토어 심사 제출용으로 생성된 테스트 계정 정보입니다.

---

## 계정 정보

| 구분 | 이메일 | 비밀번호 | 이름 |
|------|--------|---------|------|
| 그룹장 (OWNER) | `test-owner@familyplanner.test` | `Test1234!` | 테스트 그룹장 |
| 멤버 (DEFAULT) | `test-member@familyplanner.test` | `Test1234!` | 테스트 멤버 |

- 소속 그룹: **테스트 가족**
- 이메일 인증 완료 상태 (`isEmailVerified: true`)로 생성됨 — 실제 메일 없이 바로 로그인 가능

---

## 생성 방법

```bash
npx ts-node -r tsconfig-paths/register scripts/create-test-account.ts
```

- 이미 계정/그룹이 존재하면 중복 생성 없이 건너뜀 (멱등성 보장)
- DB에 OWNER / isDefaultRole 공통 역할이 시드되어 있어야 함

---

## 유의사항

- 비밀번호, 이메일을 변경할 경우 이 문서도 함께 업데이트
- 계정을 삭제하려면 Prisma Studio 또는 직접 SQL로 제거
