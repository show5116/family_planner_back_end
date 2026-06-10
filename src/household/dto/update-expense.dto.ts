import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  ValidateIf,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  TransactionType,
} from '@prisma/client';

export class UpdateExpenseDto {
  @ApiProperty({
    description: '거래 유형',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({ description: '금액', example: 15000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiProperty({
    description: '지출 날짜 (YYYY-MM-DD)',
    example: '2026-02-27',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: '내용',
    example: '점심 식사',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '결제 수단',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: '소비처 ID (null 전달 시 소비처 연결 해제)',
    example: 'uuid-1234',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  merchantId?: string | null;

  @ApiProperty({
    description: '입금 카테고리 (type=INCOME 일 때 사용, null 전달 시 해제)',
    enum: IncomeCategory,
    example: IncomeCategory.SALARY,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(IncomeCategory)
  incomeCategory?: IncomeCategory | null;

  @ApiProperty({
    description:
      '실제 금액 확인 여부 (가변 고정지출 자동 생성 시 false로 설정됨)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;

  @ApiProperty({
    description: '환불 대상 지출 ID (null 전달 시 연결 해제)',
    example: 'uuid-1234',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  refundedExpenseId?: string | null;

  @ApiProperty({
    description: '결제 주체 ID (null 전달 시 해제)',
    example: 'uuid-1234',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.memberId !== null)
  @IsString()
  memberId?: string | null;
}
