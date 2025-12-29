import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @ApiProperty({ description: '파일 URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: '파일 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  @IsString()
  size: number;
}

export class CreateAnnouncementDto {
  @ApiProperty({
    description: '공지사항 제목',
    minLength: 1,
    maxLength: 200,
    example: 'v2.0 업데이트 안내',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: '공지사항 내용 (Markdown 지원)',
    minLength: 1,
    maxLength: 10000,
    example: '새로운 기능이 추가되었습니다...',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiProperty({
    description: '상단 고정 여부',
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean = false;

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
