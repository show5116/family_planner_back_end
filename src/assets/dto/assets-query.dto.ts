import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ApiProperty({
    description: '조회할 계좌 ID 목록 (콤마 구분, 미입력 시 그룹 전체)',
    example: 'uuid-1,uuid-2,uuid-3',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value
      ? value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined,
  )
  @IsString({ each: true })
  accountIds?: string[];
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
