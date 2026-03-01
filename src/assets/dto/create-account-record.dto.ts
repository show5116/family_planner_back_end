import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateAccountRecordDto {
  @ApiProperty({ description: '기록 날짜 (YYYY-MM-DD)', example: '2026-03-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '날짜 형식은 YYYY-MM-DD이어야 합니다',
  })
  recordDate: string;

  @ApiProperty({ description: '잔액', example: 5000000 })
  @IsNumber()
  @Min(0)
  balance: number;

  @ApiProperty({ description: '원금', example: 4800000 })
  @IsNumber()
  @Min(0)
  principal: number;

  @ApiProperty({ description: '수익금', example: 200000 })
  @IsNumber()
  profit: number;

  @ApiProperty({
    description: '메모',
    example: '이자 입금',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
