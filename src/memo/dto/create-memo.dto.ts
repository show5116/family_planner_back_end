import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemoFormat } from '@/memo/enums/memo-format.enum';
import { MemoType } from '@/memo/enums/memo-type.enum';
import { MemoVisibility } from '@/memo/enums/memo-visibility.enum';

class CreateMemoTagDto {
  @ApiProperty({ description: '태그 이름', example: '중요' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: '태그 색상',
    example: '#FF5733',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}

export class CreateMemoDto {
  @ApiProperty({
    description: '메모 제목',
    example: '회의 메모',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: '메모 본문',
    example: '# 회의 내용\n- 항목 1\n- 항목 2',
  })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({
    description: '메모 형식',
    enum: MemoFormat,
    default: MemoFormat.MARKDOWN,
    required: false,
  })
  @IsOptional()
  @IsEnum(MemoFormat)
  format?: MemoFormat = MemoFormat.MARKDOWN;

  @ApiProperty({
    description: '메모 타입 (NOTE: 일반, CHECKLIST: 체크리스트)',
    enum: MemoType,
    default: MemoType.NOTE,
    required: false,
  })
  @IsOptional()
  @IsEnum(MemoType)
  type?: MemoType = MemoType.NOTE;

  @ApiProperty({ description: '카테고리', example: '회의록', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

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
}
