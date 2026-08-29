import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoutineCategoryDto {
  @ApiProperty({
    description: '카테고리 제목',
    example: '규칙적인 삶',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @ApiProperty({ description: '이모지', example: '📅', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @ApiProperty({
    description: '색상 (HEX)',
    example: '#22C55E',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}
