import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import {
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  TransactionType,
} from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({
    description: '그룹 ID (개인 지출 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '거래 유형 (기본값: EXPENSE)',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({ description: '금액', example: 15000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiProperty({ description: '지출 날짜 (YYYY-MM-DD)', example: '2026-02-27' })
  @IsDateString()
  date: string;

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
    description: '소비처 ID',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({
    description: '고정 지출 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({
    description:
      '예상 금액 (가변 고정 지출에 사용, 설정 시 매달 복사본은 미확인 상태로 생성)',
    example: 150000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedAmount?: number;

  @ApiProperty({
    description: '입금 카테고리 (type=INCOME 일 때 사용)',
    enum: IncomeCategory,
    example: IncomeCategory.SALARY,
    required: false,
  })
  @IsOptional()
  @IsEnum(IncomeCategory)
  incomeCategory?: IncomeCategory;

  @ApiProperty({
    description: '환불 대상 지출 ID (반품/환불 시 원본 지출과 연결)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  refundedExpenseId?: string;
}
