import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export class ExpenseQueryDto {
  @ApiProperty({
    description: '그룹 ID (개인 조회 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '조회 월 (YYYY-MM)',
    example: '2026-02',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: '월 형식은 YYYY-MM이어야 합니다' })
  month?: string;

  @ApiProperty({
    description: '카테고리 필터',
    enum: ExpenseCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiProperty({
    description: '결제 수단 필터',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
