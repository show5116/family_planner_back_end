import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export class TransferItemDto {
  @ApiProperty({ example: 'uuid-cart-item' })
  @IsUUID()
  cartItemId: string;

  @ApiProperty({ example: 'uuid-storage' })
  @IsUUID()
  storageLocationId: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiProperty({ example: '개', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: 3500, required: false, description: '품목 금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: '2026-05-30', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  alertDaysBefore?: number;
}

export class ShoppingExpenseDto {
  @ApiProperty({
    example: 45000,
    required: false,
    description: '총 구매액 (생략 시 품목별 금액 합계로 자동 계산)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: 'CARD',
    required: false,
    description: '결제 수단',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    example: '2026-05-12',
    required: false,
    description: '지출 날짜 (기본: 오늘)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    example: '마트 장보기',
    required: false,
    description: '지출 내용',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({
    enum: ExpenseCategory,
    example: 'FOOD',
    required: false,
    description: '가계부 카테고리 (기본: FOOD)',
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

export class CompleteShoppingDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({
    type: [TransferItemDto],
    description: '냉장고로 이관할 품목 목록',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  transfers: TransferItemDto[];

  @ApiProperty({
    type: ShoppingExpenseDto,
    required: false,
    description: '가계부 자동 등록 (생략 시 가계부 미등록)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShoppingExpenseDto)
  expense?: ShoppingExpenseDto;
}
