import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class HistoricalInitQueryDto {
  @ApiProperty({
    description:
      '수집할 과거 일수 (1~5000, 기본 3650). Yahoo/BOK만 적용되며 CoinGecko는 365일, GOLD_KRW_SPOT은 전체 기간 고정.',
    example: 3650,
    required: false,
    default: 3650,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  days?: number = 3650;
}
