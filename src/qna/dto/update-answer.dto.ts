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

export class UpdateAnswerDto {
  @ApiProperty({
    description: '답변 내용',
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
