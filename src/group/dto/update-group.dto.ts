import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto {
  @ApiPropertyOptional({
    description: '그룹명',
    example: '우리 가족',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'validation.group_name_max' })
  name?: string;

  @ApiPropertyOptional({
    description: '그룹 설명',
    example: '가족 일정 및 할일 공유 그룹',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '그룹 기본 색상 (HEX 코드)',
    example: '#6366F1',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'validation.hex_color_alt',
  })
  defaultColor?: string;
}
