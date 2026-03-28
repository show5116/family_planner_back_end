import { ApiProperty } from '@nestjs/swagger';
import { ChildcareRuleType, ChildcareTransactionType } from '@prisma/client';

export class ChildDto {
  @ApiProperty({ description: '자녀 프로필 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({ description: '부모 사용자 ID', example: 'uuid-1234' })
  parentUserId: string;

  @ApiProperty({ description: '자녀 이름', example: '김민준' })
  name: string;

  @ApiProperty({ description: '생년월일', example: '2024-01-15T00:00:00.000Z' })
  birthDate: Date;

  @ApiProperty({
    description: '연결된 앱 계정 ID (앱 가입 시 연결)',
    example: null,
    nullable: true,
  })
  userId: string | null;

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

export class ChildcareAccountDto {
  @ApiProperty({ description: '계정 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({ description: '자녀 프로필 ID', example: 'uuid-1234' })
  childId: string;

  @ApiProperty({ description: '부모 사용자 ID', example: 'uuid-1234' })
  parentUserId: string;

  @ApiProperty({ description: '현재 포인트 잔액', example: 500 })
  balance: number;

  @ApiProperty({ description: '적금 잔액', example: 200 })
  savingsBalance: number;

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

export class AllowancePlanDto {
  @ApiProperty({ description: '할당 플랜 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '자녀 프로필 ID', example: 'uuid-1234' })
  childId: string;

  @ApiProperty({ description: '월 지급 포인트', example: 100 })
  monthlyPoints: number;

  @ApiProperty({ description: '월 지급일 (1~31)', example: 1 })
  payDay: number;

  @ApiProperty({ description: '포인트 : 원 비율 (1포인트 = N원)', example: 10 })
  pointToMoneyRatio: number;

  @ApiProperty({
    description: '다음 연봉 협상일',
    example: '2027-01-01T00:00:00.000Z',
    nullable: true,
  })
  nextNegotiationDate: Date | null;

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

export class AllowancePlanHistoryDto {
  @ApiProperty({ description: '히스토리 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '플랜 ID', example: 'uuid-1234' })
  planId: string;

  @ApiProperty({ description: '월 지급 포인트', example: 100 })
  monthlyPoints: number;

  @ApiProperty({ description: '월 지급일 (1~31)', example: 1 })
  payDay: number;

  @ApiProperty({ description: '포인트 : 원 비율', example: 10 })
  pointToMoneyRatio: number;

  @ApiProperty({
    description: '다음 연봉 협상일',
    example: '2027-01-01T00:00:00.000Z',
    nullable: true,
  })
  nextNegotiationDate: Date | null;

  @ApiProperty({
    description: '변경 일시',
    example: '2026-03-01T00:00:00.000Z',
  })
  changedAt: Date;
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

export class ChildcareShopItemDto {
  @ApiProperty({ description: '상점 아이템 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계정 ID', example: 'uuid-1234' })
  accountId: string;

  @ApiProperty({ description: '아이템 이름', example: 'TV 30분 더보기' })
  name: string;

  @ApiProperty({
    description: '아이템 설명',
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

  @ApiProperty({ description: '규칙 이름', example: '방 정리하기' })
  name: string;

  @ApiProperty({
    description: '규칙 설명',
    example: '방을 깨끗하게 정리하면 포인트가 지급됩니다',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description:
      '규칙 유형 (PLUS: 포인트 지급, MINUS: 포인트 차감, INFO: 메모성 규칙)',
    enum: ChildcareRuleType,
    example: ChildcareRuleType.PLUS,
  })
  type: ChildcareRuleType;

  @ApiProperty({
    description: '포인트 (없을 경우 null)',
    example: 10,
    nullable: true,
  })
  points: number | null;

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
