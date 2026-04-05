import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class CreateBudgetDto {
  @ApiProperty({
    description: '그룹 ID (개인 예산 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

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

export class CategoryBudgetItemDto {
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
}

export class BulkUpsertBudgetDto {
  @ApiProperty({
    description: '그룹 ID (개인 예산 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '예산 월 (YYYY-MM)',
    example: '2026-04',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: '월 형식은 YYYY-MM이어야 합니다' })
  month: string;

  @ApiProperty({
    description: '전체 예산 금액',
    example: 1500000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiProperty({
    description: '카테고리별 예산 목록',
    type: [CategoryBudgetItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryBudgetItemDto)
  categories?: CategoryBudgetItemDto[];
}
