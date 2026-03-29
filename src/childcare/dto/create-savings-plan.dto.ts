import { ApiProperty } from '@nestjs/swagger';
import { SavingsInterestType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateSavingsPlanDto {
  @ApiProperty({ description: '월 적금액 (포인트)', example: 20 })
  @IsOptional()
  @ValidateIf((o) => o.monthlyAmount !== undefined)
  @IsInt()
  @Min(1)
  monthlyAmount: number;

  @ApiProperty({
    description: '연 이자율 (%)',
    example: 3.5,
  })
  @IsOptional()
  @ValidateIf((o) => o.interestRate !== undefined)
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiProperty({
    description: '이자 유형 (SIMPLE: 단리, COMPOUND: 복리)',
    enum: SavingsInterestType,
    example: SavingsInterestType.SIMPLE,
  })
  @IsOptional()
  @ValidateIf((o) => o.interestType !== undefined)
  @IsEnum(SavingsInterestType)
  interestType: SavingsInterestType;

  @ApiProperty({
    description: '적금 시작일 (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsOptional()
  @ValidateIf((o) => o.startDate !== undefined)
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '적금 만기일 (YYYY-MM-DD)',
    example: '2027-04-01',
  })
  @IsOptional()
  @ValidateIf((o) => o.endDate !== undefined)
  @IsDateString()
  endDate: string;
}
