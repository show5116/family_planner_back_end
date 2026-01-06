# CODE_STYLE.md

프로젝트별 중요 규칙만 정리한 코드 스타일 가이드입니다.

---

## Import

### 절대 경로 필수
```typescript
// ✅
import { PrismaService } from '@/prisma/prisma.service';

// ❌
import { PrismaService } from '../../prisma/prisma.service';
```

---

## Controller

### 필수 사항
```typescript
/**
 * 알림 컨트롤러
 * FCM 푸시 알림 및 알림 히스토리 관리 API
 */
@ApiTags('알림')  // 한글 태그
@Controller('notifications')
@ApiCommonAuthResponses()  // 필수 - 인증 에러 자동 문서화
export class NotificationController {
  @Post('token')
  @ApiOperation({ summary: 'FCM 디바이스 토큰 등록' })  // summary만 작성
  @ApiCreated(DeviceTokenDto, 'FCM 토큰 등록 성공')  // DTO 클래스 (string ❌)
  registerToken(@Request() req, @Body() dto: RegisterTokenDto) {  // async 제거
    return this.notificationService.registerToken(req.user.userId, dto);
  }
}
```

### 중요 규칙
- `@Request() req` 사용, `req.user.userId`로 접근
- **Controller에서 async 키워드 제거** (Service에서만 사용)
- Response DTO는 반드시 **클래스**로 전달 (string ❌)
- `@HttpCode`, `@Res()` 직접 사용 금지

---

## Service

### 필수 사항
```typescript
/**
 * 알림 읽음 처리
 */
async markAsRead(userId: string, notificationId: string) {  // userId 첫 번째
  const notification = await this.prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new NotFoundException('알림을 찾을 수 없습니다');  // 한글 메시지
  }

  if (notification.userId !== userId) {
    throw new ForbiddenException('본인의 알림만 처리할 수 있습니다');
  }

  return await this.prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}
```

### 중요 규칙
- **userId는 항상 첫 번째 파라미터**
- 메서드마다 JSDoc 주석 (한 줄)
- NestJS Exception 사용 (Error ❌), 한글 메시지

---

## DTO

### Response DTO 필수
**중요**: Response DTO는 반드시 별도 파일(`xxx-response.dto.ts`)로 작성

```typescript
// notification/dto/notification-response.dto.ts
export class NotificationDto {
  @ApiProperty({ description: '알림 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '제목', example: '새로운 알림' })
  title: string;

  @ApiProperty({
    description: '읽음 여부',
    example: false,
    nullable: true,  // null 가능하면 명시
  })
  isRead: boolean | null;
}

export class MessageResponseDto {
  @ApiProperty({ example: '작업이 완료되었습니다' })
  message: string;
}
```

### Request DTO
```typescript
export class CreateNotificationDto {
  @ApiProperty({ description: '제목', example: '새 알림' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '설명',
    example: '상세 내용',
    required: false,  // 선택 필드 명시
  })
  @IsOptional()
  @IsString()
  description?: string;
}
```

---

## Swagger 커스텀 데코레이터

### 반드시 사용
```typescript
// ✅ 프로젝트 커스텀 데코레이터 사용
@ApiSuccess(NotificationDto, '알림 조회 성공')  // 200
@ApiCreated(NotificationDto, '알림 생성 성공')  // 201
@ApiNotFound('알림을 찾을 수 없음')  // 404
@ApiForbidden('권한 없음')  // 403
@ApiCommonAuthResponses()  // 401, 403 자동 추가

// ❌ 직접 사용 금지
@ApiResponse({ status: 200, type: NotificationDto })  // ❌
```

### 배열 응답
```typescript
@ApiSuccess(NotificationDto, '알림 목록 조회 성공', { isArray: true })
```

---

## 체크리스트

### Controller
- [ ] `@/` 절대 경로
- [ ] `@ApiCommonAuthResponses()` 추가
- [ ] Response DTO **클래스** 사용 (string ❌)
- [ ] `req.user.userId` 사용
- [ ] async 제거

### Service
- [ ] userId 첫 번째 파라미터
- [ ] 한글 에러 메시지
- [ ] JSDoc 주석

### DTO
- [ ] Response DTO 별도 파일 작성
- [ ] `@ApiProperty` 필수
- [ ] nullable, required 명시

---

**Last Updated**: 2026-01-06
