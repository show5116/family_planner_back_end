import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsString, IsOptional } from 'class-validator';

export class SkipRecurringDto {
  @ApiProperty({ description: '건너뛸 날짜', example: '2025-12-30' })
  @IsDateString()
  skipDate: string;

  @ApiPropertyOptional({ description: '건너뛰는 이유', example: '공휴일' })
  @IsString()
  @IsOptional()
  reason?: string;
}
