import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import {
  ExpenseCategory,
  PaymentMethod,
  TransactionType,
} from '@prisma/client';

export const EXPENSE_CATEGORY_NONE = 'NONE' as const;
export type ExpenseCategoryFilter =
  | ExpenseCategory
  | typeof EXPENSE_CATEGORY_NONE;

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
  @Matches(/^\d{4}-\d{2}$/, { message: 'validation.month_format' })
  month?: string;

  @ApiProperty({
    description: '카테고리 필터 (NONE: 카테고리 없는 항목 조회)',
    enum: [...Object.values(ExpenseCategory), EXPENSE_CATEGORY_NONE],
    required: false,
  })
  @IsOptional()
  @IsEnum([...Object.values(ExpenseCategory), EXPENSE_CATEGORY_NONE])
  category?: ExpenseCategoryFilter;

  @ApiProperty({
    description: '결제 수단 필터',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: '거래 유형 필터 (생략 시 전체 조회)',
    enum: TransactionType,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
