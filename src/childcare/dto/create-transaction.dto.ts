import { ApiProperty } from '@nestjs/swagger';
import { ChildcareTransactionType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: '거래 유형. shopItemId 또는 ruleId 지정 시 자동 설정됨',
    enum: ChildcareTransactionType,
    example: ChildcareTransactionType.REWARD,
    required: false,
  })
  @IsOptional()
  @IsEnum(ChildcareTransactionType)
  type?: ChildcareTransactionType;

  @ApiProperty({
    description: '포인트 금액. shopItemId 또는 ruleId 지정 시 자동 설정됨',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({
    description: '설명. shopItemId 또는 ruleId 지정 시 자동 설정됨',
    example: '심부름 완료',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description:
      '상점 아이템 ID. 지정 시 type=PURCHASE, amount/description 자동 설정',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  shopItemId?: string;

  @ApiProperty({
    description:
      '규칙 ID. 지정 시 type/amount/description 자동 설정 (INFO 타입 규칙은 적용 불가)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  ruleId?: string;
}
