import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAccountHoldingRecordDto {
  @ApiProperty({
    description: '기록 날짜 (AccountRecord와 동일한 날짜여야 함)',
    example: '2026-05-01',
  })
  @IsDateString()
  recordDate: string;

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
    description: '해당 종목 금액',
    example: 2000000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
