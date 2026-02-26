import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  Matches,
} from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateBudgetDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
  })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: '예산 금액', example: 300000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: '예산 월 (YYYY-MM)',
    example: '2026-02',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: '월 형식은 YYYY-MM이어야 합니다' })
  month: string;
}
