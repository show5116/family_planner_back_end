import { ApiProperty } from '@nestjs/swagger';
import { SavingsInterestType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class CreateSavingsPlanDto {
  @ApiProperty({ description: '월 적금액 (포인트)', example: 20 })
  @IsInt()
  @Min(1)
  monthlyAmount: number;

  @ApiProperty({
    description: '연 이자율 (%)',
    example: 3.5,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiProperty({
    description: '이자 유형 (SIMPLE: 단리, COMPOUND: 복리)',
    enum: SavingsInterestType,
    example: SavingsInterestType.SIMPLE,
  })
  @IsEnum(SavingsInterestType)
  interestType: SavingsInterestType;

  @ApiProperty({
    description: '적금 시작일 (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '적금 만기일 (YYYY-MM-DD)',
    example: '2027-04-01',
  })
  @IsDateString()
  endDate: string;
}
