import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAccountHoldingDto {
  @ApiProperty({ description: '종목/자산명', example: '나스닥 ETF' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: '티커 심볼 (선택)',
    example: 'QQQ',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ticker?: string;

  @ApiProperty({
    description: '비율 (%, 0.01~100)',
    example: 40.5,
    minimum: 0.01,
    maximum: 100,
  })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  ratio: number;
}
