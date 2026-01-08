# Update Documentation After Code Changes

⚠️ **DEPRECATED**: 이 스킬은 `/finalize`에 통합되었습니다.

**대신 사용:** `/finalize` (문서 업데이트 + ROADMAP 진행률 + 최종 확인)

---

<details>
<summary>기존 문서 (참고용)</summary>

비즈니스 로직 변경 시 관련 문서를 자동으로 찾아서 업데이트하는 스킬입니다.

## 사용 시점
- 비즈니스 로직을 수정한 후
- 새로운 기능을 추가한 후
- API 엔드포인트를 변경한 후
- 데이터베이스 스키마를 수정한 후

## 실행 순서

### 1. 변경 사항 분석
코드 변경 내역을 분석하여 영향 범위를 파악합니다.

**확인 항목:**
- 수정된 모듈/기능 (예: auth, group, notification 등)
- 변경된 API 엔드포인트 (추가/수정/삭제)
- 수정된 비즈니스 로직
- 변경된 데이터베이스 스키마

### 2. 관련 문서 찾기
변경된 기능과 관련된 문서를 찾습니다.

**문서 위치:**
```
docs/features/[기능명]/
  - requirements.md     # 요구사항 및 기능 명세
  - api.md             # API 엔드포인트 명세
  - database.md        # 데이터베이스 스키마
  - implementation.md  # 구현 상세
ROADMAP.md             # 전체 프로젝트 로드맵
TODO.md                # 프로젝트 개요 및 문서 인덱스
```

**검색 방법:**
- 기능명으로 `docs/features/` 디렉토리 검색
- 관련 키워드로 문서 내용 검색 (Grep 사용)
- ROADMAP.md와 TODO.md에서 해당 기능 섹션 찾기

### 3. 문서 업데이트
찾은 문서들을 변경 사항에 맞게 업데이트합니다.

#### 3.1 기능 문서 업데이트 (`docs/features/[기능명]/`)

**requirements.md:**
- 변경된 요구사항 반영
- 체크박스 상태 업데이트 (⬜ → 🟨 → ✅)
- 새로운 요구사항 추가

**api.md:**
- 변경된 엔드포인트 경로 업데이트
- Request/Response DTO 변경 사항 반영
- 새로운 API 엔드포인트 추가
- 삭제된 엔드포인트 제거 또는 Deprecated 표시

**database.md:**
- Prisma 스키마 변경 사항 반영
- 새로운 필드 추가/삭제 반영
- 관계(Relation) 변경 사항 업데이트

**implementation.md:**
- 구현 완료 요약 섹션 업데이트
- 주요 변경 사항 기록
- 알려진 이슈나 제한사항 업데이트

#### 3.2 ROADMAP.md 업데이트

**업데이트 항목:**
- 해당 Phase의 진행률 업데이트
- 완료된 작업 체크 ([ ] → [x])
- 새로운 작업 추가
- 상태 아이콘 업데이트:
  - 🔴 Not Started → 🟡 In Progress → 🟢 Completed

**예시:**
```markdown
### Phase 1: 사용자 관리 및 그룹 기능 🟢

**진행률: 85% → 95%**

- [x] ~~사용자 인증 (Firebase Auth)~~ ✅
- [x] ~~알림 시스템~~ ✅
- [x] 이메일 인증 시스템 ✅ (새로 완료)
```

#### 3.3 TODO.md 업데이트

**업데이트 항목:**
- 기능별 문서 인덱스 확인 및 새 문서 링크 추가
- 완료된 기능 상태 업데이트
- 프로젝트 개요에 주요 변경사항 반영

### 4. 결과 요약
업데이트한 문서들을 요약하여 보고합니다.

**보고 형식:**
```
📝 문서 업데이트 완료

✅ 업데이트한 문서:
1. docs/features/auth/api.md
   - POST /auth/verify-email 엔드포인트 추가
   - Response DTO 업데이트

2. docs/features/auth/implementation.md
   - 이메일 인증 구현 완료 요약 추가

3. ROADMAP.md
   - Phase 1 진행률 85% → 95%
   - 이메일 인증 시스템 완료 표시

4. TODO.md
   - 인증 기능 상태 업데이트
```

## 문서 업데이트 가이드

### 체크박스 상태
- ⬜ **미시작**: 작업 시작 안 됨
- 🟨 **진행 중**: 개발 중
- ✅ **완료**: 구현 및 테스트 완료

### 상태 아이콘 (ROADMAP.md)
- 🔴 **Not Started**: 시작 안 됨
- 🟡 **In Progress**: 진행 중
- 🟢 **Completed**: 완료

### 진행률 계산
```
진행률 = (완료된 작업 수 / 전체 작업 수) × 100
```

### API 문서 작성 규칙
- Swagger 데코레이터와 일치해야 함
- 실제 DTO 클래스 이름 사용
- 예시 Request/Response 포함
- 에러 응답 명시

### 구현 완료 요약 작성
```markdown
## 구현 완료 요약

### 주요 변경사항
- ✅ 이메일 인증 코드 발송 API 구현
- ✅ 인증 코드 검증 로직 구현
- ✅ Redis를 통한 인증 코드 저장

### 기술 스택
- Nodemailer (이메일 발송)
- Redis (인증 코드 저장, TTL 5분)

### 알려진 이슈
- 없음
```

## 주의사항
- 모든 변경사항은 실제 코드와 일치해야 함
- 문서 업데이트는 코드 변경과 함께 진행
- 여러 문서가 영향을 받을 수 있으므로 꼼꼼히 확인
- 진행률은 정확하게 계산하여 업데이트

## 자동화 팁
- 변경된 파일 경로에서 기능명 추출 (예: `src/auth/` → `auth`)
- `docs/features/[기능명]/` 디렉토리에서 관련 문서 찾기
- Grep으로 ROADMAP.md와 TODO.md에서 해당 섹션 검색
- 체크박스와 진행률 자동 계산

</details>
