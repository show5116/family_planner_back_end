import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

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

  @ApiProperty({ description: '고정 지출 여부', example: false })
  isRecurring: boolean;

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

  @ApiProperty({ description: '총 지출', example: '350000.00' })
  totalExpense: string;

  @ApiProperty({ description: '총 예산', example: '500000.00' })
  totalBudget: string;

  @ApiProperty({ description: '카테고리별 통계', type: [CategoryStatDto] })
  categories: CategoryStatDto[];
}

export class MonthlyTotalDto {
  @ApiProperty({ description: '월 (YYYY-MM)', example: '2026-01' })
  month: string;

  @ApiProperty({ description: '총 지출', example: '350000.00' })
  total: string;

  @ApiProperty({ description: '지출 건수', example: 15 })
  count: number;
}

export class YearlyStatisticsDto {
  @ApiProperty({ description: '조회 연도', example: '2026' })
  year: string;

  @ApiProperty({ description: '연간 총 지출', example: '4200000.00' })
  totalExpense: string;

  @ApiProperty({ description: '월별 지출 목록', type: [MonthlyTotalDto] })
  months: MonthlyTotalDto[];
}

export class RecurringCopyResultDto {
  @ApiProperty({ description: '복사된 지출 건수', example: 3 })
  count: number;

  @ApiProperty({ description: '복사된 지출 목록', type: [ExpenseDto] })
  expenses: ExpenseDto[];
}
