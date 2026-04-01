import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class AccountRecordDto {
  @ApiProperty({ description: '기록 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계좌 ID', example: 'uuid-5678' })
  accountId: string;

  @ApiProperty({ description: '기록 날짜', example: '2026-03-01' })
  recordDate: Date;

  @ApiProperty({ description: '잔액', example: '5000000.00' })
  balance: string;

  @ApiProperty({ description: '원금', example: '4800000.00' })
  principal: string;

  @ApiProperty({ description: '수익금', example: '200000.00' })
  profit: string;

  @ApiProperty({ description: '메모', example: '이자 입금', nullable: true })
  note: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;
}

export class AccountDto {
  @ApiProperty({ description: '계좌 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-5678' })
  groupId: string;

  @ApiProperty({ description: '소유자 ID', example: 'uuid-9012' })
  userId: string;

  @ApiProperty({ description: '계좌명', example: '주택청약' })
  name: string;

  @ApiProperty({
    description: '계좌번호',
    example: '123-456-789',
    nullable: true,
  })
  accountNumber: string | null;

  @ApiProperty({ description: '금융기관명', example: '국민은행' })
  institution: string;

  @ApiProperty({
    description: '계좌 유형',
    enum: AccountType,
    example: AccountType.SAVINGS,
  })
  type: AccountType;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  @ApiProperty({
    description: '최신 잔액',
    example: '5000000.00',
    nullable: true,
  })
  latestBalance: string | null;

  @ApiProperty({ description: '수익률 (%)', example: '4.17', nullable: true })
  profitRate: string | null;
}

export class AccountTypeStatDto {
  @ApiProperty({ description: '계좌 유형', enum: AccountType })
  type: AccountType;

  @ApiProperty({ description: '총 잔액', example: '10000000.00' })
  balance: string;

  @ApiProperty({ description: '계좌 수', example: 2 })
  count: number;
}

export class SavingsGoalSummaryDto {
  @ApiProperty({ description: '적립 목표 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '적립 목표 이름', example: '비상금' })
  name: string;

  @ApiProperty({ description: '현재 잔액', example: '2000000.00' })
  currentAmount: string;
}

export class AccountStatisticsDto {
  @ApiProperty({ description: '총 잔액 (계좌)', example: '50000000.00' })
  totalBalance: string;

  @ApiProperty({ description: '총 원금', example: '48000000.00' })
  totalPrincipal: string;

  @ApiProperty({ description: '총 수익금', example: '2000000.00' })
  totalProfit: string;

  @ApiProperty({ description: '전체 수익률 (%)', example: '4.17' })
  profitRate: string;

  @ApiProperty({ description: '총 계좌 수', example: 5 })
  accountCount: number;

  @ApiProperty({ description: '유형별 통계', type: [AccountTypeStatDto] })
  byType: AccountTypeStatDto[];

  @ApiProperty({
    description: '자산 연동 적립금 합계 (includeInAssets=true인 목표)',
    example: '3500000.00',
  })
  savingsTotal: string;

  @ApiProperty({
    description: '자산 연동 적립금 목록',
    type: [SavingsGoalSummaryDto],
  })
  savingsGoals: SavingsGoalSummaryDto[];
}
