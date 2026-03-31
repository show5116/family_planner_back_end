import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SavingsGoalStatus, SavingsType } from '@prisma/client';
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
  ) {}

  /**
   * 적립 목표 생성
   */
  async createGoal(userId: string, dto: CreateSavingsGoalDto) {
    await this.validateGroupMember(userId, dto.groupId);

    if (dto.autoDeposit && !dto.monthlyAmount) {
      throw new BadRequestException(
        '자동 적립 사용 시 monthlyAmount는 필수입니다',
      );
    }

    return await this.prisma.savingsGoal.create({
      data: {
        groupId: dto.groupId,
        name: dto.name,
        description: dto.description,
        targetAmount: dto.targetAmount,
        autoDeposit: dto.autoDeposit ?? false,
        monthlyAmount: dto.autoDeposit ? dto.monthlyAmount : null,
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
      throw new BadRequestException(
        '자동 적립 사용 시 monthlyAmount는 필수입니다',
      );
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
    return { message: '적립 목표가 삭제되었습니다' };
  }

  /**
   * 목표 완료 처리 (수동 종료)
   */
  async completeGoal(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (goal.status === SavingsGoalStatus.COMPLETED) {
      throw new BadRequestException('이미 완료된 적립 목표입니다');
    }

    await this.prisma.savingsGoal.update({
      where: { id },
      data: { status: SavingsGoalStatus.COMPLETED },
    });
    return { message: '적립 목표가 완료 처리되었습니다' };
  }

  /**
   * 자동 적립 일시 중지
   */
  async pauseGoal(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (!goal.autoDeposit) {
      throw new BadRequestException('자동 적립이 설정되지 않은 목표입니다');
    }
    if (goal.status === SavingsGoalStatus.COMPLETED) {
      throw new BadRequestException('완료된 적립 목표입니다');
    }
    if (goal.status === SavingsGoalStatus.PAUSED) {
      throw new BadRequestException('이미 일시 중지 상태입니다');
    }

    await this.prisma.savingsGoal.update({
      where: { id },
      data: { status: SavingsGoalStatus.PAUSED },
    });
    return { message: '자동 적립이 일시 중지되었습니다' };
  }

  /**
   * 자동 적립 재개
   */
  async resumeGoal(userId: string, id: string) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (!goal.autoDeposit) {
      throw new BadRequestException('자동 적립이 설정되지 않은 목표입니다');
    }
    if (goal.status === SavingsGoalStatus.COMPLETED) {
      throw new BadRequestException('완료된 적립 목표입니다');
    }
    if (goal.status === SavingsGoalStatus.ACTIVE) {
      throw new BadRequestException('이미 활성 상태입니다');
    }

    await this.prisma.savingsGoal.update({
      where: { id },
      data: { status: SavingsGoalStatus.ACTIVE },
    });
    return { message: '자동 적립이 재개되었습니다' };
  }

  /**
   * 수동 입금
   */
  async deposit(userId: string, id: string, dto: DepositDto) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (goal.status === SavingsGoalStatus.COMPLETED) {
      throw new BadRequestException('완료된 적립 목표입니다');
    }

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

    // 목표 달성 여부 확인
    if (
      updatedGoal.targetAmount &&
      Number(updatedGoal.currentAmount) >= Number(updatedGoal.targetAmount)
    ) {
      await this.prisma.savingsGoal.update({
        where: { id },
        data: { status: SavingsGoalStatus.COMPLETED },
      });
      this.notifyGoalCompleted(updatedGoal.groupId, updatedGoal.name).catch(
        () => null,
      );
    }

    return transaction;
  }

  /**
   * 출금
   */
  async withdraw(userId: string, id: string, dto: WithdrawDto) {
    const goal = await this.getGoalOrThrow(id);
    await this.validateGroupMember(userId, goal.groupId);

    if (goal.status === SavingsGoalStatus.COMPLETED) {
      throw new BadRequestException('완료된 적립 목표입니다');
    }
    if (Number(goal.currentAmount) < dto.amount) {
      throw new BadRequestException('잔액이 부족합니다');
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

    const [items, total] = await this.prisma.$transaction([
      this.prisma.savingsTransaction.findMany({
        where: { goalId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savingsTransaction.count({ where: { goalId } }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 자동 적립 실행 (스케줄러에서 호출)
   */
  async runAutoDeposit() {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { autoDeposit: true, status: SavingsGoalStatus.ACTIVE },
    });

    if (goals.length === 0) return { count: 0 };

    let count = 0;
    for (const goal of goals) {
      const monthlyAmount = Number(goal.monthlyAmount);
      if (!monthlyAmount) continue;

      const updatedGoal = await this.prisma.$transaction(async (tx) => {
        await tx.savingsTransaction.create({
          data: {
            goalId: goal.id,
            type: SavingsType.AUTO_DEPOSIT,
            amount: monthlyAmount,
            description: '자동 적립',
          },
        });
        return tx.savingsGoal.update({
          where: { id: goal.id },
          data: { currentAmount: { increment: monthlyAmount } },
        });
      });

      count++;

      // 목표 달성 여부 확인
      if (
        updatedGoal.targetAmount &&
        Number(updatedGoal.currentAmount) >= Number(updatedGoal.targetAmount)
      ) {
        await this.prisma.savingsGoal.update({
          where: { id: goal.id },
          data: { status: SavingsGoalStatus.COMPLETED },
        });
        this.notifyGoalCompleted(goal.groupId, goal.name).catch(() => null);
      }
    }

    return { count };
  }

  // ─── Private ─────────────────────────────────────────────

  private async getGoalOrThrow(id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('적립 목표를 찾을 수 없습니다');
    return goal;
  }

  private async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('해당 그룹의 멤버가 아닙니다');
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

    return {
      ...goal,
      targetAmount: target,
      currentAmount: current,
      monthlyAmount: goal.monthlyAmount ? Number(goal.monthlyAmount) : null,
      achievementRate,
    };
  }

  private async notifyGoalCompleted(groupId: string, goalName: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    for (const member of members) {
      await this.notificationQueue.enqueueImmediate({
        userId: member.userId,
        category: NotificationCategory.HOUSEHOLD,
        title: '적립 목표 달성!',
        body: `"${goalName}" 목표 금액을 달성했습니다.`,
        data: { groupId },
      });
    }
  }
}
