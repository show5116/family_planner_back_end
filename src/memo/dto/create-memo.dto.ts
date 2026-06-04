import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { sanitizeHtmlContent } from '@/common/utils/sanitize-html.util';
import { MemoFormat } from '@/memo/enums/memo-format.enum';
import { MemoVisibility } from '@/memo/enums/memo-visibility.enum';

class CreateMemoTagDto {
  @ApiProperty({ description: '태그 이름', example: '중요' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

export class ChecklistMetaDto {
  @ApiProperty({ description: '전체 체크리스트 항목 수', example: 11 })
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({ description: '체크된 항목 수', example: 3 })
  @IsInt()
  @Min(0)
  checked: number;
}

export class CreateMemoDto {
  @ApiProperty({
    description: '메모 제목',
    example: '외박 준비물',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Delta JSON 문자열 (format=DELTA) 또는 일반 텍스트',
    example: '{"ops":[{"insert":"본문 텍스트\\n"}]}',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeHtmlContent(value))
  @IsString()
  content?: string;

  @ApiProperty({
    description: '메모 형식 (기본값: DELTA)',
    enum: MemoFormat,
    default: MemoFormat.DELTA,
    required: false,
  })
  @IsOptional()
  @IsEnum(MemoFormat)
  format?: MemoFormat = MemoFormat.DELTA;

  @ApiProperty({
    description: '공개 범위',
    enum: MemoVisibility,
    default: MemoVisibility.PRIVATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(MemoVisibility)
  visibility?: MemoVisibility = MemoVisibility.PRIVATE;

  @ApiProperty({ description: '그룹 ID (GROUP 공개 시 필수)', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '태그 목록',
    type: [CreateMemoTagDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMemoTagDto)
  tags?: CreateMemoTagDto[];

  @ApiProperty({
    description: '체크리스트 집계 (Delta에 list 블록이 있을 때 전송)',
    type: ChecklistMetaDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChecklistMetaDto)
  checklistMeta?: ChecklistMetaDto;
}
