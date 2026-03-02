import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SavingsDepositDto {
  @ApiProperty({ description: '입금 포인트', example: 50 })
  @IsInt()
  @Min(1)
  amount: number;
}

export class SavingsWithdrawDto {
  @ApiProperty({ description: '출금 포인트', example: 50 })
  @IsInt()
  @Min(1)
  amount: number;
}
