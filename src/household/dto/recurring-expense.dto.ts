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
  Max,
  IsInt,
} from 'class-validator';
import {
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  TransactionType,
} from '@prisma/client';

export class CreateRecurringExpenseDto {
  @ApiProperty({ description: '그룹 ID (개인 지출 시 생략)', required: false })
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

  @ApiProperty({ description: '금액', example: 150000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description:
      '가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVariable?: boolean;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiProperty({
    description: '입금 카테고리 (type=INCOME 일 때 사용)',
    enum: IncomeCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(IncomeCategory)
  incomeCategory?: IncomeCategory;

  @ApiProperty({
    description: '결제 수단',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: '소비처 ID', required: false })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiProperty({ description: '내용', example: '월세', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '매달 발생 일(day). 1~31', example: 25 })
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth: number;

  @ApiProperty({
    description:
      '시작 월 (YYYY-MM-DD, 일자는 무시되고 1일로 저장됨). 과거 월을 지정하면 등록 시점에 소급하여 오늘까지 지출 내역을 생성합니다.',
    required: false,
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description:
      '총 반복 개월 수 (예: 24개월 할부). 생략 시 무기한 반복됩니다. 입력 시 startDate가 함께 필요합니다.',
    required: false,
    example: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalMonths?: number;

  @ApiProperty({
    description: '결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용)',
    required: false,
  })
  @IsOptional()
  @IsString()
  memberId?: string;
}

export class UpdateRecurringExpenseDto {
  @ApiProperty({ description: '금액', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    description: '가변 여부',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVariable?: boolean;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiProperty({
    description: '입금 카테고리 (null 전달 시 해제)',
    enum: IncomeCategory,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(IncomeCategory)
  incomeCategory?: IncomeCategory | null;

  @ApiProperty({
    description: '결제 수단',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: '소비처 ID (null 전달 시 해제)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  merchantId?: string | null;

  @ApiProperty({ description: '내용', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '매달 발생 일(day). 1~31', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiProperty({
    description:
      '시작 월 (YYYY-MM-DD, 일자는 무시되고 1일로 저장됨). 수정 시에는 소급 생성을 다시 수행하지 않으며, 종료 시점 재계산에만 사용됩니다.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '총 반복 개월 수 (null 전달 시 무기한 반복으로 변경)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.totalMonths !== null)
  @IsInt()
  @Min(1)
  totalMonths?: number | null;

  @ApiProperty({ description: '활성 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: '결제 주체 ID (null 전달 시 해제)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.memberId !== null)
  @IsString()
  memberId?: string | null;
}

export class RecurringExpenseQueryDto {
  @ApiProperty({ description: '그룹 ID (생략 시 개인)', required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '비활성 포함 여부 (기본: 활성만)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
