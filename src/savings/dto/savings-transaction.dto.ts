import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ description: '입금 금액', example: 50000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: '메모',
    example: '3월 추가 적립',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawDto {
  @ApiProperty({ description: '출금 금액', example: 300000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '사용 목적 (필수)', example: '항공권 구매' })
  @IsString()
  description: string;
}
