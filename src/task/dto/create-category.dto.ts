import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: '카테고리 이름', example: '업무' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

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

  @ApiPropertyOptional({
    description: '그룹 ID (그룹 카테고리 생성 시)',
    example: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  groupId?: string;
}
