import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAccountHoldingDto {
  @ApiProperty({
    description: '종목/자산명',
    example: '나스닥 ETF',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: '티커 심볼',
    example: 'QQQ',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ticker?: string;

  @ApiProperty({
    description: '비율 (%, 0.01~100)',
    example: 40.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  ratio?: number;
}
