import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateAllowancePlanDto {
  @ApiProperty({ description: '월 지급 포인트', example: 100 })
  @IsInt()
  @Min(0)
  monthlyPoints: number;

  @ApiProperty({ description: '월 지급일 (1~31)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(31)
  payDay: number;

  @ApiProperty({ description: '포인트 : 원 비율 (1포인트 = N원)', example: 10 })
  @IsInt()
  @Min(1)
  pointToMoneyRatio: number;

  @ApiProperty({
    description: '다음 연봉 협상일 (YYYY-MM-DD)',
    example: '2027-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  nextNegotiationDate?: string;
}
