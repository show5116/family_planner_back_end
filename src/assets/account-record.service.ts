import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType, WithdrawalType } from '@prisma/client';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  CreateAccountRecordDto,
  RecordInputMode,
} from './dto/create-account-record.dto';
import { CreateAccountWithdrawalDto } from './dto/create-account-withdrawal.dto';
import { AccountService } from './account.service';

@Injectable()
export class AccountRecordService {
  private static readonly GOLD_SYMBOL = 'GOLD_KRW_SPOT';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly i18n: I18nService,
    private readonly accountService: AccountService,
  ) {}

  async getGoldCurrentPrice() {
    const indicator = await this.prisma.indicator.findUnique({
      where: { symbol: AccountRecordService.GOLD_SYMBOL },
      include: {
        prices: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!indicator || indicator.prices.length === 0) {
      return { pricePerGram: null, recordedAt: null };
    }

    const latest = indicator.prices[0];
    return {
      pricePerGram: Number(latest.price).toFixed(0),
      recordedAt: latest.recordedAt,
    };
  }

  async createAccountRecord(
    userId: string,
    accountId: string,
    dto: CreateAccountRecordDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_account_only_record');
    }

    const recordDate = new Date(dto.recordDate);

    const duplicate = await this.prisma.accountRecord.findFirst({
      where: { accountId, recordDate, withdrawalId: null },
    });
    if (duplicate) {
      throw new ConflictException('assets.errors.record_date_conflict');
    }

    const futureRecord = await this.prisma.accountRecord.findFirst({
      where: { accountId, recordDate: { gt: recordDate } },
      orderBy: { recordDate: 'asc' },
      select: { recordDate: true },
    });
    if (futureRecord) {
      throw new BadRequestException(
        `${futureRecord.recordDate.toISOString().slice(0, 10)}에 이후 자산 기록이 존재합니다. 가장 최신 날짜 이후로만 기록을 추가할 수 있습니다.`,
      );
    }

    let balance: number;
    let principal: number;
    let profit: number;
    let gramWeight: number | null = null;

    if (dto.inputMode === RecordInputMode.AUTO) {
      const prevRecord = await this.prisma.accountRecord.findFirst({
        where: { accountId, recordDate: { lt: recordDate } },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      });

      const prevPrincipal = prevRecord ? Number(prevRecord.principal) : 0;
      balance = dto.currentBalance ?? 0;
      principal = prevPrincipal + (dto.additionalPrincipal ?? 0);
      profit = balance - principal;
    } else if (dto.inputMode === RecordInputMode.GOLD) {
      if (account.type !== AccountType.GOLD) {
        throw new BadRequestException(
          'gold 모드는 GOLD 타입 계좌에서만 사용할 수 있습니다',
        );
      }

      const goldIndicator = await this.prisma.indicator.findUnique({
        where: { symbol: AccountRecordService.GOLD_SYMBOL },
        include: { prices: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });

      if (!goldIndicator || goldIndicator.prices.length === 0) {
        throw new BadRequestException('assets.errors.gold_price_unavailable');
      }

      const pricePerGram = Number(goldIndicator.prices[0].price);
      gramWeight = dto.gramWeight ?? 0;
      balance = gramWeight * pricePerGram;
      principal = dto.purchaseCost ?? balance;
      profit = balance - principal;
    } else {
      balance = dto.balance ?? 0;
      principal = dto.principal ?? 0;
      profit = dto.profit ?? 0;
    }

    const record = await this.prisma.accountRecord.create({
      data: {
        accountId,
        recordDate,
        balance,
        principal,
        profit,
        gramWeight,
        note: dto.note,
      },
    });

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const ownerLang = owner?.language ?? 'ko';
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: this.i18n.t('assets.notification.balance_updated_title', {
        lang: ownerLang,
      }),
      body: this.i18n.t('assets.notification.balance_updated_body', {
        lang: ownerLang,
        args: { name: account.name, balance: balance.toLocaleString('ko-KR') },
      }),
      data: { assetId: accountId },
    });

    return this.formatRecord(record);
  }

  async findAccountRecords(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }
    await this.accountService.validateGroupMember(userId, account.groupId);

    const [records, withdrawals] = await Promise.all([
      this.prisma.accountRecord.findMany({
        where: { accountId },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.accountWithdrawal.findMany({
        where: { accountId },
        orderBy: [{ withdrawalDate: 'desc' }, { createdAt: 'desc' }],
        include: { record: true },
      }),
    ]);

    const snapshots = records
      .filter((r) => r.withdrawalId === null)
      .map((r) => ({
        entryType: 'SNAPSHOT' as const,
        date: r.recordDate,
        createdAt: r.createdAt,
        ...this.formatRecord(r),
      }));

    const withdrawalItems = withdrawals.map((w) => {
      const snap = w.record;
      const balanceAfter = snap ? Number(snap.balance).toFixed(2) : null;
      const principalAfter = snap ? Number(snap.principal).toFixed(2) : null;
      const profitAfter = snap ? Number(snap.profit).toFixed(2) : null;
      const principal = snap ? Number(snap.principal) : 0;
      const profit = snap ? Number(snap.profit) : 0;
      const profitRate =
        snap && principal > 0 ? ((profit / principal) * 100).toFixed(2) : null;

      return {
        entryType: 'WITHDRAWAL' as const,
        date: w.withdrawalDate,
        createdAt: w.createdAt,
        ...this.formatWithdrawal(w),
        balanceAfter,
        principalAfter,
        profitAfter,
        profitRate,
      };
    });

    return [...snapshots, ...withdrawalItems].sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async removeAccountRecord(
    userId: string,
    accountId: string,
    recordId: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_record_only_delete');
    }

    const record = await this.prisma.accountRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.accountId !== accountId) {
      throw new NotFoundException('assets.errors.record_not_found');
    }

    await this.prisma.accountRecord.delete({ where: { id: recordId } });

    return {
      message: this.i18n.t('assets.success.record_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  async createWithdrawal(
    userId: string,
    accountId: string,
    dto: CreateAccountWithdrawalDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_withdrawal_only_add');
    }

    const withdrawalDate = new Date(dto.withdrawalDate);

    const prevSnapshot = await this.prisma.accountRecord.findFirst({
      where: { accountId, recordDate: { lte: withdrawalDate } },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (!prevSnapshot) {
      throw new BadRequestException(
        '출금일 이전의 자산 기록이 없습니다. 먼저 자산 기록을 추가하세요.',
      );
    }

    const futureSnapshot = await this.prisma.accountRecord.findFirst({
      where: { accountId, recordDate: { gt: withdrawalDate } },
      orderBy: { recordDate: 'asc' },
      select: { recordDate: true },
    });

    if (futureSnapshot) {
      throw new BadRequestException(
        `${futureSnapshot.recordDate.toISOString().slice(0, 10)}에 이후 자산 기록이 존재합니다. 해당 기록 이전 날짜로만 출금을 추가할 수 있습니다.`,
      );
    }

    const newBalance = Math.max(0, Number(prevSnapshot.balance) - dto.amount);
    const { principal, profit } = this.applyWithdrawal(
      Number(prevSnapshot.principal),
      Number(prevSnapshot.profit),
      dto.amount,
      dto.type,
    );

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.accountWithdrawal.create({
        data: {
          accountId,
          withdrawalDate,
          amount: dto.amount,
          type: dto.type,
          note: dto.note,
        },
      });
      await tx.accountRecord.create({
        data: {
          accountId,
          recordDate: withdrawalDate,
          balance: newBalance,
          principal,
          profit,
          withdrawalId: created.id,
        },
      });
      return created;
    });

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const lang = owner?.language ?? 'ko';
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: this.i18n.t('assets.notification.withdrawal_title', { lang }),
      body: this.i18n.t('assets.notification.withdrawal_body', {
        lang,
        args: {
          name: account.name,
          amount: dto.amount.toLocaleString('ko-KR'),
        },
      }),
      data: { assetId: accountId },
    });

    return this.formatWithdrawal(withdrawal);
  }

  async findWithdrawals(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }
    await this.accountService.validateGroupMember(userId, account.groupId);

    const withdrawals = await this.prisma.accountWithdrawal.findMany({
      where: { accountId },
      orderBy: { withdrawalDate: 'desc' },
    });

    return withdrawals.map((w) => this.formatWithdrawal(w));
  }

  async removeWithdrawal(
    userId: string,
    accountId: string,
    withdrawalId: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_withdrawal_only_delete');
    }

    const withdrawal = await this.prisma.accountWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.accountId !== accountId) {
      throw new NotFoundException('assets.errors.withdrawal_not_found');
    }

    await this.prisma.$transaction([
      this.prisma.accountRecord.deleteMany({ where: { withdrawalId } }),
      this.prisma.accountWithdrawal.delete({ where: { id: withdrawalId } }),
    ]);

    return {
      message: this.i18n.t('assets.success.withdrawal_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  private applyWithdrawal(
    principal: number,
    profit: number,
    amount: number,
    type: WithdrawalType,
  ): { principal: number; profit: number } {
    if (type === WithdrawalType.PRINCIPAL) {
      const deductFromPrincipal = Math.min(principal, amount);
      const remainder = amount - deductFromPrincipal;
      return {
        principal: principal - deductFromPrincipal,
        profit: Math.max(0, profit - remainder),
      };
    } else {
      const deductFromProfit = Math.min(profit, amount);
      const remainder = amount - deductFromProfit;
      return {
        principal: Math.max(0, principal - remainder),
        profit: profit - deductFromProfit,
      };
    }
  }

  formatRecord(record: {
    id: string;
    accountId: string;
    recordDate: Date;
    balance: unknown;
    principal: unknown;
    profit: unknown;
    gramWeight: unknown;
    note: string | null;
    createdAt: Date;
  }) {
    const principal = Number(record.principal);
    const profit = Number(record.profit);
    const profitRate =
      principal > 0 ? ((profit / principal) * 100).toFixed(2) : '0.00';

    return {
      id: record.id,
      accountId: record.accountId,
      recordDate: record.recordDate,
      balance: Number(record.balance).toFixed(2),
      principal: principal.toFixed(2),
      profit: profit.toFixed(2),
      profitRate,
      gramWeight:
        record.gramWeight !== null && record.gramWeight !== undefined
          ? Number(record.gramWeight).toFixed(4)
          : null,
      note: record.note,
      createdAt: record.createdAt,
    };
  }

  private formatWithdrawal(withdrawal: {
    id: string;
    accountId: string;
    withdrawalDate: Date;
    amount: unknown;
    type: WithdrawalType;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: withdrawal.id,
      accountId: withdrawal.accountId,
      withdrawalDate: withdrawal.withdrawalDate,
      amount: Number(withdrawal.amount).toFixed(2),
      type: withdrawal.type,
      note: withdrawal.note,
      createdAt: withdrawal.createdAt,
    };
  }
}
