import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Matches } from 'class-validator';

export class UpsertGroupBudgetDto {
  @ApiProperty({
    description: '그룹 ID (개인 총 예산 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ description: '전체 예산 금액', example: 1500000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: '예산 월 (YYYY-MM)',
    example: '2026-04',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: '월 형식은 YYYY-MM이어야 합니다' })
  month: string;
}

export class UpsertGroupBudgetTemplateDto {
  @ApiProperty({
    description: '그룹 ID (개인 총 예산 템플릿 시 생략)',
    example: 'uuid-1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    description: '매월 자동 적용할 전체 예산 금액',
    example: 1500000,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
