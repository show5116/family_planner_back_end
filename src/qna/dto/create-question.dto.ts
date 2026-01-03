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

export class CreateQuestionDto {
  @ApiProperty({
    description: '질문 제목',
    minLength: 1,
    maxLength: 200,
    example: '앱이 자꾸 종료돼요',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: '질문 내용',
    minLength: 1,
    maxLength: 5000,
    example: '홈 화면에서 특정 버튼을 누르면 앱이 종료됩니다.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: '질문 카테고리',
    enum: QuestionCategory,
    example: QuestionCategory.BUG,
  })
  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @ApiProperty({
    description:
      '공개 여부 (PUBLIC: 모든 사용자 조회 가능, PRIVATE: 본인/ADMIN만 조회 가능)',
    enum: QuestionVisibility,
    default: QuestionVisibility.PRIVATE,
    required: false,
  })
  @IsEnum(QuestionVisibility)
  @IsOptional()
  visibility?: QuestionVisibility = QuestionVisibility.PRIVATE;

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
