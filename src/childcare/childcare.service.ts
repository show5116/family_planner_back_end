import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChildcareTransactionType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateChildcareAccountDto } from './dto/create-account.dto';
import { UpdateChildcareAccountDto } from './dto/update-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { SavingsDepositDto, SavingsWithdrawDto } from './dto/savings.dto';

@Injectable()
export class ChildcareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  // ─── 계정 ─────────────────────────────────────────────────

  /**
   * 육아 계정 생성 (부모만 가능)
   */
  async createAccount(userId: string, dto: CreateChildcareAccountDto) {
    await this.validateGroupMember(userId, dto.groupId);
    await this.validateGroupMember(dto.childUserId, dto.groupId);

    return await this.prisma.childcareAccount.create({
      data: {
        groupId: dto.groupId,
        childUserId: dto.childUserId,
        parentUserId: userId,
        monthlyAllowance: dto.monthlyAllowance,
        savingsInterestRate: dto.savingsInterestRate,
      },
    });
  }

  /**
   * 그룹 내 육아 계정 목록 조회
   */
  async findAccounts(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    return await this.prisma.childcareAccount.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 육아 계정 상세 조회
   */
  async findOneAccount(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return account;
  }

  /**
   * 육아 계정 설정 수정 (부모만 가능)
   */
  async updateAccount(
    userId: string,
    accountId: string,
    dto: UpdateChildcareAccountDto,
  ) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    return await this.prisma.childcareAccount.update({
      where: { id: accountId },
      data: {
        ...(dto.monthlyAllowance !== undefined && {
          monthlyAllowance: dto.monthlyAllowance,
        }),
        ...(dto.savingsInterestRate !== undefined && {
          savingsInterestRate: dto.savingsInterestRate,
        }),
      },
    });
  }

  // ─── 거래 ─────────────────────────────────────────────────

  /**
   * 거래 추가 (포인트 적립/사용/차감)
   */
  async createTransaction(
    userId: string,
    accountId: string,
    dto: CreateTransactionDto,
  ) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    // 포인트 증감 계산
    const delta = this.calculateBalanceDelta(dto.type, dto.amount);

    if (account.balance + delta < 0) {
      throw new BadRequestException('포인트 잔액이 부족합니다');
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.childcareTransaction.create({
        data: {
          accountId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          createdBy: userId,
        },
      }),
      this.prisma.childcareAccount.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      }),
    ]);

    // 자녀에게 알림 발송 (비동기)
    this.notifyChild(account.childUserId, dto.type, dto.amount).catch(
      () => null,
    );

    return transaction;
  }

  /**
   * 거래 내역 조회
   */
  async findTransactions(
    userId: string,
    accountId: string,
    query: TransactionQueryDto,
  ) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    const where: Record<string, unknown> = { accountId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      where.createdAt = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    return await this.prisma.childcareTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── 보상 항목 ────────────────────────────────────────────

  /**
   * 보상 항목 추가 (부모만 가능)
   */
  async createReward(userId: string, accountId: string, dto: CreateRewardDto) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    return await this.prisma.childcareReward.create({
      data: {
        accountId,
        name: dto.name,
        description: dto.description,
        points: dto.points,
      },
    });
  }

  /**
   * 보상 항목 수정 (부모만 가능)
   */
  async updateReward(
    userId: string,
    accountId: string,
    rewardId: string,
    dto: UpdateRewardDto,
  ) {
    const reward = await this.prisma.childcareReward.findUnique({
      where: { id: rewardId },
      include: { account: true },
    });

    if (!reward || reward.accountId !== accountId) {
      throw new NotFoundException('보상 항목을 찾을 수 없습니다');
    }

    this.validateParent(userId, reward.account);

    return await this.prisma.childcareReward.update({
      where: { id: rewardId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * 보상 항목 삭제 (부모만 가능)
   */
  async removeReward(userId: string, accountId: string, rewardId: string) {
    const reward = await this.prisma.childcareReward.findUnique({
      where: { id: rewardId },
      include: { account: true },
    });

    if (!reward || reward.accountId !== accountId) {
      throw new NotFoundException('보상 항목을 찾을 수 없습니다');
    }

    this.validateParent(userId, reward.account);

    await this.prisma.childcareReward.delete({ where: { id: rewardId } });

    return { message: '보상 항목이 삭제되었습니다' };
  }

  /**
   * 보상 항목 목록 조회
   */
  async findRewards(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return await this.prisma.childcareReward.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── 규칙 ─────────────────────────────────────────────────

  /**
   * 규칙 추가 (부모만 가능)
   */
  async createRule(userId: string, accountId: string, dto: CreateRuleDto) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    return await this.prisma.childcareRule.create({
      data: {
        accountId,
        name: dto.name,
        description: dto.description,
        penalty: dto.penalty,
      },
    });
  }

  /**
   * 규칙 수정 (부모만 가능)
   */
  async updateRule(
    userId: string,
    accountId: string,
    ruleId: string,
    dto: UpdateRuleDto,
  ) {
    const rule = await this.prisma.childcareRule.findUnique({
      where: { id: ruleId },
      include: { account: true },
    });

    if (!rule || rule.accountId !== accountId) {
      throw new NotFoundException('규칙을 찾을 수 없습니다');
    }

    this.validateParent(userId, rule.account);

    return await this.prisma.childcareRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.penalty !== undefined && { penalty: dto.penalty }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * 규칙 삭제 (부모만 가능)
   */
  async removeRule(userId: string, accountId: string, ruleId: string) {
    const rule = await this.prisma.childcareRule.findUnique({
      where: { id: ruleId },
      include: { account: true },
    });

    if (!rule || rule.accountId !== accountId) {
      throw new NotFoundException('규칙을 찾을 수 없습니다');
    }

    this.validateParent(userId, rule.account);

    await this.prisma.childcareRule.delete({ where: { id: ruleId } });

    return { message: '규칙이 삭제되었습니다' };
  }

  /**
   * 규칙 목록 조회
   */
  async findRules(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return await this.prisma.childcareRule.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── 적금 ─────────────────────────────────────────────────

  /**
   * 적금 입금 (자녀 또는 부모)
   */
  async savingsDeposit(
    userId: string,
    accountId: string,
    dto: SavingsDepositDto,
  ) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    if (account.balance < dto.amount) {
      throw new BadRequestException('포인트 잔액이 부족합니다');
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.childcareTransaction.create({
        data: {
          accountId,
          type: ChildcareTransactionType.SAVINGS_DEPOSIT,
          amount: dto.amount,
          description: '적금 입금',
          createdBy: userId,
        },
      }),
      this.prisma.childcareAccount.update({
        where: { id: accountId },
        data: {
          balance: { decrement: dto.amount },
          savingsBalance: { increment: dto.amount },
        },
      }),
    ]);

    return transaction;
  }

  /**
   * 적금 출금 (부모만 가능)
   */
  async savingsWithdraw(
    userId: string,
    accountId: string,
    dto: SavingsWithdrawDto,
  ) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('육아 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    if (account.savingsBalance < dto.amount) {
      throw new BadRequestException('적금 잔액이 부족합니다');
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.childcareTransaction.create({
        data: {
          accountId,
          type: ChildcareTransactionType.SAVINGS_WITHDRAW,
          amount: dto.amount,
          description: '적금 출금',
          createdBy: userId,
        },
      }),
      this.prisma.childcareAccount.update({
        where: { id: accountId },
        data: {
          balance: { increment: dto.amount },
          savingsBalance: { decrement: dto.amount },
        },
      }),
    ]);

    return transaction;
  }

  // ─── Private Helpers ──────────────────────────────────────

  /**
   * 포인트 거래 유형에 따른 잔액 증감 계산
   */
  private calculateBalanceDelta(
    type: ChildcareTransactionType,
    amount: number,
  ): number {
    switch (type) {
      case ChildcareTransactionType.ALLOWANCE:
      case ChildcareTransactionType.REWARD:
      case ChildcareTransactionType.INTEREST:
        return amount;
      case ChildcareTransactionType.PENALTY:
      case ChildcareTransactionType.PURCHASE:
        return -amount;
      default:
        return 0;
    }
  }

  /**
   * 자녀에게 포인트 변동 알림 발송
   */
  private async notifyChild(
    childUserId: string,
    type: ChildcareTransactionType,
    amount: number,
  ) {
    const typeLabel: Record<ChildcareTransactionType, string> = {
      ALLOWANCE: '용돈 지급',
      REWARD: '보상 포인트 지급',
      PENALTY: '규칙 위반 차감',
      PURCHASE: '보상 사용',
      SAVINGS_DEPOSIT: '적금 입금',
      SAVINGS_WITHDRAW: '적금 출금',
      INTEREST: '이자 지급',
    };

    const earningTypes: ChildcareTransactionType[] = [
      ChildcareTransactionType.ALLOWANCE,
      ChildcareTransactionType.REWARD,
      ChildcareTransactionType.INTEREST,
    ];
    const isEarning = earningTypes.includes(type);

    await this.notificationQueue.enqueueImmediate({
      userId: childUserId,
      category: NotificationCategory.CHILDCARE,
      title: typeLabel[type],
      body: isEarning
        ? `${amount} 포인트가 적립되었습니다`
        : `${amount} 포인트가 차감되었습니다`,
      data: { type, amount },
    });
  }

  /**
   * 그룹 멤버 여부 확인
   */
  private async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('해당 그룹의 멤버가 아닙니다');
    }
  }

  /**
   * 부모 권한 확인
   */
  private validateParent(
    userId: string,
    account: { parentUserId: string },
  ): void {
    if (account.parentUserId !== userId) {
      throw new ForbiddenException('부모만 수행할 수 있는 작업입니다');
    }
  }

  /**
   * 부모 또는 자녀 여부 확인
   */
  private validateParentOrChild(
    userId: string,
    account: { parentUserId: string; childUserId: string },
  ): void {
    if (account.parentUserId !== userId && account.childUserId !== userId) {
      throw new ForbiddenException('해당 계정에 접근할 권한이 없습니다');
    }
  }
}
