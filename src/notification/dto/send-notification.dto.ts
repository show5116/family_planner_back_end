import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { NotificationCategory } from '../enums/notification-category.enum';

/**
 * 알림 전송 DTO (내부 사용 또는 관리자용)
 */
export class SendNotificationDto {
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
    example: NotificationCategory.GROUP,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: '알림 제목',
    example: '새로운 그룹 초대',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '알림 내용',
    example: '홍길동님이 당신을 "우리가족" 그룹에 초대했습니다.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: '추가 데이터 (화면 이동용 payload 등)',
    example: { groupId: '123', action: 'view_group' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
