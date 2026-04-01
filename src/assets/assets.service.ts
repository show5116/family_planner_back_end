import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountRecordDto } from './dto/create-account-record.dto';
import { AccountQueryDto } from './dto/account-query.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 그룹 멤버 여부 검증
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
   * 계좌 생성
   */
  async createAccount(userId: string, dto: CreateAccountDto) {
    await this.validateGroupMember(userId, dto.groupId);

    const account = await this.prisma.account.create({
      data: {
        groupId: dto.groupId,
        userId,
        name: dto.name,
        accountNumber: dto.accountNumber,
        institution: dto.institution,
        type: dto.type,
      },
    });

    // 그룹 멤버들에게 새 계좌 등록 알림 발송
    const members = await this.prisma.groupMember.findMany({
      where: { groupId: dto.groupId },
      select: { userId: true },
    });

    await Promise.allSettled(
      members
        .filter((m) => m.userId !== userId)
        .map((m) =>
          this.notificationService.sendNotification({
            userId: m.userId,
            category: NotificationCategory.ASSET,
            title: '새 자산 계좌 등록',
            body: `"${dto.name}" 계좌가 등록되었습니다`,
            data: { accountId: account.id, groupId: dto.groupId },
          }),
        ),
    );

    return this.formatAccount(account, null);
  }

  /**
   * 계좌 목록 조회 (최신 기록 포함)
   */
  async findAllAccounts(userId: string, query: AccountQueryDto) {
    await this.validateGroupMember(userId, query.groupId);

    const accounts = await this.prisma.account.findMany({
      where: {
        groupId: query.groupId,
        ...(query.userId && { userId: query.userId }),
      },
      include: {
        records: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => {
      const latestRecord = account.records[0] ?? null;
      return this.formatAccount(account, latestRecord);
    });
  }

  /**
   * 계좌 상세 조회
   */
  async findOneAccount(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    await this.validateGroupMember(userId, account.groupId);

    const latestRecord = account.records[0] ?? null;
    return this.formatAccount(account, latestRecord);
  }

  /**
   * 계좌 수정 (소유자만)
   */
  async updateAccount(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('본인의 계좌만 수정할 수 있습니다');
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.accountNumber !== undefined && {
          accountNumber: dto.accountNumber,
        }),
        ...(dto.institution !== undefined && { institution: dto.institution }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
      include: {
        records: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    const latestRecord = updated.records[0] ?? null;
    return this.formatAccount(updated, latestRecord);
  }

  /**
   * 계좌 삭제 (소유자만)
   */
  async removeAccount(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('본인의 계좌만 삭제할 수 있습니다');
    }

    await this.prisma.account.delete({ where: { id } });

    return { message: '계좌가 삭제되었습니다' };
  }

  /**
   * 자산 기록 추가 (소유자만)
   */
  async createAccountRecord(
    userId: string,
    accountId: string,
    dto: CreateAccountRecordDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('본인의 계좌에만 기록을 추가할 수 있습니다');
    }

    const record = await this.prisma.accountRecord.create({
      data: {
        accountId,
        recordDate: new Date(dto.recordDate),
        balance: dto.balance,
        principal: dto.principal,
        profit: dto.profit,
        note: dto.note,
      },
    });

    // 계좌 소유자에게 잔액 기록 알림
    const balance = Number(dto.balance).toLocaleString('ko-KR');
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: '자산 잔액 업데이트',
      body: `"${account.name}" 잔액이 ${balance}원으로 기록되었습니다`,
      data: { accountId, recordId: record.id },
    });

    return this.formatRecord(record);
  }

  /**
   * 자산 기록 목록 조회 (그룹 멤버)
   */
  async findAccountRecords(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    await this.validateGroupMember(userId, account.groupId);

    const records = await this.prisma.accountRecord.findMany({
      where: { accountId },
      orderBy: { recordDate: 'desc' },
    });

    return records.map((r) => this.formatRecord(r));
  }

  /**
   * 그룹 자산 통계 조회
   */
  async getStatistics(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    const accounts = await this.prisma.account.findMany({
      where: { groupId },
      include: {
        records: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    let totalBalance = 0;
    let totalPrincipal = 0;
    let totalProfit = 0;
    const typeMap = new Map<AccountType, { balance: number; count: number }>();

    for (const account of accounts) {
      const latest = account.records[0];
      if (!latest) continue;

      const balance = Number(latest.balance);
      const principal = Number(latest.principal);
      const profit = Number(latest.profit);

      totalBalance += balance;
      totalPrincipal += principal;
      totalProfit += profit;

      const existing = typeMap.get(account.type) ?? { balance: 0, count: 0 };
      typeMap.set(account.type, {
        balance: existing.balance + balance,
        count: existing.count + 1,
      });
    }

    const profitRate =
      totalPrincipal > 0 ? (totalProfit / totalPrincipal) * 100 : 0;

    const byType = Array.from(typeMap.entries()).map(([type, stat]) => ({
      type,
      balance: stat.balance.toFixed(2),
      count: stat.count,
    }));

    // 자산 연동된 적립금 집계
    const savingsGoalsRaw = await this.prisma.savingsGoal.findMany({
      where: { groupId, includeInAssets: true },
      select: { id: true, name: true, currentAmount: true },
    });

    const savingsTotal = savingsGoalsRaw.reduce(
      (sum, g) => sum + Number(g.currentAmount),
      0,
    );
    const savingsGoals = savingsGoalsRaw.map((g) => ({
      id: g.id,
      name: g.name,
      currentAmount: Number(g.currentAmount).toFixed(2),
    }));

    return {
      totalBalance: totalBalance.toFixed(2),
      totalPrincipal: totalPrincipal.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      profitRate: profitRate.toFixed(2),
      accountCount: accounts.length,
      byType,
      savingsTotal: savingsTotal.toFixed(2),
      savingsGoals,
    };
  }

  /**
   * 계좌 포맷 헬퍼
   */
  private formatAccount(
    account: {
      id: string;
      groupId: string;
      userId: string;
      name: string;
      accountNumber: string | null;
      institution: string;
      type: AccountType;
      createdAt: Date;
      updatedAt: Date;
    },
    latestRecord: {
      balance: unknown;
      principal: unknown;
      profit: unknown;
    } | null,
  ) {
    let latestBalance: string | null = null;
    let profitRate: string | null = null;

    if (latestRecord) {
      const balance = Number(latestRecord.balance);
      const principal = Number(latestRecord.principal);
      const profit = Number(latestRecord.profit);
      latestBalance = balance.toFixed(2);
      profitRate =
        principal > 0 ? ((profit / principal) * 100).toFixed(2) : '0.00';
    }

    return {
      id: account.id,
      groupId: account.groupId,
      userId: account.userId,
      name: account.name,
      accountNumber: account.accountNumber,
      institution: account.institution,
      type: account.type,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      latestBalance,
      profitRate,
    };
  }

  /**
   * 기록 포맷 헬퍼
   */
  private formatRecord(record: {
    id: string;
    accountId: string;
    recordDate: Date;
    balance: unknown;
    principal: unknown;
    profit: unknown;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: record.id,
      accountId: record.accountId,
      recordDate: record.recordDate,
      balance: Number(record.balance).toFixed(2),
      principal: Number(record.principal).toFixed(2),
      profit: Number(record.profit).toFixed(2),
      note: record.note,
      createdAt: record.createdAt,
    };
  }
}
