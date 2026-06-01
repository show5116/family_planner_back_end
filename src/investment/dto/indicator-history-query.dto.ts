import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class IndicatorHistoryQueryDto {
  @ApiProperty({
    description: '조회 일수 (1~1825)',
    example: 30,
    required: false,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1825)
  days?: number = 30;
}
