import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class StatisticsQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;
}

export enum TrendPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class TrendQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({
    description: '기간 단위 (monthly: 월별, yearly: 연도별)',
    enum: TrendPeriod,
    example: TrendPeriod.MONTHLY,
  })
  @IsEnum(TrendPeriod)
  period: TrendPeriod;

  @ApiProperty({
    description: '[monthly 전용] 조회 연도 (YYYY)',
    example: '2026',
    required: false,
  })
  @ValidateIf((o) => o.period === TrendPeriod.MONTHLY)
  @IsNumberString()
  year?: string;
}

export class AccountTrendQueryDto {
  @ApiProperty({
    description: '기간 단위 (monthly: 월별, yearly: 연도별)',
    enum: TrendPeriod,
    example: TrendPeriod.MONTHLY,
  })
  @IsEnum(TrendPeriod)
  period: TrendPeriod;

  @ApiProperty({
    description: '[monthly 전용] 조회 연도 (YYYY)',
    example: '2026',
    required: false,
  })
  @ValidateIf((o) => o.period === TrendPeriod.MONTHLY)
  @IsNumberString()
  year?: string;
}
