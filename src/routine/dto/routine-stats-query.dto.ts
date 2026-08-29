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

  @ApiProperty({
    description:
      '조회 기준일 (YYYY-MM-DD, 옵션). 이 날짜가 속한 주(월~일)/달(1일~말일)을 계산. 생략 시 오늘 기준',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    description:
      'from과 함께 명시하면 [from, to] 범위를 스냅 없이 그대로 사용 (옵션). from 없이 단독으로는 무시됨',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
