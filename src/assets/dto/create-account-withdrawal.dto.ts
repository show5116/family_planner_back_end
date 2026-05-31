import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { WithdrawalType } from '@prisma/client';

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

  @ApiProperty({
    description: '출금 유형 (PRINCIPAL: 원금 인출, PROFIT: 수익 인출)',
    enum: WithdrawalType,
    example: WithdrawalType.PRINCIPAL,
  })
  @IsEnum(WithdrawalType)
  type: WithdrawalType;

  @ApiProperty({ description: '메모', example: '생활비 출금', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
