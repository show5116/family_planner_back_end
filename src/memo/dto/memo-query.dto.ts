import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsEnum, Min, Max } from 'class-validator';
import { MemoVisibility } from '@/memo/enums/memo-visibility.enum';

export class MemoQueryDto {
  @ApiProperty({
    description: '페이지 번호',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: '페이지 크기',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    description: '공개 범위 필터',
    enum: MemoVisibility,
    required: false,
  })
  @IsEnum(MemoVisibility)
  @IsOptional()
  visibility?: MemoVisibility;

  @ApiProperty({ description: '태그 이름 필터', required: false })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ description: '그룹 ID 필터', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '검색어 (제목/내용)', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
