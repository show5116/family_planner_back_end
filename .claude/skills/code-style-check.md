# Code Style Check

CODE_STYLE.md 준수 여부를 종합적으로 검사하는 스킬입니다.

## 사용 시점
- 코드 작성 후
- Pull Request 생성 전
- Git commit 전

## 검사 항목

### 1. Import - 절대 경로 (`@/`)
```bash
grep -rn "from '\.\.\/" src/ --include="*.ts" | grep -v "node_modules"
```

### 2. Controller
- async 키워드 제거
- Response DTO 클래스 사용
- `@Request() req` → `req.user.userId`
- 한글 문서화 (`@ApiTags`, `@ApiOperation`)

```bash
grep -rn "async.*(" src/**/*.controller.ts
grep -n "@Api\(Success\|Created\)" src/**/*.controller.ts | grep -v "type:"
```

### 3. Service
- userId 첫 번째 파라미터
- JSDoc 주석
- 에러 처리 (NotFoundException 등)

### 4. DTO
- `@ApiProperty` 필수
- description (한글) + example

```bash
grep -B1 "^\s*[a-zA-Z].*:.*;" src/**/dto/*.ts | grep -v "@Api"
```

### 5. Swagger
- 커스텀 데코레이터 (`@ApiSuccess`, `@ApiCreated`)
- 배열 응답 (`[Type]` 또는 `isArray: true`)
- 에러 응답 (`@ApiNotFound`, `@ApiForbidden`)

## 자동 수정 예시

```typescript
// ❌ Before
import { PrismaService } from '../../prisma/prisma.service';
@Get()
async getUsers() { ... }

// ✅ After
import { PrismaService } from '@/prisma/prisma.service';
@Get()
@ApiSuccess({ type: [UserDto], description: '사용자 목록 조회' })
getUsers() { ... }
```

## 체크리스트

**Import:**
- [ ] 절대 경로 (`@/`) 사용

**Controller:**
- [ ] JSDoc 주석 (한글)
- [ ] `@ApiTags` 한글
- [ ] Response DTO 클래스
- [ ] `async` 제거
- [ ] `@Request() req` 사용

**Service:**
- [ ] JSDoc 주석
- [ ] userId 첫 번째 파라미터
- [ ] 에러 처리

**DTO:**
- [ ] `@ApiProperty()` + description/example
- [ ] Response DTO 별도 파일

## 참고
- [CODE_STYLE.md](../../../CODE_STYLE.md)
- [update-swagger.md](update-swagger.md)
