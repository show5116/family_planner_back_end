import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { AnnouncementCategory } from '@/announcement/enums/announcement-category.enum';

export class AnnouncementQueryDto {
  @ApiProperty({
    description: '페이지 번호',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: '페이지 크기',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: '카테고리 필터',
    enum: AnnouncementCategory,
    enumName: 'AnnouncementCategory',
    required: false,
    example: AnnouncementCategory.EVENT,
  })
  @IsEnum(AnnouncementCategory)
  @IsOptional()
  category?: AnnouncementCategory;

  @ApiProperty({
    description: '고정 공지만 조회',
    default: false,
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  pinnedOnly?: boolean = false;
}
