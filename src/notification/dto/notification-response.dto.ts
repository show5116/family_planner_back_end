import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { DevicePlatform } from '@/notification/enums/device-platform.enum';

export class DeviceTokenDto {
  @ApiProperty({ description: '토큰 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({
    description: 'FCM 디바이스 토큰',
    example: 'dXNlci1kZXZpY2UtdG9rZW4tZXhhbXBsZQ',
  })
  token: string;

  @ApiProperty({
    description: '플랫폼',
    enum: DevicePlatform,
    example: DevicePlatform.WEB,
  })
  platform: DevicePlatform;

  @ApiProperty({
    description: '마지막 사용 시간',
    example: '2025-12-27T00:00:00Z',
  })
  lastUsed: Date;
}

export class NotificationSettingDto {
  @ApiProperty({ description: '설정 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({
    description: '알림 카테고리',
    enum: NotificationCategory,
    example: NotificationCategory.SCHEDULE,
  })
  category: NotificationCategory;

  @ApiProperty({ description: '알림 활성화 여부', example: true })
  enabled: boolean;
}

export class NotificationDto {
  @ApiProperty({ description: '알림 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({
    description: '알림 카테고리',
    enum: NotificationCategory,
    example: NotificationCategory.SCHEDULE,
  })
  category: NotificationCategory;

  @ApiProperty({ description: '알림 제목', example: '새로운 일정 알림' })
  title: string;

  @ApiProperty({
    description: '알림 내용',
    example: '내일 오후 3시에 회의가 예정되어 있습니다.',
  })
  body: string;

  @ApiProperty({
    description: '추가 데이터 (JSON)',
    example: { scheduleId: 'uuid', action: 'view_schedule' },
    nullable: true,
  })
  data: any;

  @ApiProperty({ description: '읽음 여부', example: false })
  isRead: boolean;

  @ApiProperty({
    description: '발송 시간',
    example: '2025-12-27T00:00:00Z',
  })
  sentAt: Date;

  @ApiProperty({
    description: '읽은 시간',
    example: '2025-12-27T00:30:00Z',
    nullable: true,
  })
  readAt: Date | null;
}

export class PaginationMetaDto {
  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  limit: number;

  @ApiProperty({ description: '전체 항목 수', example: 42 })
  total: number;

  @ApiProperty({ description: '전체 페이지 수', example: 3 })
  totalPages: number;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: '읽지 않은 알림 개수', example: 5 })
  count: number;
}

export class MarkAllAsReadResponseDto {
  @ApiProperty({ description: '읽음 처리된 알림 개수', example: 10 })
  count: number;
}
