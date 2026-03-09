# docs/maintenance — 유지보수 문서 가이드

`docs/features/`가 **"무엇을 만들 것인가"** 를 설명하는 기획/설계 문서라면,
`docs/maintenance/`는 **"현재 어떻게 동작하는가"** 를 설명하는 운영/유지보수 참고 문서입니다.

---

## 목적

- 코드를 일일이 뒤지지 않고도 현재 구현 상태를 빠르게 파악
- 기능 추가/수정 시 영향 범위를 사전에 확인
- 알려진 이슈나 미완성 항목을 명시적으로 기록

---

## 문서 목록

| 파일 | 설명 | 관련 기능 문서 |
|------|------|----------------|
| [group-permissions.md](./group-permissions.md) | 그룹 권한 체계 — Guards, PermissionCode, 엔드포인트별 권한 현황, 알려진 이슈 | [features/02-groups.md](../features/02-groups.md) |
| [notification-map.md](./notification-map.md) | 알림 발송 현황 맵 — 카테고리별 트리거, 수신자, 발송 방식, 소스 파일 | [features/10-notifications.md](../features/10-notifications.md) |

---

## 작성 기준

### 유지보수 문서에 적합한 내용
- 코드에 Guard/Decorator가 어떻게 적용되어 있는지
- 여러 파일에 분산된 동작(예: 알림 발송)의 전체 현황
- 구현과 설계가 다른 부분 (알려진 이슈)
- 미사용이지만 남아있는 코드/설정

### 유지보수 문서에 적합하지 않은 내용
- API 스펙 (→ `docs/api/`)
- 기능 설계와 비즈니스 로직 (→ `docs/features/`)
- 설치/환경 설정 (→ `docs/features/00-setup.md`)

---

## 업데이트 규칙

- **코드가 바뀌면 문서도 함께 바꾼다.** 문서가 코드와 다르면 신뢰할 수 없습니다.
- 새 Guard나 Permission을 추가하면 → `group-permissions.md` 업데이트
- 새 알림 발송 로직을 추가하면 → `notification-map.md` 업데이트
- 새 주제가 생기면 파일을 추가하고 이 README의 목록에 등록

---

## 새 문서 추가 시

1. `docs/maintenance/` 에 파일 생성
2. 상단에 목적과 관련 기능 문서 링크 명시
3. 이 README의 **문서 목록** 테이블에 추가
4. 관련이 있다면 CLAUDE.md에도 언급
