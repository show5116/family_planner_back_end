import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DiaryVisibility } from '@/diary/enums/diary-visibility.enum';

export class DiaryQueryDto {
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
    description: "조회 시작일 ('YYYY-MM-DD')",
    example: '2026-09-01',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date_format' })
  from?: string;

  @ApiProperty({
    description: "조회 종료일 ('YYYY-MM-DD')",
    example: '2026-09-30',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date_format' })
  to?: string;

  @ApiProperty({
    description: '공개 범위 필터',
    enum: DiaryVisibility,
    required: false,
  })
  @IsOptional()
  @IsEnum(DiaryVisibility)
  visibility?: DiaryVisibility;

  @ApiProperty({ description: '그룹 ID 필터', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '검색어 (제목/본문)', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

export class DiaryCalendarQueryDto {
  @ApiProperty({ description: '연도', example: 2026 })
  @IsInt()
  @Min(1970)
  @Max(2999)
  @Type(() => Number)
  year: number;

  @ApiProperty({ description: '월 (1~12)', example: 9 })
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;

  @ApiProperty({
    description: '그룹 ID (지정 시 그룹원 전체의 그룹 공개 일기)',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;
}
