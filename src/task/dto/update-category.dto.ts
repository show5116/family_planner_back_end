import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '카테고리 이름', example: '업무' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '설명', example: '업무 관련 일정' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '이모지', example: '💼' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ description: '색상 코드 (HEX)', example: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;
}
