import { ApiProperty } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: 'uuid-cart' })
  cartId: string;

  @ApiProperty({ example: 'uuid-frequent', nullable: true })
  frequentItemId: string | null;

  @ApiProperty({ example: '우유' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: '개', nullable: true })
  unit: string | null;

  @ApiProperty({ example: false })
  isChecked: boolean;

  @ApiProperty({ example: '1+1 행사', nullable: true })
  memo: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class ShoppingCartDto {
  @ApiProperty({ example: 'uuid-cart' })
  id: string;

  @ApiProperty({ example: 'uuid-group' })
  groupId: string;

  @ApiProperty({ type: [CartItemDto] })
  items: CartItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ShoppingHistoryItemDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: '우유' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: '개', nullable: true })
  unit: string | null;

  @ApiProperty({ example: true })
  transferredToFridge: boolean;

  @ApiProperty({ example: 'uuid-fridge-item', nullable: true })
  fridgeItemId: string | null;
}

export class LinkedExpenseDto {
  @ApiProperty({ example: 'uuid-expense' })
  id: string;

  @ApiProperty({ example: 45000 })
  amount: string;

  @ApiProperty({ example: 'FOOD', nullable: true })
  category: string | null;

  @ApiProperty({ example: 'CARD', nullable: true })
  paymentMethod: string | null;

  @ApiProperty()
  date: Date;

  @ApiProperty({ example: '마트 장보기', nullable: true })
  description: string | null;
}

export class ShoppingHistoryDto {
  @ApiProperty({ example: 'uuid-history' })
  id: string;

  @ApiProperty({ example: 'uuid-group' })
  groupId: string;

  @ApiProperty()
  completedAt: Date;

  @ApiProperty({ type: [ShoppingHistoryItemDto] })
  items: ShoppingHistoryItemDto[];

  @ApiProperty({
    type: LinkedExpenseDto,
    nullable: true,
    description:
      '연결된 가계부 지출 (장보기 완료 시 가계부 등록한 경우에만 존재)',
  })
  expense: LinkedExpenseDto | null;
}

export class PaginatedHistoryDto {
  @ApiProperty({ type: [ShoppingHistoryDto] })
  data: ShoppingHistoryDto[];

  @ApiProperty({ example: 20 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
