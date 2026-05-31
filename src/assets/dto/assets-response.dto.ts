import { ApiProperty } from '@nestjs/swagger';
import { AccountType, WithdrawalType } from '@prisma/client';

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

  @ApiProperty({ description: '수익률 (%)', example: '4.17' })
  profitRate: string;

  @ApiProperty({
    description: '보유 금 무게 (g) — GOLD 타입 기록 전용',
    example: '37.5000',
    nullable: true,
  })
  gramWeight: string | null;

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

  @ApiProperty({
    description: '금융기관명',
    example: '국민은행',
    nullable: true,
  })
  institution: string | null;

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

  @ApiProperty({
    description: '자산 기록 입력 알림 일자 (1~31, null이면 알림 없음)',
    example: 1,
    nullable: true,
  })
  recordReminderDay: number | null;
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

export class TrendItemDto {
  @ApiProperty({
    description: '기간 (monthly: YYYY-MM, yearly: YYYY)',
    example: '2026-03',
  })
  period: string;

  @ApiProperty({ description: '잔액', example: '5000000.00' })
  balance: string;

  @ApiProperty({ description: '원금', example: '4800000.00' })
  principal: string;

  @ApiProperty({ description: '수익금', example: '200000.00' })
  profit: string;

  @ApiProperty({ description: '수익률 (%)', example: '4.17' })
  profitRate: string;
}

export class AccountWithdrawalDto {
  @ApiProperty({ description: '출금 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계좌 ID', example: 'uuid-5678' })
  accountId: string;

  @ApiProperty({ description: '출금 날짜', example: '2026-04-27' })
  withdrawalDate: Date;

  @ApiProperty({ description: '출금 금액', example: '500000.00' })
  amount: string;

  @ApiProperty({
    description: '출금 유형 (PRINCIPAL: 원금 인출, PROFIT: 수익 인출)',
    enum: WithdrawalType,
    example: WithdrawalType.PRINCIPAL,
  })
  type: WithdrawalType;

  @ApiProperty({ description: '메모', example: '생활비 출금', nullable: true })
  note: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;
}

export class AccountHoldingRecordDto {
  @ApiProperty({ description: '기록 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계좌 ID', example: 'uuid-5678' })
  accountId: string;

  @ApiProperty({ description: '기록 날짜', example: '2026-05-01' })
  recordDate: Date;

  @ApiProperty({ description: '종목/자산명', example: '나스닥 ETF' })
  name: string;

  @ApiProperty({ description: '티커 심볼', example: 'QQQ', nullable: true })
  ticker: string | null;

  @ApiProperty({ description: '금액', example: '2000000.00' })
  amount: string;

  @ApiProperty({
    description: '비율 (%, 해당 날짜 계좌 잔액 기준)',
    example: '40.00',
  })
  ratio: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;
}

export class HoldingStatDto {
  @ApiProperty({ description: '종목/자산명', example: '나스닥 ETF' })
  name: string;

  @ApiProperty({ description: '티커 심볼', example: 'QQQ', nullable: true })
  ticker: string | null;

  @ApiProperty({
    description: '종목 금액 합계 (최신 기록 기준)',
    example: '2000000.00',
  })
  estimatedAmount: string;

  @ApiProperty({ description: '전체 자산 대비 비율 (%)', example: '4.00' })
  globalRatio: string;
}

export class AccountRecordSnapshotDto {
  @ApiProperty({
    description: '항목 유형',
    enum: ['SNAPSHOT'],
    example: 'SNAPSHOT',
  })
  entryType: 'SNAPSHOT';

  @ApiProperty({ description: '날짜', example: '2026-05-01' })
  date: Date;

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

  @ApiProperty({ description: '수익률 (%)', example: '4.17' })
  profitRate: string;

  @ApiProperty({
    description: '보유 금 무게 (g) — GOLD 타입 기록 전용',
    example: '37.5000',
    nullable: true,
  })
  gramWeight: string | null;

  @ApiProperty({ description: '메모', example: '이자 입금', nullable: true })
  note: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;
}

export class AccountRecordWithdrawalDto {
  @ApiProperty({
    description: '항목 유형',
    enum: ['WITHDRAWAL'],
    example: 'WITHDRAWAL',
  })
  entryType: 'WITHDRAWAL';

  @ApiProperty({ description: '날짜', example: '2026-04-27' })
  date: Date;

  @ApiProperty({ description: '출금 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '계좌 ID', example: 'uuid-5678' })
  accountId: string;

  @ApiProperty({ description: '출금 날짜', example: '2026-04-27' })
  withdrawalDate: Date;

  @ApiProperty({ description: '출금 금액', example: '500000.00' })
  amount: string;

  @ApiProperty({
    description: '출금 유형 (PRINCIPAL: 원금 인출, PROFIT: 수익 인출)',
    enum: WithdrawalType,
    example: WithdrawalType.PRINCIPAL,
  })
  type: WithdrawalType;

  @ApiProperty({ description: '메모', example: '생활비 출금', nullable: true })
  note: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({
    description: '출금 후 잔액 (직전 스냅샷 기준, 스냅샷 없으면 null)',
    example: '4500000.00',
    nullable: true,
  })
  balanceAfter: string | null;

  @ApiProperty({
    description: '출금 후 원금 (직전 스냅샷 기준, 스냅샷 없으면 null)',
    example: '4300000.00',
    nullable: true,
  })
  principalAfter: string | null;

  @ApiProperty({
    description: '출금 후 수익금 (직전 스냅샷 기준, 스냅샷 없으면 null)',
    example: '200000.00',
    nullable: true,
  })
  profitAfter: string | null;

  @ApiProperty({
    description: '출금 후 수익률 (%, 직전 스냅샷 기준, 스냅샷 없으면 null)',
    example: '4.17',
    nullable: true,
  })
  profitRate: string | null;
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

  @ApiProperty({
    description: '전체 자산 기준 종목별 통계',
    type: [HoldingStatDto],
  })
  byHolding: HoldingStatDto[];
}
