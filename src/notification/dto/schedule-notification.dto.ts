import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsDateString,
} from 'class-validator';
import { NotificationCategory } from '../enums/notification-category.enum';

/**
 * 예약 알림 전송 DTO
 */
export class ScheduleNotificationDto {
  @ApiProperty({
    description: '알림 받을 사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: '알림 카테고리',
    enum: NotificationCategory,
    example: NotificationCategory.TODO,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: '알림 제목',
    example: '할 일 알림',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '알림 내용',
    example: '30분 후 회의 시작',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: '발송 예정 시간 (ISO 8601 형식)',
    example: '2026-01-11T15:30:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledTime: string;

  @ApiPropertyOptional({
    description: '추가 데이터 (화면 이동용 payload 등)',
    example: { taskId: '123', action: 'view_task' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
