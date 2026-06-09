import { ApiProperty } from '@nestjs/swagger';
import {
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  TransactionType,
} from '@prisma/client';

export class RecurringExpenseDto {
  @ApiProperty({ description: '고정지출 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234', nullable: true })
  groupId: string | null;

  @ApiProperty({ description: '등록자 ID', example: 'uuid-1234' })
  userId: string;

  @ApiProperty({
    description: '거래 유형',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @ApiProperty({ description: '기본 금액', example: '150000.00' })
  amount: string;

  @ApiProperty({
    description:
      '가변 여부 (true면 자동 생성된 Expense는 미확정(isConfirmed=false) 상태로 등록됨)',
    example: false,
  })
  isVariable: boolean;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    nullable: true,
  })
  category: ExpenseCategory | null;

  @ApiProperty({
    description: '입금 카테고리',
    enum: IncomeCategory,
    nullable: true,
  })
  incomeCategory: IncomeCategory | null;

  @ApiProperty({
    description: '결제 수단',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod | null;

  @ApiProperty({ description: '소비처 ID', nullable: true })
  merchantId: string | null;

  @ApiProperty({ description: '내용', example: '월세', nullable: true })
  description: string | null;

  @ApiProperty({ description: '매달 발생 일(day). 1~31', example: 25 })
  dayOfMonth: number;

  @ApiProperty({ description: '활성 여부', example: true })
  isActive: boolean;

  @ApiProperty({
    description: '결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용)',
    example: 'uuid-1234',
    nullable: true,
  })
  memberId: string | null;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-06-08T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-06-08T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class MerchantDto {
  @ApiProperty({ description: '소비처 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234', nullable: true })
  groupId: string | null;

  @ApiProperty({
    description: '작성자 ID',
    example: 'uuid-1234',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({ description: '소비처 이름', example: '쿠팡' })
  name: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class ExpenseReceiptDto {
  @ApiProperty({ description: '영수증 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '지출 ID', example: 'uuid-1234' })
  expenseId: string;

  @ApiProperty({
    description: '파일 URL',
    example: 'https://cdn.example.com/receipts/xxx.jpg',
  })
  fileUrl: string;

  @ApiProperty({ description: '파일명', example: 'receipt.jpg' })
  fileName: string;

  @ApiProperty({ description: '파일 크기 (bytes)', example: 102400 })
  fileSize: number;

  @ApiProperty({ description: 'MIME 타입', example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  createdAt: Date;
}

export class ReceiptUploadUrlDto {
  @ApiProperty({ description: 'Presigned 업로드 URL' })
  uploadUrl: string;

  @ApiProperty({
    description: '파일 키 (업로드 완료 후 confirmReceipt에 사용)',
  })
  fileKey: string;
}

export class ExpenseDto {
  @ApiProperty({ description: '지출 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({ description: '작성자 ID', example: 'uuid-1234' })
  userId: string;

  @ApiProperty({
    description: '거래 유형',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  type: TransactionType;

  @ApiProperty({ description: '금액', example: 15000 })
  amount: string;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
  })
  category: ExpenseCategory;

  @ApiProperty({
    description: '지출 날짜',
    example: '2026-02-27T00:00:00.000Z',
  })
  date: Date;

  @ApiProperty({
    description: '내용',
    example: '점심 식사',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '결제 수단',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    nullable: true,
  })
  paymentMethod: PaymentMethod | null;

  @ApiProperty({
    description: '입금 카테고리 (type=INCOME 일 때)',
    enum: IncomeCategory,
    example: IncomeCategory.SALARY,
    nullable: true,
  })
  incomeCategory: IncomeCategory | null;

  @ApiProperty({
    description: '연결된 고정지출 규칙 ID (스케줄러로 자동 생성된 경우)',
    example: 'uuid-1234',
    nullable: true,
    required: false,
  })
  recurringExpenseId: string | null;

  @ApiProperty({
    description:
      '실제 금액 확인 여부 (false = 가변 고정지출로 자동 생성된 미확정 항목)',
    example: true,
  })
  isConfirmed: boolean;

  @ApiProperty({
    description: '소비처',
    type: () => MerchantDto,
    nullable: true,
    required: false,
  })
  merchant: MerchantDto | null;

  @ApiProperty({
    description: '환불 대상 지출 ID (반품/환불 시 원본 지출 ID)',
    example: 'uuid-1234',
    nullable: true,
    required: false,
  })
  refundedExpenseId: string | null;

  @ApiProperty({
    description: '이 지출에 연결된 환불 목록',
    type: () => [ExpenseDto],
    required: false,
  })
  refunds: ExpenseDto[];

  @ApiProperty({
    description: '결제 주체 ID (결제자 또는 소비자, 가정마다 다르게 활용)',
    example: 'uuid-1234',
    nullable: true,
    required: false,
  })
  memberId: string | null;

  @ApiProperty({
    description:
      '연결된 장보기 이력 ID (장보기 완료 시 자동 생성된 지출에만 존재)',
    example: 'uuid-1234',
    nullable: true,
    required: false,
  })
  shoppingHistoryId: string | null;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class BudgetDto {
  @ApiProperty({ description: '예산 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
  })
  category: ExpenseCategory;

  @ApiProperty({ description: '예산 금액', example: '300000.00' })
  amount: string;

  @ApiProperty({ description: '예산 월', example: '2026-02-01T00:00:00.000Z' })
  month: Date;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class CategoryStatDto {
  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
  })
  category: ExpenseCategory;

  @ApiProperty({ description: '총 지출', example: '120000.00' })
  total: string;

  @ApiProperty({ description: '지출 건수', example: 8 })
  count: number;

  @ApiProperty({
    description: '예산',
    example: '300000.00',
    nullable: true,
  })
  budget: string | null;

  @ApiProperty({
    description: '예산 대비 지출 비율 (%)',
    example: 40,
    nullable: true,
  })
  budgetRatio: number | null;
}

export class StatisticsDto {
  @ApiProperty({ description: '조회 월', example: '2026-02' })
  month: string;

  @ApiProperty({ description: '총 입금', example: '2000000.00' })
  totalIncome: string;

  @ApiProperty({ description: '총 지출', example: '350000.00' })
  totalExpense: string;

  @ApiProperty({ description: '순수지 (입금 - 지출)', example: '1650000.00' })
  balance: string;

  @ApiProperty({ description: '총 예산', example: '500000.00' })
  totalBudget: string;

  @ApiProperty({
    description: '카테고리별 통계 (지출만)',
    type: [CategoryStatDto],
  })
  categories: CategoryStatDto[];
}

export class MonthlyTotalDto {
  @ApiProperty({ description: '월 (YYYY-MM)', example: '2026-01' })
  month: string;

  @ApiProperty({ description: '총 입금', example: '2000000.00' })
  totalIncome: string;

  @ApiProperty({ description: '총 지출', example: '350000.00' })
  totalExpense: string;

  @ApiProperty({ description: '순수지 (입금 - 지출)', example: '1650000.00' })
  balance: string;

  @ApiProperty({ description: '지출 건수', example: 15 })
  count: number;
}

export class YearlyStatisticsDto {
  @ApiProperty({ description: '조회 연도', example: '2026' })
  year: string;

  @ApiProperty({ description: '연간 총 입금', example: '24000000.00' })
  totalIncome: string;

  @ApiProperty({ description: '연간 총 지출', example: '4200000.00' })
  totalExpense: string;

  @ApiProperty({
    description: '연간 순수지 (입금 - 지출)',
    example: '19800000.00',
  })
  balance: string;

  @ApiProperty({ description: '월별 통계 목록', type: [MonthlyTotalDto] })
  months: MonthlyTotalDto[];
}

export class BudgetTemplateDto {
  @ApiProperty({ description: '템플릿 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({
    description: '카테고리',
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD,
  })
  category: ExpenseCategory;

  @ApiProperty({
    description: '매월 자동 적용할 예산 금액',
    example: '300000.00',
  })
  amount: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-02-27T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class GroupBudgetDto {
  @ApiProperty({ description: '전체 예산 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({ description: '전체 예산 금액', example: '1500000.00' })
  amount: string;

  @ApiProperty({ description: '예산 월', example: '2026-04-01T00:00:00.000Z' })
  month: Date;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-04-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-04-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class GroupBudgetTemplateDto {
  @ApiProperty({ description: '템플릿 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({
    description: '매월 자동 적용할 전체 예산 금액',
    example: '1500000.00',
  })
  amount: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-04-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-04-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class BulkBudgetResultDto {
  @ApiProperty({
    description: '전체 예산 설정 결과',
    type: () => GroupBudgetDto,
    nullable: true,
    required: false,
  })
  total?: GroupBudgetDto;

  @ApiProperty({
    description: '카테고리별 예산 설정 결과',
    type: [BudgetDto],
    required: false,
  })
  categories?: BudgetDto[];
}

export class BulkBudgetTemplateResultDto {
  @ApiProperty({
    description: '전체 예산 템플릿 설정 결과',
    type: () => GroupBudgetTemplateDto,
    nullable: true,
    required: false,
  })
  total?: GroupBudgetTemplateDto;

  @ApiProperty({
    description: '카테고리별 예산 템플릿 설정 결과',
    type: [BudgetTemplateDto],
    required: false,
  })
  categories?: BudgetTemplateDto[];
}

export class RecurringCopyResultDto {
  @ApiProperty({ description: '복사된 지출 건수', example: 3 })
  count: number;

  @ApiProperty({ description: '복사된 지출 목록', type: [ExpenseDto] })
  expenses: ExpenseDto[];
}
