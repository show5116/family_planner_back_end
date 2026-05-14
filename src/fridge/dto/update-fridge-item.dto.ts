import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateFridgeItemDto {
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
  @Min(0)
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

  @ApiProperty({ example: 'uuid-frequent', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  frequentItemId?: string | null;
}
