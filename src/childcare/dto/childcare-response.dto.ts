import { ApiProperty } from '@nestjs/swagger';
import { ChildcareTransactionType } from '@prisma/client';

export class ChildcareAccountDto {
  @ApiProperty({ description: '계정 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({ description: '자녀 사용자 ID', example: 'uuid-1234' })
  childUserId: string;

  @ApiProperty({ description: '부모 사용자 ID', example: 'uuid-1234' })
  parentUserId: string;

  @ApiProperty({ description: '현재 포인트 잔액', example: 500 })
  balance: number;

  @ApiProperty({ description: '월별 용돈 포인트', example: 100 })
  monthlyAllowance: number;

  @ApiProperty({ description: '적금 잔액', example: 200 })
  savingsBalance: number;

  @ApiProperty({ description: '적금 이자율 (%)', example: '2.50' })
  savingsInterestRate: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class ChildcareTransactionDto {
  @ApiProperty({ description: '거래 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계정 ID', example: 'uuid-1234' })
  accountId: string;

  @ApiProperty({
    description: '거래 유형',
    enum: ChildcareTransactionType,
    example: ChildcareTransactionType.ALLOWANCE,
  })
  type: ChildcareTransactionType;

  @ApiProperty({ description: '포인트 금액', example: 100 })
  amount: number;

  @ApiProperty({ description: '설명', example: '월 용돈 지급' })
  description: string;

  @ApiProperty({ description: '생성자 ID', example: 'uuid-1234' })
  createdBy: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: Date;
}

export class ChildcareRewardDto {
  @ApiProperty({ description: '보상 항목 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계정 ID', example: 'uuid-1234' })
  accountId: string;

  @ApiProperty({ description: '보상 이름', example: 'TV 30분 더보기' })
  name: string;

  @ApiProperty({
    description: '보상 설명',
    example: 'TV를 30분 추가로 볼 수 있어요',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '포인트 비용', example: 10 })
  points: number;

  @ApiProperty({ description: '활성화 여부', example: true })
  isActive: boolean;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class ChildcareRuleDto {
  @ApiProperty({ description: '규칙 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계정 ID', example: 'uuid-1234' })
  accountId: string;

  @ApiProperty({ description: '규칙 이름', example: '방 정리 안함' })
  name: string;

  @ApiProperty({
    description: '규칙 설명',
    example: '방을 정리하지 않으면 포인트가 차감됩니다',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '차감 포인트', example: 10 })
  penalty: number;

  @ApiProperty({ description: '활성화 여부', example: true })
  isActive: boolean;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
