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
    example: 'GROCERIES',
    required: false,
    description: '가계부 카테고리 (기본: GROCERIES)',
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiProperty({
    example: 'uuid-merchant',
    required: false,
    description: '소비처 ID',
  })
  @IsOptional()
  @IsUUID()
  merchantId?: string;
}

export class CompleteShoppingDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({
    example: '2026-06-10T14:30:00.000Z',
    required: false,
    description: '장보기 완료 시각 (기본: 현재 시각)',
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({
    type: [TransferItemDto],
    description: '냉장고로 이관할 품목 목록',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  transfers: TransferItemDto[];

  @ApiProperty({
    example: ['uuid-cart-item-1', 'uuid-cart-item-2'],
    required: false,
    description:
      '장바구니에 남겨둘 항목 ID 목록 (제외 항목은 이력에 포함되지 않고 장바구니에 유지됨)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludes?: string[];

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
