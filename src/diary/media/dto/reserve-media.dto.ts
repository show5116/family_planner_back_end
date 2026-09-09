import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class ReserveMediaDto {
  @ApiProperty({
    description: '연결할 일기 ID (없으면 나중에 일기 저장 시 연결)',
    required: false,
  })
  @IsOptional()
  @IsString()
  diaryId?: string;

  @ApiProperty({
    description:
      "diaryId가 없을 때 어느 날짜에 붙일지 ('YYYY-MM-DD'). 그날 일기가 이미 있으면 바로 연결한다",
    example: '2026-09-07',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date_format' })
  date?: string;

  @ApiProperty({ description: '미디어 종류', enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiProperty({ description: '파일명', example: 'IMG_1234.jpg' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ description: 'MIME 타입', example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  mimeType: string;

  @ApiProperty({
    description: '클라이언트 신고 크기 (bytes)',
    example: 3145728,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  declaredSize: number;

  @ApiProperty({
    description: '압축 전 원본 크기 (bytes, 절약량 표시용)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  originalSize?: number;

  @ApiProperty({
    description: '사용자가 "원본으로 업로드"를 골랐는지',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isOriginal?: boolean;

  @ApiProperty({ description: '가로 픽셀', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  width?: number;

  @ApiProperty({ description: '세로 픽셀', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  height?: number;

  @ApiProperty({ description: '영상 길이 (ms, 영상일 때)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationMs?: number;
}
