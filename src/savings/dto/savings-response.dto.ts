import { ApiProperty } from '@nestjs/swagger';
import { SavingsGoalStatus, SavingsType } from '@prisma/client';

export class SavingsTransactionDto {
  @ApiProperty({ description: '트랜잭션 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '적립 목표 ID', example: 'uuid-5678' })
  goalId: string;

  @ApiProperty({
    description: '타입',
    enum: SavingsType,
    example: SavingsType.DEPOSIT,
  })
  type: SavingsType;

  @ApiProperty({ description: '금액', example: 50000 })
  amount: number;

  @ApiProperty({ description: '메모', example: '항공권 구매', nullable: true })
  description: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;
}

export class SavingsGoalDto {
  @ApiProperty({ description: '적립 목표 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-5678' })
  groupId: string;

  @ApiProperty({ description: '이름', example: '여름 휴가 비용' })
  name: string;

  @ApiProperty({ description: '설명', example: '제주도 여행', nullable: true })
  description: string | null;

  @ApiProperty({ description: '목표 금액', example: 1000000, nullable: true })
  targetAmount: number | null;

  @ApiProperty({ description: '현재 적립 금액', example: 350000 })
  currentAmount: number;

  @ApiProperty({ description: '자동 적립 여부', example: false })
  autoDeposit: boolean;

  @ApiProperty({
    description: '매달 자동 적립 실행일 (1~31)',
    example: 1,
  })
  depositDay: number;

  @ApiProperty({
    description: '매달 자동 적립 금액',
    example: 100000,
    nullable: true,
  })
  monthlyAmount: number | null;

  @ApiProperty({
    description: '자산 통계 연동 여부',
    example: false,
  })
  includeInAssets: boolean;

  @ApiProperty({
    description: '상태',
    enum: SavingsGoalStatus,
    example: SavingsGoalStatus.ACTIVE,
  })
  status: SavingsGoalStatus;

  @ApiProperty({
    description: '달성률 (targetAmount 없으면 null)',
    example: 35,
    nullable: true,
  })
  achievementRate: number | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;
}

export class SavingsGoalDetailDto extends SavingsGoalDto {
  @ApiProperty({ description: '최근 내역 목록', type: [SavingsTransactionDto] })
  transactions: SavingsTransactionDto[];
}

export class TransactionPageDto {
  @ApiProperty({ description: '내역 목록', type: [SavingsTransactionDto] })
  items: SavingsTransactionDto[];

  @ApiProperty({ description: '전체 건수', example: 42 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지 크기', example: 20 })
  limit: number;
}
