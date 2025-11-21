import { IsString, IsOptional, MaxLength } from 'class-validator';
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
}
