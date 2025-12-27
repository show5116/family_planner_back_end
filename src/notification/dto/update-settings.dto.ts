import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsBoolean } from 'class-validator';
import { NotificationCategory } from '../enums/notification-category.enum';

/**
 * 알림 설정 업데이트 DTO
 */
export class UpdateSettingsDto {
  @ApiProperty({
    description: '알림 카테고리',
    enum: NotificationCategory,
    example: NotificationCategory.GROUP,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: '알림 활성화 여부',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}
