import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SavingsGoalStatus, SavingsType } from '@prisma/client';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { DepositDto, WithdrawDto } from './dto/savings-transaction.dto';
import { TransactionQueryDto } from './dto/savings-query.dto';

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * 적립 목표 생성
   */
  async createGoal(userId: string, dto: CreateSavingsGoalDto) {
    await this.validateGroupMember(userId, dto.groupId);

    if (dto.autoDeposit && !dto.monthlyAmount) {
      throw new BadRequestException('savings.errors.monthly_amount_required');
    }

    return await this.prisma.savingsGoal.create({
      data: {
        groupId: dto.groupId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        autoDeposit: dto.autoDeposit ?? false,
        monthlyAmount: dto.autoDeposit ? dto.monthlyAmount : null,
        depositDay: dto.depositDay ?? 1,
        includeInAssets: dto.includeInAssets ?? false,
      },
    });
  }

  /**
   * 적립 목표 목록 조회
   */
  async findGoals(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    const goals = await this.prisma.savingsGoal.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => this.toGoalDto(g));
  }

  /**
   * 적립 목표 상세 조회 (최근 내역 10건 포함)
   */
  async findGoalById(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    const transactions = await this.prisma.savingsTransaction.findMany({
      where: { goalId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { ...this.toGoalDto(goal), transactions };
  }

  /**
   * 적립 목표 수정
   */
  async updateGoal(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    const nextAutoDeposit = dto.autoDeposit ?? goal.autoDeposit;
    if (nextAutoDeposit && !dto.monthlyAmount && !goal.monthlyAmount) {
      throw new BadRequestException('savings.errors.monthly_amount_required');
    }

    return await this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetAmount !== undefined && {
          targetAmount: dto.targetAmount,
        }),
        ...(dto.autoDeposit !== undefined && { autoDeposit: dto.autoDeposit }),
        ...(dto.monthlyAmount !== undefined && {
          monthlyAmount: dto.monthlyAmount,
        }),
        ...(dto.autoDeposit === false && { monthlyAmount: null }),
        ...(dto.depositDay !== undefined && { depositDay: dto.depositDay }),
        ...(dto.includeInAssets !== undefined && {
          includeInAssets: dto.includeInAssets,
        }),
      },
    });
  }

  /**
   * 적립 목표 삭제
   */
  async deleteGoal(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    await this.prisma.savingsGoal.delete({ where: { id } });
    return {
      message: this.i18n.t('savings.success.goal_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 자동 적립 일시 중지
   */
  async pauseGoal(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (!goal.autoDeposit) {
      throw new BadRequestException('savings.errors.no_auto_deposit');
    }
    if (goal.status === SavingsGoalStatus.PAUSED) {
      throw new BadRequestException('savings.errors.already_paused');
    }

    await this.prisma.savingsGoal.update({
      where: { id },
      data: { status: SavingsGoalStatus.PAUSED },
    });
    return {
      message: this.i18n.t('savings.success.auto_deposit_paused', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 자동 적립 재개
   */
  async resumeGoal(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (!goal.autoDeposit) {
      throw new BadRequestException('savings.errors.no_auto_deposit');
    }
    if (goal.status === SavingsGoalStatus.ACTIVE) {
      throw new BadRequestException('savings.errors.already_active');
    }

    await this.prisma.savingsGoal.update({
      where: { id },
      data: { status: SavingsGoalStatus.ACTIVE },
    });
    return {
      message: this.i18n.t('savings.success.auto_deposit_resumed', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 수동 입금
   */
  async deposit(userId: string, id: string, dto: DepositDto) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    const [transaction, updatedGoal] = await this.prisma.$transaction([
      this.prisma.savingsTransaction.create({
        data: {
          goalId: id,
          type: SavingsType.DEPOSIT,
          amount: dto.amount,
          description: dto.description,
        },
      }),
      this.prisma.savingsGoal.update({
        where: { id },
        data: { currentAmount: { increment: dto.amount } },
      }),
    ]);

    // 목표 금액 달성 시 알림 발송 (상태 변경 없음)
    if (
      updatedGoal.targetAmount &&
      Number(updatedGoal.currentAmount) >= Number(updatedGoal.targetAmount)
    ) {
      this.notifyGoalReached(
        updatedGoal.groupId,
        updatedGoal.name,
        updatedGoal.id,
      ).catch(() => null);
    }

    return transaction;
  }

  /**
   * 출금
   */
  async withdraw(userId: string, id: string, dto: WithdrawDto) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (Number(goal.currentAmount) < dto.amount) {
      throw new BadRequestException('savings.errors.insufficient_balance');
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.savingsTransaction.create({
        data: {
          goalId: id,
          type: SavingsType.WITHDRAW,
          amount: dto.amount,
          description: dto.description,
        },
      }),
      this.prisma.savingsGoal.update({
        where: { id },
        data: { currentAmount: { decrement: dto.amount } },
      }),
    ]);

    return transaction;
  }

  /**
   * 내역 목록 조회 (페이지네이션)
   */
  async findTransactions(
    userId: string,
    goalId: string,
    query: TransactionQueryDto,
  ) {
    const goal = await this.getGoalOrThrow(goalId);
    await this.validateGroupMember(userId, goal.groupId);

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where = { goalId, ...(query.type ? { type: query.type } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.savingsTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savingsTransaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Private ─────────────────────────────────────────────

  private async getGoalOrThrow(id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('savings.errors.goal_not_found');
    return goal;
  }

  private async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('savings.errors.not_member');
  }

  private toGoalDto(goal: {
    id: string;
    groupId: string;
    name: string;
    description: string | null;
    targetAmount: unknown;
    currentAmount: unknown;
    autoDeposit: boolean;
    monthlyAmount: unknown;
    depositDay: number;
    includeInAssets: boolean;
    status: SavingsGoalStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const target = goal.targetAmount ? Number(goal.targetAmount) : null;
    const current = Number(goal.currentAmount);
    const achievementRate =
      target !== null
        ? Math.min(Math.round((current / target) * 100), 100)
        : null;
    const isGoalReached = target !== null ? current >= target : null;

    return {
      ...goal,
      targetAmount: target,
      currentAmount: current,
      monthlyAmount: goal.monthlyAmount ? Number(goal.monthlyAmount) : null,
      achievementRate,
      isGoalReached,
    };
  }

  private async getUserLang(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    return user?.language ?? 'ko';
  }

  private async notifyGoalReached(
    groupId: string,
    goalName: string,
    goalId: string,
  ) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    for (const member of members) {
      const lang = await this.getUserLang(member.userId);
      await this.notificationQueue.enqueueImmediate({
        userId: member.userId,
        category: NotificationCategory.SAVINGS,
        title: this.i18n.t('savings.notification.goal_reached_title', { lang }),
        body: this.i18n.t('savings.notification.goal_reached_body', {
          lang,
          args: { name: goalName },
        }),
        data: { savingsId: goalId },
      });
    }
  }
}
