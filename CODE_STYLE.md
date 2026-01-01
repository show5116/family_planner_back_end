# CODE_STYLE.md

이 문서는 Family Planner Backend 프로젝트의 코드 스타일 가이드입니다. 새로운 기능을 구현하거나 기존 코드를 수정할 때 이 가이드를 따라주세요.

---

## 📋 목차

1. [Import 규칙](#import-규칙)
2. [Controller 작성 규칙](#controller-작성-규칙)
3. [Service 작성 규칙](#service-작성-규칙)
4. [DTO 작성 규칙](#dto-작성-규칙)
5. [Swagger 문서화](#swagger-문서화)
6. [주석 및 문서화](#주석-및-문서화)
7. [에러 처리](#에러-처리)

---

## Import 규칙

### 절대 경로 사용

모든 import는 `@/` 접두사를 사용한 절대 경로로 작성합니다.

```typescript
// ✅ 좋은 예
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGroupDto } from '@/group/dto/create-group.dto';
import { NotificationService } from '@/notification/notification.service';

// ❌ 나쁜 예
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
```

### Import 순서

Import는 다음 순서로 그룹화하고, 각 그룹 사이는 빈 줄로 구분합니다:

1. NestJS 관련 import
2. 외부 라이브러리
3. 프로젝트 내부 모듈 (`@/`로 시작)
4. 타입 import (필요시)

```typescript
// 1. NestJS
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// 2. 외부 라이브러리 (없으면 생략)
import { ConfigService } from '@nestjs/config';

// 3. 프로젝트 내부
import { GroupService } from '@/group/group.service';
import { CreateGroupDto } from '@/group/dto/create-group.dto';
import { GroupDto } from '@/group/dto/group-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
} from '@/common/decorators/api-responses.decorator';

// 4. 타입 (필요시)
import type { Response } from 'express';
```

---

## Controller 작성 규칙

### 기본 구조

```typescript
import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { YourService } from '@/your-module/your.service';
import { CreateDto } from '@/your-module/dto/create.dto';
import { YourResponseDto } from '@/your-module/dto/your-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
} from '@/common/decorators/api-responses.decorator';

/**
 * Your 모듈 컨트롤러
 * 간단한 설명
 */
@ApiTags('한글 태그명')
@Controller('your-route')
@ApiCommonAuthResponses()
export class YourController {
  constructor(private readonly yourService: YourService) {}

  @Post()
  @ApiOperation({ summary: '리소스 생성' })
  @ApiCreated(ResponseDto, '생성 성공')
  create(@Request() req, @Body() dto: CreateDto) {
    return this.yourService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '리소스 목록 조회' })
  @ApiSuccess(ResponseDto, '목록 조회 성공', { isArray: true })
  findAll(@Request() req) {
    return this.yourService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '리소스 상세 조회' })
  @ApiSuccess(ResponseDto, '상세 조회 성공')
  @ApiNotFound('리소스를 찾을 수 없음')
  findOne(@Param('id') id: string, @Request() req) {
    return this.yourService.findOne(id, req.user.userId);
  }
}
```

### Controller 규칙 체크리스트

- ✅ **클래스 상단 주석**: 한글로 컨트롤러 설명 작성 (JSDoc 형식)
- ✅ **@ApiTags**: 한글 태그명 사용 (예: `'그룹'`, `'알림'`)
- ✅ **@ApiCommonAuthResponses()**: 모든 컨트롤러에 적용 (인증 에러 자동 문서화)
- ✅ **HTTP 메서드 데코레이터 사용**: `@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`
- ✅ **@ApiOperation**: 각 엔드포인트마다 간단한 한글 설명 (summary만 사용)
- ✅ **응답 데코레이터**: `@ApiSuccess`, `@ApiCreated`, `@ApiNotFound`, `@ApiForbidden` 사용
  - 첫 번째 인자: **DTO 클래스** (string 아님!)
  - 두 번째 인자: 한글 설명
  - **중요**: Response DTO 파일을 반드시 생성하고 실제 클래스를 전달해야 함
- ✅ **@Request() req 사용**: 사용자 정보는 `req.user.userId`로 접근
- ✅ **async 키워드 제거**: 컨트롤러 메서드에서는 async 사용하지 않음 (service에서 처리)
- ❌ **@HttpCode, HttpStatus 사용 금지**: NestJS 기본 동작 활용
- ❌ **@Res() 직접 사용 지양**: 특수한 경우(쿠키 설정 등)만 `@Res({ passthrough: true })` 사용

### 예시

```typescript
// ✅ 좋은 예
@Post('token')
@ApiOperation({ summary: 'FCM 디바이스 토큰 등록' })
@ApiCreated(DeviceTokenDto, 'FCM 토큰 등록 성공')
registerToken(@Request() req, @Body() dto: RegisterTokenDto) {
  return this.notificationService.registerToken(req.user.userId, dto);
}

// ❌ 나쁜 예
@Post('token')
@HttpCode(201)
@ApiOperation({
  summary: 'FCM 디바이스 토큰 등록',
  description: '사용자의 FCM 토큰을 데이터베이스에 등록합니다...'
})
@ApiCreated('DeviceToken', 'FCM 토큰 등록 성공')  // ❌ string 대신 DTO 클래스 사용
async registerToken(@Request() req, @Body() dto: RegisterTokenDto) {  // ❌ async 불필요
  return await this.notificationService.registerToken(req.user.userId, dto);
}
```

---

## Service 작성 규칙

### 기본 구조

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDto } from '@/your-module/dto/create.dto';

@Injectable()
export class YourService {
  constructor(private prisma: PrismaService) {}

  /**
   * 리소스 생성
   */
  async create(userId: string, dto: CreateDto) {
    // 비즈니스 로직 구현
    const result = await this.prisma.yourModel.create({
      data: {
        userId,
        ...dto,
      },
    });

    return result;
  }

  /**
   * Private Helper 메서드 (필요시)
   */
  private async helperMethod() {
    // ...
  }
}
```

### Service 규칙 체크리스트

- ✅ **@Injectable() 데코레이터 필수**
- ✅ **메서드마다 JSDoc 주석**: 한 줄 설명 작성
- ✅ **async/await 사용**: 비동기 작업은 반드시 async/await
- ✅ **userId 첫 번째 파라미터**: 사용자 관련 작업 시 userId를 첫 번째 인자로
- ✅ **에러 처리**: 적절한 NestJS Exception 사용 (NotFoundException, ForbiddenException 등)
- ✅ **Private 헬퍼 메서드**: 재사용 로직은 private 메서드로 분리
- ✅ **Prisma include/select 명시**: 응답 데이터에 필요한 필드만 조회

### 예시

```typescript
// ✅ 좋은 예
/**
 * 알림 읽음 처리
 */
async markAsRead(userId: string, notificationId: string) {
  const notification = await this.prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new NotFoundException('알림을 찾을 수 없습니다');
  }

  if (notification.userId !== userId) {
    throw new ForbiddenException('본인의 알림만 처리할 수 있습니다');
  }

  return await this.prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ❌ 나쁜 예
async markAsRead(notificationId: string, userId: string) {  // ❌ userId가 두 번째 인자
  // ❌ 에러 처리 없음
  return await this.prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}
```

---

## DTO 작성 규칙

### Request DTO (입력 DTO)

```typescript
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { YourEnum } from '@/your-module/enums/your.enum';

export class CreateYourDto {
  @ApiProperty({
    description: '필드 설명',
    example: '예시 값',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: '선택적 필드 설명',
    example: '예시 값',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Enum 필드 설명',
    enum: YourEnum,
    example: YourEnum.VALUE1,
  })
  @IsEnum(YourEnum)
  category: YourEnum;
}
```

### Response DTO

Response DTO는 **반드시 별도 파일로 작성**하고, Controller에서 실제 클래스를 import하여 사용해야 합니다.

**파일 구조**:
- `xxx-response.dto.ts`: 응답 DTO만 모아놓은 파일
- Controller에서 `Object` 대신 실제 DTO 클래스 사용

```typescript
// your-module/dto/your-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { YourEnum } from '@/your-module/enums/your.enum';

/**
 * 단일 리소스 응답 DTO
 */
export class YourDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '제목', example: '예시 제목' })
  title: string;

  @ApiProperty({
    description: '카테고리',
    enum: YourEnum,
    example: YourEnum.VALUE1,
  })
  category: YourEnum;

  @ApiProperty({
    description: '생성일',
    example: '2025-12-27T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '선택적 필드',
    example: '예시 값',
    nullable: true,
  })
  optionalField: string | null;
}

/**
 * 페이지네이션 응답 DTO
 */
export class PaginatedYourDto {
  @ApiProperty({ type: [YourDto], description: '리소스 목록' })
  data: YourDto[];

  @ApiProperty({
    description: '페이지네이션 메타 정보',
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 메시지 응답 DTO (삭제 등)
 */
export class MessageResponseDto {
  @ApiProperty({ example: '작업이 완료되었습니다' })
  message: string;
}
```

**Controller에서 사용**:

```typescript
// ✅ 좋은 예 - 실제 DTO 클래스 사용
import { YourDto, PaginatedYourDto, MessageResponseDto } from './dto/your-response.dto';

@Get()
@ApiSuccess(PaginatedYourDto, '목록 조회 성공')
findAll() { ... }

@Get(':id')
@ApiSuccess(YourDto, '상세 조회 성공')
findOne() { ... }

@Delete(':id')
@ApiSuccess(MessageResponseDto, '삭제 성공')
remove() { ... }

// ❌ 나쁜 예 - Object 사용 (Swagger 문서에서 스펙 확인 불가)
@Get()
@ApiSuccess(Object, '목록 조회 성공')  // ❌
findAll() { ... }
```

### DTO 규칙 체크리스트

- ✅ **@ApiProperty 필수**: 모든 필드에 Swagger 문서화
- ✅ **description**: 한글 설명 작성
- ✅ **example**: 실제 사용 가능한 예시 값
- ✅ **class-validator 사용**: 입력 DTO는 검증 데코레이터 필수
- ✅ **Enum 타입 명시**: `enum: YourEnum` 옵션 추가
- ✅ **nullable 표시**: null 가능한 필드는 `nullable: true` 추가
- ✅ **required: false**: 선택적 필드는 명시
- ✅ **DTO 파일 분리**:
  - `create-xxx.dto.ts`: 생성 DTO
  - `update-xxx.dto.ts`: 수정 DTO
  - `query-xxx.dto.ts`: 쿼리 DTO
  - `xxx-response.dto.ts`: 응답 DTO 모음
  - `index.ts`: 모든 DTO export

---

## Swagger 문서화

### 기본 원칙

1. **한글 사용**: 모든 summary, description은 한글로 작성
2. **DTO 클래스 사용**: 데코레이터에 string 대신 실제 DTO 클래스 전달
3. **간결한 summary**: `@ApiOperation`의 summary는 한 줄로 (description 생략)

### 커스텀 데코레이터 사용

프로젝트에서 제공하는 커스텀 데코레이터를 사용합니다:

```typescript
// ✅ 사용해야 할 데코레이터
@ApiSuccess(DtoClass, '성공 메시지')                // 200 OK
@ApiCreated(DtoClass, '생성 성공 메시지')            // 201 Created
@ApiNotFound('에러 메시지')                         // 404 Not Found
@ApiForbidden('권한 없음')                          // 403 Forbidden
@ApiCommonAuthResponses()                          // 401, 403 자동 추가

// ❌ 사용하지 말아야 할 것
@ApiResponse({ status: 200, type: DtoClass })      // ❌ 직접 사용 금지
```

### 배열 응답 처리

```typescript
// ✅ 배열 응답
@ApiSuccess(NotificationDto, '알림 목록 조회 성공', { isArray: true })

// ✅ 페이지네이션 응답 (별도 DTO 사용)
@ApiSuccess(PaginatedNotificationsDto, '알림 목록 및 페이지네이션 정보 반환')
```

---

## 주석 및 문서화

### 파일 상단 주석 (Controller, Service)

```typescript
/**
 * 알림 컨트롤러
 * FCM 푸시 알림 및 알림 히스토리 관리 API
 */
@ApiTags('알림')
@Controller('notifications')
export class NotificationController {
  // ...
}
```

### 메서드 주석 (Service)

```typescript
/**
 * FCM 토큰 등록
 * 기존 토큰이 다른 사용자에게 등록된 경우 자동으로 삭제 후 재등록
 */
async registerToken(userId: string, dto: RegisterTokenDto) {
  // ...
}
```

### Private 헬퍼 메서드

```typescript
/**
 * OWNER 역할 조회 (공통 역할)
 */
private async getOwnerRole() {
  // ...
}

/**
 * 프로필 이미지 URL 변환 (Helper)
 */
private transformUserWithImageUrl<T extends { profileImageKey?: string | null }>(
  user: T
): Omit<T, 'profileImageKey'> & { profileImageUrl: string | null } {
  // ...
}
```

### 인라인 주석

복잡한 비즈니스 로직이나 중요한 처리에만 인라인 주석 추가:

```typescript
// 초대 코드 만료 시간 (7일 후)
const inviteCodeExpiresAt = new Date();
inviteCodeExpiresAt.setDate(inviteCodeExpiresAt.getDate() + 7);

// 계정 전환 시나리오: 기존 토큰 삭제 후 재등록
if (existingToken.userId !== userId) {
  await this.prisma.deviceToken.delete({ where: { token: dto.token } });
}
```

---

## 에러 처리

### NestJS Exception 사용

```typescript
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

// ✅ 적절한 에러 사용
if (!resource) {
  throw new NotFoundException('리소스를 찾을 수 없습니다');
}

if (resource.userId !== userId) {
  throw new ForbiddenException('접근 권한이 없습니다');
}

if (await this.isDuplicate(dto.value)) {
  throw new ConflictException('이미 존재하는 값입니다');
}

// ❌ 일반 Error 사용 금지
throw new Error('에러 발생');  // ❌
```

### 에러 메시지 규칙

- ✅ **한글 사용**: 모든 에러 메시지는 한글로
- ✅ **명확한 설명**: 사용자가 이해할 수 있는 메시지
- ✅ **일관된 형식**: "~을(를) 찾을 수 없습니다", "~할 수 없습니다"

```typescript
// ✅ 좋은 예
throw new NotFoundException('알림을 찾을 수 없습니다');
throw new ForbiddenException('본인의 알림만 삭제할 수 있습니다');

// ❌ 나쁜 예
throw new NotFoundException('Not found');
throw new ForbiddenException('Forbidden');
```

---

## 파일 및 폴더 구조

### 모듈 구조 예시

```
src/
  your-module/
    dto/
      create-your.dto.ts
      update-your.dto.ts
      query-your.dto.ts
      your-response.dto.ts
      index.ts                    # DTO export
    enums/
      your-category.enum.ts
    guards/
      your.guard.ts
    your.controller.ts
    your.service.ts
    your.module.ts
```

### DTO index.ts 패턴

```typescript
// dto/index.ts
export * from './create-your.dto';
export * from './update-your.dto';
export * from './query-your.dto';
export * from './your-response.dto';
```

---

## 체크리스트 요약

새로운 기능 구현 시 다음을 확인하세요:

### Controller
- [ ] 절대 경로 import (`@/`)
- [ ] 클래스 상단 JSDoc 주석
- [ ] `@ApiTags('한글명')`
- [ ] `@ApiCommonAuthResponses()`
- [ ] `@ApiOperation({ summary: '한글 설명' })`
- [ ] Response DTO 클래스 사용 (string ❌)
- [ ] `@Request() req` 사용, `req.user.userId`로 접근
- [ ] async 키워드 제거

### Service
- [ ] `@Injectable()` 데코레이터
- [ ] 메서드마다 JSDoc 주석
- [ ] userId 첫 번째 파라미터
- [ ] 적절한 NestJS Exception 사용
- [ ] Prisma include/select 명시

### DTO
- [ ] 모든 필드에 `@ApiProperty`
- [ ] description, example 작성
- [ ] class-validator 검증 (입력 DTO)
- [ ] nullable, required 옵션 명시
- [ ] index.ts로 export

### 문서화
- [ ] 한글 사용
- [ ] 명확한 설명
- [ ] 실제 사용 가능한 예시 값

---

**Last Updated**: 2025-12-28
