import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttachmentDto } from './attachment.dto';

export class CreateAnswerDto {
  @ApiProperty({
    description: '답변 내용',
    minLength: 1,
    maxLength: 5000,
    example:
      '해당 문제는 최신 버전에서 수정되었습니다. 앱을 업데이트 해주세요.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

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
