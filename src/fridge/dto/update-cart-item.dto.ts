import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCartItemDto {
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

  @ApiProperty({ example: '1+1 행사', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}
