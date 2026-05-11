import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'WEATHER 카테고리 전용: 날씨 알림 수신 시각 (0~23시)',
    example: 7,
    minimum: 0,
    maximum: 23,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  weatherAlertHour?: number;
}
