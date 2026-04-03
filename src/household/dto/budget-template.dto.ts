import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class UpsertBudgetTemplateDto {
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

  @ApiProperty({ description: '매월 자동 적용할 예산 금액', example: 300000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class DeleteBudgetTemplateDto {
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
}
