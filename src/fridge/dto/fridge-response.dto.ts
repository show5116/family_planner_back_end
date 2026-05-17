import { ApiProperty } from '@nestjs/swagger';

export class StorageLocationDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: 'uuid-group' })
  groupId: string;

  @ApiProperty({ example: '우리집 냉장고' })
  name: string;

  @ApiProperty({ enum: ['FRIDGE', 'FREEZER', 'PANTRY'], example: 'FRIDGE' })
  type: string;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;
}

export class FridgeItemDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: 'uuid-group' })
  groupId: string;

  @ApiProperty({ example: 'uuid-storage' })
  storageLocationId: string;

  @ApiProperty({ example: '우유' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: '개', nullable: true })
  unit: string | null;

  @ApiProperty()
  registeredAt: Date;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ example: 3 })
  alertDaysBefore: number;

  @ApiProperty({ example: '유기농', nullable: true })
  memo: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FrequentItemDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: 'uuid-group' })
  groupId: string;

  @ApiProperty({ example: '우유' })
  name: string;

  @ApiProperty({ example: '개', nullable: true })
  defaultUnit: string | null;

  @ApiProperty({ example: true })
  autoAdd: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
