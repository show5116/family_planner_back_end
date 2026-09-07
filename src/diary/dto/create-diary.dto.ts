import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeHtmlContent } from '@/common/utils/sanitize-html.util';
import { DiaryFormat } from '@/diary/enums/diary-format.enum';
import { DiaryVisibility } from '@/diary/enums/diary-visibility.enum';

export class CreateDiaryDto {
  @ApiProperty({
    description: "일기 날짜 ('YYYY-MM-DD', 생략 시 오늘 — 하루 경계 새벽 4시)",
    example: '2026-09-01',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date_format' })
  date?: string;

  @ApiProperty({
    description: '일기 제목',
    example: '가을 첫날',
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Delta JSON 문자열 (format=DELTA) 또는 일반 텍스트',
    example: '{"ops":[{"insert":"오늘의 일기\\n"}]}',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeHtmlContent(value))
  @IsString()
  content?: string;

  @ApiProperty({
    description: '일기 형식 (기본값: DELTA)',
    enum: DiaryFormat,
    default: DiaryFormat.DELTA,
    required: false,
  })
  @IsOptional()
  @IsEnum(DiaryFormat)
  format?: DiaryFormat;

  @ApiProperty({
    description: '공개 범위 (기본값: PRIVATE)',
    enum: DiaryVisibility,
    default: DiaryVisibility.PRIVATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(DiaryVisibility)
  visibility?: DiaryVisibility;

  @ApiProperty({ description: '그룹 ID (GROUP 공개 시 필수)', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '기분 이모지/코드',
    example: '😊',
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mood?: string;

  @ApiProperty({
    description: '날씨 코드',
    example: 'SUNNY',
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  weather?: string;
}
