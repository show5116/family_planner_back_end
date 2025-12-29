import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionCategory } from '../enums/question-category.enum';
import { QuestionVisibility } from '../enums/question-visibility.enum';
import { AttachmentDto } from './attachment.dto';

export class UpdateQuestionDto {
  @ApiProperty({
    description: '질문 제목',
    minLength: 1,
    maxLength: 200,
    required: false,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: '질문 내용',
    minLength: 1,
    maxLength: 5000,
    required: false,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: '질문 카테고리',
    enum: QuestionCategory,
    required: false,
  })
  @IsEnum(QuestionCategory)
  @IsOptional()
  category?: QuestionCategory;

  @ApiProperty({
    description: '공개 여부',
    enum: QuestionVisibility,
    required: false,
  })
  @IsEnum(QuestionVisibility)
  @IsOptional()
  visibility?: QuestionVisibility;

  @ApiProperty({
    description: '첨부파일 목록',
    type: [AttachmentDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
