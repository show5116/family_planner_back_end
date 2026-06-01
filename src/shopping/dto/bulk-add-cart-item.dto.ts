import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
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

export class CartItemEntryDto {
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

export class BulkAddCartItemDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ type: [CartItemEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemEntryDto)
  items: CartItemEntryDto[];
}
