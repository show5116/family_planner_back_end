import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateAccountWithdrawalDto {
  @ApiProperty({ description: '출금 날짜 (YYYY-MM-DD)', example: '2026-04-27' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'validation.date_format',
  })
  withdrawalDate: string;

  @ApiProperty({ description: '출금 금액', example: 500000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '메모', example: '생활비 출금', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
