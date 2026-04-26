import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ChildcareRuleType,
  ChildcareTransactionType,
  SavingsPlanStatus,
} from '@prisma/client';
import {
  ChildcareEarningTypes,
  ChildcareTransactionTypeLabel,
} from './constants/transaction-type.constant';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateChildDto } from './dto/create-child.dto';
import { CreateAllowancePlanDto } from './dto/create-allowance-plan.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { SavingsDepositDto, SavingsWithdrawDto } from './dto/savings.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateSavingsPlanDto } from './dto/create-savings-plan.dto';

@Injectable()
export class ChildcareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  // ─── 자녀 프로필 ──────────────────────────────────────────

  /**
   * 자녀 프로필 등록 — 포인트 계정 자동 생성 (앱 계정 불필요)
   */
  async createChild(userId: string, dto: CreateChildDto) {
    await this.validateGroupMember(userId, dto.groupId);

    return await this.prisma.$transaction(async (tx) => {
      const child = await tx.child.create({
        data: {
          groupId: dto.groupId,
          parentUserId: userId,
          name: dto.name,
          birthDate: new Date(dto.birthDate),
        },
      });

      await tx.childcareAccount.create({
        data: {
          groupId: dto.groupId,
          childId: child.id,
          parentUserId: userId,
        },
      });

      return child;
    });
  }

  /**
   * 그룹 내 자녀 프로필 목록 조회
   */
  async findChildren(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    return await this.prisma.child.findMany({
      where: { groupId },
      orderBy: { birthDate: 'asc' },
    });
  }

  /**
   * 자녀 프로필과 앱 계정 연동
   */
  async linkUser(userId: string, childId: string, targetUserId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new NotFoundException('자녀 프로필을 찾을 수 없습니다');
    }

    if (child.parentUserId !== userId) {
      throw new ForbiddenException('부모만 수행할 수 있는 작업입니다');
    }

    if (child.userId) {
      throw new ConflictException('이미 연동된 앱 계정이 있습니다');
    }

    await this.validateGroupMember(targetUserId, child.groupId);

    return await this.prisma.child.update({
      where: { id: childId },
      data: { userId: targetUserId },
    });
  }

  // ─── 포인트 계정 ──────────────────────────────────────────

  /**
   * 그룹 내 포인트 계정 목록 조회
   */
  async findAccounts(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    return await this.prisma.childcareAccount.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 포인트 계정 상세 조회
   */
  async findOneAccount(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
      include: { child: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return account;
  }

  // ─── 월 포인트 할당 ────────────────────────────────────────

  /**
   * 월 포인트 할당 설정 (생성 또는 수정)
   * 기존 설정이 있으면 히스토리에 저장 후 덮어씀
   */
  async upsertAllowancePlan(
    userId: string,
    childId: string,
    dto: CreateAllowancePlanDto,
  ) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new NotFoundException('자녀 프로필을 찾을 수 없습니다');
    }

    if (child.parentUserId !== userId) {
      throw new ForbiddenException('부모만 수행할 수 있는 작업입니다');
    }

    const planData = {
      monthlyPoints: dto.monthlyPoints,
      payDay: dto.payDay,
      pointToMoneyRatio: dto.pointToMoneyRatio,
      nextNegotiationDate: dto.nextNegotiationDate
        ? new Date(dto.nextNegotiationDate)
        : null,
    };

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.childAllowancePlan.findUnique({
        where: { childId },
      });

      if (existing) {
        // 기존 설정을 히스토리에 저장
        await tx.childAllowancePlanHistory.create({
          data: {
            planId: existing.id,
            monthlyPoints: existing.monthlyPoints,
            payDay: existing.payDay,
            pointToMoneyRatio: existing.pointToMoneyRatio,
            nextNegotiationDate: existing.nextNegotiationDate,
          },
        });

        return await tx.childAllowancePlan.update({
          where: { childId },
          data: planData,
        });
      }

      return await tx.childAllowancePlan.create({
        data: { childId, ...planData },
      });
    });
  }

  /**
   * 월 포인트 할당 설정 조회
   */
  async findAllowancePlan(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      throw new NotFoundException('자녀 프로필을 찾을 수 없습니다');
    }

    this.validateParentOrLinkedChild(userId, child);

    return await this.prisma.childAllowancePlan.findUnique({
      where: { childId },
    });
  }

  /**
   * 월 포인트 할당 변경 히스토리 조회
   */
  async findAllowancePlanHistory(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { allowancePlan: true },
    });

    if (!child) {
      throw new NotFoundException('자녀 프로필을 찾을 수 없습니다');
    }

    this.validateParentOrLinkedChild(userId, child);

    if (!child.allowancePlan) {
      return [];
    }

    return await this.prisma.childAllowancePlanHistory.findMany({
      where: { planId: child.allowancePlan.id },
      orderBy: { changedAt: 'desc' },
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
      include: { child: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    // shopItemId 또는 ruleId로 type/amount/description 자동 설정
    let type = dto.type;
    let amount = dto.amount;
    let description = dto.description;

    if (dto.shopItemId) {
      const item = await this.prisma.childcareShopItem.findUnique({
        where: { id: dto.shopItemId },
      });
      if (!item || item.accountId !== accountId) {
        throw new NotFoundException('상점 아이템을 찾을 수 없습니다');
      }
      type = ChildcareTransactionType.PURCHASE;
      amount = item.points;
      description = item.name;
    } else if (dto.ruleId) {
      const rule = await this.prisma.childcareRule.findUnique({
        where: { id: dto.ruleId },
      });
      if (!rule || rule.accountId !== accountId) {
        throw new NotFoundException('규칙을 찾을 수 없습니다');
      }
      if (rule.type === ChildcareRuleType.INFO || !rule.points) {
        throw new BadRequestException(
          '포인트가 없는 규칙은 적용할 수 없습니다',
        );
      }
      type =
        rule.type === ChildcareRuleType.PLUS
          ? ChildcareTransactionType.REWARD
          : ChildcareTransactionType.PENALTY;
      amount = rule.points;
      description = rule.name;
    }

    if (!type || !amount || !description) {
      throw new BadRequestException(
        'type, amount, description을 입력하거나 shopItemId/ruleId를 지정해주세요',
      );
    }

    const delta = this.calculateBalanceDelta(type, amount);

    if (account.balance + delta < 0) {
      throw new BadRequestException('포인트 잔액이 부족합니다');
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.childcareTransaction.create({
        data: {
          accountId,
          type,
          amount,
          description,
          createdBy: userId,
        },
      }),
      this.prisma.childcareAccount.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      }),
    ]);

    if (account.child.userId) {
      this.notifyChild(
        account.child.userId,
        type,
        amount,
        account.child.id,
      ).catch(() => null);
    }

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
      include: { child: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    const where: Record<string, unknown> = { accountId };

    if (query.type) {
      where.type = query.type;
    }

    let periodEnd: Date | null = null;

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      periodEnd = new Date(year, month, 1);
      where.createdAt = {
        gte: new Date(year, month - 1, 1),
        lt: periodEnd,
      };
    } else if (query.year) {
      const year = Number(query.year);
      periodEnd = new Date(year + 1, 0, 1);
      where.createdAt = {
        gte: new Date(year, 0, 1),
        lt: periodEnd,
      };
    }

    const transactions = await this.prisma.childcareTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // closingBalance: 해당 기간 이후 거래들의 delta를 현재 잔액에서 역산
    let closingBalance = account.balance;
    if (periodEnd) {
      const laterTransactions = await this.prisma.childcareTransaction.findMany(
        { where: { accountId, createdAt: { gte: periodEnd } } },
      );
      for (const tx of laterTransactions) {
        closingBalance -= this.calculateBalanceDelta(tx.type, tx.amount);
      }
    }

    return { transactions, closingBalance };
  }

  // ─── 포인트 상점 ──────────────────────────────────────────

  /**
   * 상점 아이템 추가 (부모만 가능)
   */
  async createShopItem(
    userId: string,
    accountId: string,
    dto: CreateShopItemDto,
  ) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    return await this.prisma.childcareShopItem.create({
      data: {
        accountId,
        name: dto.name,
        description: dto.description,
        points: dto.points,
      },
    });
  }

  /**
   * 상점 아이템 수정 (부모만 가능)
   */
  async updateShopItem(
    userId: string,
    accountId: string,
    itemId: string,
    dto: UpdateShopItemDto,
  ) {
    const item = await this.prisma.childcareShopItem.findUnique({
      where: { id: itemId },
      include: { account: true },
    });

    if (!item || item.accountId !== accountId) {
      throw new NotFoundException('상점 아이템을 찾을 수 없습니다');
    }

    this.validateParent(userId, item.account);

    return await this.prisma.childcareShopItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * 상점 아이템 삭제 (부모만 가능)
   */
  async removeShopItem(userId: string, accountId: string, itemId: string) {
    const item = await this.prisma.childcareShopItem.findUnique({
      where: { id: itemId },
      include: { account: true },
    });

    if (!item || item.accountId !== accountId) {
      throw new NotFoundException('상점 아이템을 찾을 수 없습니다');
    }

    this.validateParent(userId, item.account);

    await this.prisma.childcareShopItem.delete({ where: { id: itemId } });

    return { message: '상점 아이템이 삭제되었습니다' };
  }

  /**
   * 상점 아이템 목록 조회
   */
  async findShopItems(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
      include: { child: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return await this.prisma.childcareShopItem.findMany({
      where: { accountId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * 상점 아이템 순서 변경 (부모만 가능)
   */
  async reorderShopItems(userId: string, accountId: string, dto: ReorderDto) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.childcareShopItem.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return { message: '순서가 변경되었습니다' };
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
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    return await this.prisma.childcareRule.create({
      data: {
        accountId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        points:
          dto.type === ChildcareRuleType.INFO ? null : (dto.points ?? null),
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
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.points !== undefined && { points: dto.points }),
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
      include: { child: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return await this.prisma.childcareRule.findMany({
      where: { accountId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * 규칙 순서 변경 (부모만 가능)
   */
  async reorderRules(userId: string, accountId: string, dto: ReorderDto) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.childcareRule.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return { message: '순서가 변경되었습니다' };
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
      include: { child: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
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
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
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

  // ─── 적금 플랜 ────────────────────────────────────────────

  /**
   * 적금 플랜 생성 예상 미리보기 (부모만 가능)
   */
  async previewSavingsPlan() {
    const kr3yRate = await this.getKr3yRate();
    return { kr3yRate };
  }

  /**
   * 적금 플랜 생성 (부모만 가능)
   */
  async createSavingsPlan(
    userId: string,
    accountId: string,
    dto: CreateSavingsPlanDto,
  ) {
    if (
      !dto.monthlyAmount ||
      dto.interestRate === undefined ||
      !dto.interestType ||
      !dto.startDate ||
      !dto.endDate
    ) {
      throw new BadRequestException(
        'monthlyAmount, interestRate, interestType, startDate, endDate는 필수입니다',
      );
    }

    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
      include: { savingsPlan: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    if (account.savingsPlan) {
      throw new ConflictException('이미 진행 중인 적금 플랜이 있습니다');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('만기일은 시작일보다 이후여야 합니다');
    }

    return await this.prisma.childcareSavingsPlan.create({
      data: {
        accountId,
        monthlyAmount: dto.monthlyAmount,
        interestRate: dto.interestRate,
        interestType: dto.interestType,
        startDate,
        endDate,
      },
    });
  }

  /**
   * 적금 플랜 조회 (부모 또는 자녀)
   */
  async findSavingsPlan(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
      include: { child: true, savingsPlan: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParentOrChild(userId, account);

    return account.savingsPlan;
  }

  /**
   * 적금 중도 해지 (부모만 가능) — 원금만 잔액으로 반환
   */
  async cancelSavingsPlan(userId: string, accountId: string) {
    const account = await this.prisma.childcareAccount.findUnique({
      where: { id: accountId },
      include: { savingsPlan: true },
    });

    if (!account) {
      throw new NotFoundException('포인트 계정을 찾을 수 없습니다');
    }

    this.validateParent(userId, account);

    const plan = account.savingsPlan;

    if (!plan || plan.status !== SavingsPlanStatus.ACTIVE) {
      throw new BadRequestException('진행 중인 적금 플랜이 없습니다');
    }

    const principal = account.savingsBalance;

    await this.prisma.$transaction([
      this.prisma.childcareTransaction.create({
        data: {
          accountId,
          type: ChildcareTransactionType.SAVINGS_WITHDRAW,
          amount: principal,
          description: '적금 중도 해지 (원금 반환)',
          createdBy: userId,
        },
      }),
      this.prisma.childcareAccount.update({
        where: { id: accountId },
        data: {
          balance: { increment: principal },
          savingsBalance: 0,
        },
      }),
      this.prisma.childcareSavingsPlan.update({
        where: { id: plan.id },
        data: {
          status: SavingsPlanStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      }),
    ]);

    return {
      message: '적금이 중도 해지되었습니다. 원금이 잔액으로 반환되었습니다.',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────

  private async getKr3yRate(): Promise<number | null> {
    const indicator = await this.prisma.indicator.findUnique({
      where: { symbol: 'KR3Y' },
    });
    if (!indicator) return null;

    const latest = await this.prisma.indicatorPrice.findFirst({
      where: { indicatorId: indicator.id },
      orderBy: { recordedAt: 'desc' },
    });

    return latest ? Number(latest.price) : null;
  }

  private calculateBalanceDelta(
    type: ChildcareTransactionType,
    amount: number,
  ): number {
    return ChildcareEarningTypes.includes(type) ? amount : -amount;
  }

  private async notifyChild(
    userId: string,
    type: ChildcareTransactionType,
    amount: number,
    childId: string,
  ) {
    const isEarning = ChildcareEarningTypes.includes(type);

    await this.notificationQueue.enqueueImmediate({
      userId,
      category: NotificationCategory.CHILDCARE,
      title: ChildcareTransactionTypeLabel[type],
      body: isEarning
        ? `${amount} 포인트가 적립되었습니다`
        : `${amount} 포인트가 차감되었습니다`,
      data: { childId },
    });
  }

  private async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('해당 그룹의 멤버가 아닙니다');
    }
  }

  private validateParent(
    userId: string,
    account: { parentUserId: string },
  ): void {
    if (account.parentUserId !== userId) {
      throw new ForbiddenException('부모만 수행할 수 있는 작업입니다');
    }
  }

  private validateParentOrChild(
    userId: string,
    account: { parentUserId: string; child: { userId: string | null } },
  ): void {
    const isParent = account.parentUserId === userId;
    const isChild =
      account.child.userId !== null && account.child.userId === userId;

    if (!isParent && !isChild) {
      throw new ForbiddenException('해당 계정에 접근할 권한이 없습니다');
    }
  }

  private validateParentOrLinkedChild(
    userId: string,
    child: { parentUserId: string; userId: string | null },
  ): void {
    const isParent = child.parentUserId === userId;
    const isChild = child.userId !== null && child.userId === userId;

    if (!isParent && !isChild) {
      throw new ForbiddenException('해당 자녀 프로필에 접근할 권한이 없습니다');
    }
  }
}
