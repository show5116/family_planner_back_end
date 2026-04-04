import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class StatisticsQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '조회 월 (YYYY-MM)', example: '2026-02' })
  @IsString()
  month: string;
}

export class YearlyStatisticsQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '조회 연도 (YYYY)', example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: '연도 형식은 YYYY이어야 합니다' })
  year: string;
}

export class BudgetQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

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
