import { ApiProperty } from '@nestjs/swagger';
import { ChildcareTransactionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class TransactionQueryDto {
  @ApiProperty({
    description: '거래 유형 필터',
    enum: ChildcareTransactionType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ChildcareTransactionType)
  type?: ChildcareTransactionType;

  @ApiProperty({
    description: '조회 월 (YYYY-MM)',
    example: '2026-03',
    required: false,
  })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({
    description: '조회 연도 (YYYY)',
    example: '2026',
    required: false,
  })
  @IsOptional()
  @IsString()
  year?: string;
}
