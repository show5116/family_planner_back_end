# Redis 사용 가이드

## 개요

이 프로젝트는 Railway에 배포된 Redis를 사용하여 캐싱, 세션 관리, 임시 데이터 저장 등을 처리합니다.

## 환경 변수 설정

### 1. Railway 대시보드에서 Redis URL 복사

1. Railway 대시보드 접속
2. Redis 서비스 선택
3. **Variables** 탭에서 `REDIS_URL` 복사 (Private URL 권장)
4. 형식: `redis://default:password@host:port`

### 2. 로컬 개발 환경 설정

`.env` 파일에 Redis URL 추가:

```env
REDIS_URL="redis://default:your-password@your-host:6379"
```

### 3. Railway 배포 환경

Railway에서는 같은 프로젝트 내 Redis 서비스의 환경 변수가 자동으로 주입됩니다.

## 사용 방법

### 1. 서비스에서 RedisService 주입

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class YourService {
  constructor(private readonly redisService: RedisService) {}

  async example() {
    // 값 저장 (TTL: 1시간)
    await this.redisService.set('user:123', { name: 'John' }, 60 * 60 * 1000);

    // 값 조회
    const user = await this.redisService.get('user:123');

    // 값 삭제
    await this.redisService.del('user:123');

    // 여러 키 일괄 삭제
    await this.redisService.delMany(['user:1', 'user:2', 'user:3']);

    // 키 존재 여부 확인
    const exists = await this.redisService.has('user:123');
  }
}
```

### 2. 주요 메서드

#### `set<T>(key: string, value: T, ttl?: number): Promise<void>`

- 키-값 저장
- `ttl`: 만료 시간 (밀리초 단위, 선택)

```typescript
await redisService.set('session:abc123', sessionData, 30 * 60 * 1000); // 30분
```

#### `get<T>(key: string): Promise<T | null>`

- 값 조회
- 없으면 `null` 반환

```typescript
const data = await redisService.get<SessionData>('session:abc123');
```

#### `del(key: string): Promise<void>`

- 키 삭제

```typescript
await redisService.del('session:abc123');
```

#### `has(key: string): Promise<boolean>`

- 키 존재 여부 확인

```typescript
const exists = await redisService.has('user:123');
```

#### `setTtl(key: string, ttl: number): Promise<void>`

- 기존 키의 TTL 변경

```typescript
await redisService.setTtl('user:123', 60 * 60 * 1000); // 1시간으로 변경
```

#### `delMany(keys: string[]): Promise<void>`

- 여러 키 일괄 삭제

```typescript
await redisService.delMany(['user:1', 'user:2', 'user:3']);
```

## 실전 사용 예시

### 1. 이메일 인증 코드 저장 (5분 TTL)

```typescript
async sendVerificationCode(email: string) {
  const code = Math.random().toString().slice(2, 8); // 6자리 코드
  await this.redisService.set(
    `email:verification:${email}`,
    code,
    5 * 60 * 1000, // 5분
  );

  // 이메일 발송...
}

async verifyCode(email: string, code: string): Promise<boolean> {
  const storedCode = await this.redisService.get<string>(
    `email:verification:${email}`,
  );

  if (storedCode === code) {
    await this.redisService.del(`email:verification:${email}`);
    return true;
  }

  return false;
}
```

### 2. API 속도 제한 (Rate Limiting)

```typescript
async checkRateLimit(userId: string): Promise<boolean> {
  const key = `rate-limit:${userId}`;
  const count = await this.redisService.get<number>(key);

  if (count && count >= 100) {
    return false; // 제한 초과
  }

  await this.redisService.set(key, (count || 0) + 1, 60 * 60 * 1000); // 1시간
  return true;
}
```

### 3. 그룹 멤버 캐싱

```typescript
async getGroupMembers(groupId: string) {
  const cacheKey = `group:${groupId}:members`;

  // 캐시 확인
  let members = await this.redisService.get<GroupMember[]>(cacheKey);

  if (!members) {
    // DB 조회
    members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: true, role: true },
    });

    // 캐시 저장 (10분)
    await this.redisService.set(cacheKey, members, 10 * 60 * 1000);
  }

  return members;
}

// 멤버 추가/삭제 시 캐시 무효화
async invalidateGroupCache(groupId: string) {
  await this.redisService.del(`group:${groupId}:members`);
}
```

### 4. 그룹 초대 코드 검증 횟수 제한

```typescript
async checkInviteCodeAttempts(userId: string): Promise<boolean> {
  const key = `invite-attempts:${userId}`;
  const attempts = await this.redisService.get<number>(key);

  if (attempts && attempts >= 10) {
    return false; // 10회 초과
  }

  await this.redisService.set(key, (attempts || 0) + 1, 60 * 60 * 1000); // 1시간
  return true;
}
```

### 5. Refresh Token 저장 (RTR 방식)

```typescript
async storeRefreshToken(userId: string, token: string) {
  const key = `refresh-token:${userId}:${token}`;
  await this.redisService.set(key, true, 7 * 24 * 60 * 60 * 1000); // 7일
}

async validateRefreshToken(userId: string, token: string): Promise<boolean> {
  const key = `refresh-token:${userId}:${token}`;
  return await this.redisService.has(key);
}

async revokeRefreshToken(userId: string, token: string) {
  const key = `refresh-token:${userId}:${token}`;
  await this.redisService.del(key);
}
```

## 키 네이밍 컨벤션

Redis 키는 구조화된 네이밍을 사용하여 관리합니다:

- `user:{userId}` - 사용자 정보
- `session:{sessionId}` - 세션 데이터
- `email:verification:{email}` - 이메일 인증 코드
- `group:{groupId}:members` - 그룹 멤버 캐시
- `rate-limit:{userId}` - API 속도 제한
- `invite-attempts:{userId}` - 초대 코드 검증 시도 횟수
- `refresh-token:{userId}:{token}` - Refresh Token

## 주의사항

1. **TTL 설정**: 모든 캐시에는 적절한 TTL을 설정하여 메모리 누수를 방지하세요.
2. **캐시 무효화**: 데이터 변경 시 관련 캐시를 반드시 무효화하세요.
3. **민감한 데이터**: Redis는 메모리 기반이므로 매우 민감한 데이터는 암호화하여 저장하세요.
4. **네트워크 오류 처리**: Redis 연결 실패 시 애플리케이션이 중단되지 않도록 예외 처리를 구현하세요.

## 테스트

애플리케이션 시작 후 Redis 연결 확인:

```bash
npm run start:dev
```

콘솔에 Redis 연결 오류가 없으면 정상적으로 연결된 것입니다.

## Railway 배포 시 체크리스트

- [ ] Railway에 Redis 서비스가 생성되어 있는지 확인
- [ ] Railway 프로젝트의 Variables에 `REDIS_URL`이 자동으로 설정되어 있는지 확인
- [ ] 백엔드 서비스와 Redis 서비스가 같은 프로젝트 내에 있는지 확인

## 문제 해결

### Redis 연결 오류

```
Error: getaddrinfo ENOTFOUND your-redis-host
```

**해결 방법:**
1. `.env` 파일의 `REDIS_URL`이 올바른지 확인
2. Railway 대시보드에서 Redis URL이 변경되지 않았는지 확인
3. 로컬에서 Railway Private URL 사용 시 Railway CLI로 프록시 실행:
   ```bash
   railway connect
   ```

### TTL이 적용되지 않음

**해결 방법:**
- TTL은 밀리초 단위입니다. `60 * 1000` = 1분

### 캐시가 업데이트되지 않음

**해결 방법:**
- 데이터 변경 시 `redisService.del(key)` 또는 `redisService.delMany([keys])`로 캐시 무효화
