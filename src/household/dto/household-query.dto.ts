import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export class StatisticsQueryDto {
  @ApiProperty({
    description: '그룹 ID (개인 조회 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '조회 월 (YYYY-MM)', example: '2026-02' })
  @IsString()
  month: string;

  @ApiProperty({
    description: '환불 입금 제외 여부 (환불로 연결된 INCOME 항목 제외)',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeRefunds?: boolean;

  @ApiProperty({
    description: '이월 입금 제외 여부 (incomeCategory=CARRYOVER 항목 제외)',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeCarryover?: boolean;
}

export class YearlyStatisticsQueryDto {
  @ApiProperty({
    description: '그룹 ID (개인 조회 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '조회 연도 (YYYY)', example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'validation.year_format' })
  year: string;

  @ApiProperty({
    description: '환불 입금 제외 여부 (환불로 연결된 INCOME 항목 제외)',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeRefunds?: boolean;

  @ApiProperty({
    description: '이월 입금 제외 여부 (incomeCategory=CARRYOVER 항목 제외)',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeCarryover?: boolean;
}

export class BudgetQueryDto {
  @ApiProperty({
    description: '그룹 ID (개인 예산 조회 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '조회 월 (YYYY-MM)', example: '2026-02' })
  @IsString()
  month: string;

  @ApiProperty({
    description: '카테고리 필터',
    enum: ExpenseCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}

export class ReceiptUploadQueryDto {
  @ApiProperty({ description: 'MIME 타입', example: 'image/jpeg' })
  @IsString()
  mimeType: string;
}
