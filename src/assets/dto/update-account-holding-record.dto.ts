import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAccountHoldingRecordDto {
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
    description: '해당 종목 금액',
    example: 2000000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}
