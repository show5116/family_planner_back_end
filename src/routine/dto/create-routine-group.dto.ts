import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoutineGroupDto {
  @ApiProperty({
    description: '그룹 제목',
    example: '아침 루틴',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '이모지', example: '🌅', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @ApiProperty({
    description: '색상 (HEX)',
    example: '#6366F1',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}
