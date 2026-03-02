import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateAccountDto {
  @ApiProperty({
    description: '월별 용돈 포인트',
    example: 150,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyAllowance?: number;

  @ApiProperty({
    description: '적금 이자율 (%)',
    example: 3.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  savingsInterestRate?: number;
}
