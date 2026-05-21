import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DevicePlatform } from '../enums/device-platform.enum';

/**
 * FCM 디바이스 토큰 등록 DTO
 */
export class RegisterTokenDto {
  @ApiProperty({
    description: 'FCM 디바이스 토큰',
    example: 'fGw3ZJ0kRZe-Xz9YlK6J7M:APA91bH4...(생략)...k5L8mN9oP0qR1sT2u',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: '디바이스 플랫폼',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiPropertyOptional({
    description: '앱 언어 설정 (ko, en, ja, zh)',
    example: 'ko',
    default: 'ko',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ko', 'en', 'ja', 'zh'])
  language?: string;
}
