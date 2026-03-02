import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class HistoricalInitQueryDto {
  @ApiProperty({
    description: '수집할 과거 일수 (1~3650, 기본 365)',
    example: 365,
    required: false,
    default: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number = 365;
}
