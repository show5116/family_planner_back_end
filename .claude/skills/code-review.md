# Multi-Perspective Code Review

코드 작성 후 여러 관점에서 병렬로 코드를 리뷰하고 우선순위별 리포트를 생성하는 스킬입니다.

## 사용 시점
- 새로운 기능 구현 후
- 중요한 비즈니스 로직 수정 후
- Pull Request 생성 전
- 코드 리팩토링 후

## 리뷰 관점

### 1. 🔒 보안 취약점 (Security)
- SQL/NoSQL Injection, Command Injection, Path Traversal
- JWT 토큰 검증 누락, 권한 체크 우회, `req.user.userId` 검증 누락
- 민감 정보 로깅, 스택 트레이스 노출, 불필요한 데이터 반환
- DTO 유효성 검사 누락, 파일 업로드 검증 미흡, XSS

### 2. ⚡ 성능 이슈 (Performance)
- N+1 쿼리, 불필요한 JOIN, 인덱스 미사용, SELECT * 사용
- 메모리 누수, 대용량 데이터 처리, 스트림 미사용
- Redis 캐싱 기회 미활용, 중복 쿼리
- 불필요한 await, 병렬화 가능한 작업의 순차 처리

### 3. 🛠️ 유지보수성 (Maintainability)
- 함수 길이(50줄+), 중첩 깊이(3단계+), 순환 복잡도
- 모듈 간 의존성, 단일 책임 원칙 위반
- [CODE_STYLE.md](../../../CODE_STYLE.md) 준수(절대 경로, 한글 문서화, DTO 클래스)
- 예외 처리, 에러 메시지 명확성, 트랜잭션 롤백

### 4. 🧪 테스팅 (Testing)
- 단위 테스트 존재 여부, 주요 비즈니스 로직 테스트, 엣지 케이스
- Mock 사용 적절성, 테스트 독립성, Assertion 명확성
- 의존성 주입, 테스트하기 어려운 코드, Private 메서드 과다

## 우선순위
- 🔴 **Critical**: 즉시 수정 (보안 취약점, 심각한 성능 저하)
- 🟠 **High**: 빠른 수정 권장 (N+1 쿼리, 테스트 누락, 민감 정보 노출)
- 🟡 **Medium**: 수정 권장 (코드 스타일, 캐싱 미사용)
- 🟢 **Low**: 선택적 개선 (함수 분리, 주석 추가)

## 실행 순서

### 1. 변경 사항 확인
```bash
git diff --name-only              # 변경된 파일
git diff HEAD~1 --name-only       # 최근 커밋
git diff --cached --name-only     # 스테이징된 파일
```

### 2. 병렬 리뷰 수행
**4개 Task를 단일 메시지로 병렬 실행**:

```typescript
parallel [
  Task("보안 취약점 검사: 인증/인가, DB 쿼리, 입력 검증, 민감 정보"),
  Task("성능 이슈 검사: N+1, 메모리, 캐싱, 비동기 처리"),
  Task("유지보수성 검사: 복잡도, 결합도, CODE_STYLE.md, 에러 처리"),
  Task("테스팅 검사: 커버리지, 품질, 테스트 가능성")
]
```

### 3. 리포트 생성
4개 Task 결과를 우선순위별로 통합:

```markdown
# 코드 리뷰 리포트

## 📊 요약
- 리뷰 대상: [파일 목록]
- 총 이슈: X개 (🔴 X개, 🟠 X개, 🟡 X개, 🟢 X개)

## 🔴 Critical - 즉시 수정 필요

### [보안] SQL Injection 취약점
**파일:** src/user/user.service.ts:42
**문제:** `$queryRaw` 사용 시 변수 직접 삽입
**수정:**
```typescript
// ❌ 위험
await this.prisma.$queryRaw`SELECT * FROM users WHERE name = ${name}`;

// ✅ 안전
await this.prisma.user.findMany({ where: { name } });
```

## 🟠 High - 빠른 수정 권장

### [성능] N+1 쿼리 문제
**파일:** src/group/group.service.ts:28
**수정:** `include`로 한 번에 조회
```typescript
await this.prisma.group.findMany({ include: { members: true } });
```

### [테스팅] 중요 로직 테스트 누락
**파일:** src/auth/auth.service.ts
**수정:** `auth.service.spec.ts`에 이메일 인증 테스트 추가

## 🟡 Medium - 수정 권장

### [유지보수성] 코드 스타일 위반
**파일:** src/notification/notification.controller.ts:15
**수정:** 상대 경로(`../../dto`) → 절대 경로(`@/notification/dto`)

### [성능] 캐싱 기회 미활용
**파일:** src/group/group.service.ts:52
**수정:** 공지사항 목록 Redis 캐싱 추가 (TTL 5분)

## 🟢 Low - 선택적 개선

### [유지보수성] 함수 분리 권장
**파일:** src/user/user.service.ts:100-150
**수정:** 검증 로직을 별도 private 메서드로 분리

## ✅ 액션 아이템

**즉시 수정 (🔴):**
- [ ] SQL Injection 수정 - user.service.ts:42
- [ ] 인증 체크 누락 - post.controller.ts:28

**빠른 수정 (🟠):**
- [ ] N+1 쿼리 최적화 - group.service.ts:28
- [ ] 테스트 추가 - auth.service.spec.ts
- [ ] 민감 정보 로깅 제거 - email.service.ts:56

**수정 권장 (🟡):**
- [ ] 절대 경로 변경 - 5개 파일
- [ ] Redis 캐싱 추가 - group.service.ts:52

**선택적 개선 (🟢):**
- [ ] 함수 분리 - user.service.ts:100-150
```

## 사용 예시

**새로운 기능 구현 후:**
```
리뷰 대상: src/auth/auth.service.ts, auth.controller.ts
실행: 4개 관점 병렬 리뷰
결과: 우선순위별 리포트
액션: Critical/High 이슈 즉시 수정
```

**전체 모듈 리뷰:**
```
리뷰 대상: src/notification/**/*.ts
실행: 모듈 전체 병렬 리뷰
결과: 종합 리포트 + 개선 로드맵
액션: 우선순위별 순차 개선
```

## 주의사항
- 리뷰 결과는 참고용, 최종 판단은 개발자가 수행
- Critical 이슈는 반드시 수정 후 배포
- 성능 최적화는 실제 측정 후 적용
- 코드 스타일은 [CODE_STYLE.md](../../../CODE_STYLE.md) 우선 준수
- 과도한 최적화보다 가독성과 유지보수성 우선

## 참고 자료
- [CODE_STYLE.md](../../../CODE_STYLE.md) - 프로젝트 코드 스타일
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - 보안 취약점
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization) - 성능 최적화
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) - 테스팅 가이드
