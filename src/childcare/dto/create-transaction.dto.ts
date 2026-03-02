import { ApiProperty } from '@nestjs/swagger';
import { ChildcareTransactionType } from '@prisma/client';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: '거래 유형',
    enum: ChildcareTransactionType,
    example: ChildcareTransactionType.REWARD,
  })
  @IsEnum(ChildcareTransactionType)
  type: ChildcareTransactionType;

  @ApiProperty({ description: '포인트 금액', example: 50 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '설명', example: '심부름 완료' })
  @IsString()
  description: string;
}
