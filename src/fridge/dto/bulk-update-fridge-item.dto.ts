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

export class FridgeItemUpdateEntryDto {
  @ApiProperty({ example: 'uuid-fridge-item' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'uuid-storage', required: false })
  @IsOptional()
  @IsUUID()
  storageLocationId?: string;

  @ApiProperty({ example: '우유', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({ example: '개', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: '2026-05-20', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ example: 3, required: false })
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

export class BulkUpdateFridgeItemDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ type: [FridgeItemUpdateEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FridgeItemUpdateEntryDto)
  updates?: FridgeItemUpdateEntryDto[];

  @ApiProperty({ example: ['uuid-1', 'uuid-2'], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deletes?: string[];
}
