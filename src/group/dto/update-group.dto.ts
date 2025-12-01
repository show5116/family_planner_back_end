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
  @MaxLength(100, { message: '그룹명은 최대 100자까지 가능합니다' })
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
    message: '유효한 HEX 색상 코드를 입력해주세요 (예: #6366F1)',
  })
  defaultColor?: string;
}
