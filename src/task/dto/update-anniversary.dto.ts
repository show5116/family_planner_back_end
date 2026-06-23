import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneConfigDto } from './create-anniversary.dto';

export class UpdateAnniversaryDto {
  @ApiPropertyOptional({ description: '기념일 이름', example: '연애 시작일' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: '기념일 날짜 (YYYY-MM-DD)',
    example: '2023-01-01',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: '이모지', example: '💑' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({
    description: 'milestone Task 자동 생성 설정',
    type: MilestoneConfigDto,
  })
  @ValidateNested()
  @Type(() => MilestoneConfigDto)
  @IsOptional()
  milestoneConfig?: MilestoneConfigDto;
}
