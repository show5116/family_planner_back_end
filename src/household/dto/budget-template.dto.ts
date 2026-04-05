import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class UpsertBudgetTemplateDto {
  @ApiProperty({
    description: '그룹 ID (개인 템플릿 시 생략)',
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

  @ApiProperty({ description: '매월 자동 적용할 예산 금액', example: 300000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CategoryTemplateItemDto {
  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
  })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: '매월 자동 적용할 예산 금액', example: 300000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class BulkUpsertBudgetTemplateDto {
  @ApiProperty({
    description: '그룹 ID (개인 템플릿 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '전체 예산 템플릿 금액',
    example: 1500000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiProperty({
    description: '카테고리별 예산 템플릿 목록',
    type: [CategoryTemplateItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTemplateItemDto)
  categories?: CategoryTemplateItemDto[];
}

export class DeleteBudgetTemplateDto {
  @ApiProperty({
    description: '그룹 ID (개인 템플릿 시 생략)',
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
}
