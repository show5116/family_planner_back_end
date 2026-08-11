import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class HeatmapQueryDto {
  @ApiProperty({
    description: '조회 시작일 (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: '조회 종료일 (YYYY-MM-DD)',
    example: '2026-07-10',
  })
  @IsDateString()
  to: string;
}

export enum RoutineRatePeriod {
  WEEK = 'week',
  MONTH = 'month',
  CUSTOM = 'custom',
}

export class RateQueryDto {
  @ApiProperty({
    description: '기간 단위',
    enum: RoutineRatePeriod,
    default: RoutineRatePeriod.WEEK,
  })
  @IsEnum(RoutineRatePeriod)
  period: RoutineRatePeriod = RoutineRatePeriod.WEEK;

  @ApiProperty({
    description: 'period=custom일 때 시작일 (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    description: 'period=custom일 때 종료일 (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export enum OverviewPeriod {
  WEEK = 'week',
  MONTH = 'month',
}

export class OverviewQueryDto {
  @ApiProperty({
    description: '기간 단위',
    enum: OverviewPeriod,
    default: OverviewPeriod.WEEK,
  })
  @IsEnum(OverviewPeriod)
  period: OverviewPeriod = OverviewPeriod.WEEK;
}
