import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
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

export class FridgeItemEntryDto {
  @ApiProperty({ example: 'uuid-storage' })
  @IsUUID()
  storageLocationId: string;

  @ApiProperty({ example: '우유', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: '개', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: '2026-05-20', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ example: 3, required: false, minimum: 0, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  alertDaysBefore?: number;

  @ApiProperty({ example: '유기농', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}

export class BulkCreateFridgeItemDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ type: [FridgeItemEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FridgeItemEntryDto)
  items: FridgeItemEntryDto[];
}
