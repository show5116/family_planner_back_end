import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionCategory } from '../enums/question-category.enum';

export class QuestionQueryDto {
  @ApiProperty({
    description: '페이지 번호',
    default: 1,
    minimum: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page: number = 1;

  @ApiProperty({
    description: '페이지 크기',
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit: number = 20;

  @ApiProperty({
    description: '상태 필터 (PENDING, ANSWERED, RESOLVED)',
    enum: QuestionStatus,
    required: false,
  })
  @IsEnum(QuestionStatus)
  @IsOptional()
  status?: QuestionStatus;

  @ApiProperty({
    description: '카테고리 필터',
    enum: QuestionCategory,
    required: false,
  })
  @IsEnum(QuestionCategory)
  @IsOptional()
  category?: QuestionCategory;

  @ApiProperty({
    description: '검색어 (제목/내용)',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: '고정 공지만 조회 여부',
    required: false,
    default: false,
  })
  @IsOptional()
  pinnedOnly?: boolean = false;
}
