import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemInsertEntryDto {
  @ApiProperty({ example: '우유', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: '개', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: 3500, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({ example: '1+1 행사', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}

export class CartItemUpdateEntryDto {
  @ApiProperty({ example: 'uuid-cart-item' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: '우유', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

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

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;

  @ApiProperty({ example: 3500, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({ example: '1+1 행사', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}

export class SyncCartItemsDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ type: [CartItemInsertEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemInsertEntryDto)
  inserts?: CartItemInsertEntryDto[];

  @ApiProperty({ type: [CartItemUpdateEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemUpdateEntryDto)
  updates?: CartItemUpdateEntryDto[];

  @ApiProperty({ example: ['uuid-1', 'uuid-2'], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deletes?: string[];
}
