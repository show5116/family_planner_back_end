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
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  CreateAccountRecordDto,
  RecordInputMode,
} from './dto/create-account-record.dto';
import { CreateAccountWithdrawalDto } from './dto/create-account-withdrawal.dto';
import { AccountQueryDto } from './dto/account-query.dto';
import { ReorderAccountsDto } from './dto/reorder-accounts.dto';
import { CreateAccountHoldingRecordDto } from './dto/create-account-holding-record.dto';
import { UpdateAccountHoldingRecordDto } from './dto/update-account-holding-record.dto';
import {
  AccountTrendQueryDto,
  TrendPeriod,
  TrendQueryDto,
} from './dto/assets-query.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * 그룹 멤버 여부 검증
   */
  private async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('assets.errors.not_member');
    }
  }

  /**
   * 현재 GOLD_KRW_SPOT 가격 조회 (원/g)
   */
  async getGoldCurrentPrice() {
    const indicator = await this.prisma.indicator.findUnique({
      where: { symbol: 'GOLD_KRW_SPOT' },
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
        institution: dto.institution ?? null,
        type: dto.type,
        recordReminderDay: dto.recordReminderDay ?? null,
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
        .map(async (m) => {
          const member = await this.prisma.user.findUnique({
            where: { id: m.userId },
            select: { language: true },
          });
          const lang = member?.language ?? 'ko';
          return this.notificationService.sendNotification({
            userId: m.userId,
            category: NotificationCategory.ASSET,
            title: this.i18n.t('assets.notification.account_registered_title', {
              lang,
            }),
            body: this.i18n.t('assets.notification.account_registered_body', {
              lang,
              args: { name: dto.name },
            }),
            data: { assetId: account.id },
          });
        }),
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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return Promise.all(
      accounts.map(async (account) => {
        const latest = account.records[0] ?? null;
        if (!latest) return this.formatAccount(account, null);
        const adjusted = await this.applyPostSnapshotWithdrawals(
          account.id,
          latest,
        );
        return this.formatAccount(account, adjusted);
      }),
    );
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
      throw new NotFoundException('assets.errors.account_not_found');
    }

    await this.validateGroupMember(userId, account.groupId);

    const latest = account.records[0] ?? null;
    if (!latest) return this.formatAccount(account, null);
    const adjusted = await this.applyPostSnapshotWithdrawals(
      account.id,
      latest,
    );
    return this.formatAccount(account, adjusted);
  }

  /**
   * 계좌 수정 (소유자만)
   */
  async updateAccount(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_account_only_update');
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
        ...('recordReminderDay' in dto && {
          recordReminderDay: dto.recordReminderDay ?? null,
        }),
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
      throw new NotFoundException('assets.errors.account_not_found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_account_only_delete');
    }

    await this.prisma.account.delete({ where: { id } });

    return {
      message: this.i18n.t('assets.success.account_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 계좌 순서 변경 (그룹 멤버)
   */
  async reorderAccounts(userId: string, dto: ReorderAccountsDto) {
    await this.validateGroupMember(userId, dto.groupId);

    const accounts = await this.prisma.account.findMany({
      where: { id: { in: dto.accountIds }, groupId: dto.groupId },
      select: { id: true },
    });

    const validIds = new Set(accounts.map((a) => a.id));
    const invalidIds = dto.accountIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException('assets.errors.account_wrong_group');
    }

    await this.prisma.$transaction(
      dto.accountIds.map((accountId, index) =>
        this.prisma.account.update({
          where: { id: accountId },
          data: { sortOrder: index },
        }),
      ),
    );

    return {
      message: this.i18n.t('assets.success.account_order_changed', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
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
      throw new NotFoundException('assets.errors.account_not_found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_account_only_record');
    }

    const recordDate = new Date(dto.recordDate);

    const duplicate = await this.prisma.accountRecord.findUnique({
      where: { accountId_recordDate: { accountId, recordDate } },
    });

    if (duplicate) {
      throw new ConflictException('assets.errors.record_date_conflict');
    }

    let balance: number;
    let principal: number;
    let profit: number;
    let gramWeight: number | null = null;

    if (dto.inputMode === RecordInputMode.AUTO) {
      const prevRecord = await this.prisma.accountRecord.findFirst({
        where: { accountId, recordDate: { lt: recordDate } },
        orderBy: { recordDate: 'desc' },
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
        where: { symbol: 'GOLD_KRW_SPOT' },
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

    // 계좌 소유자에게 잔액 기록 알림
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const ownerLang = owner?.language ?? 'ko';
    const balanceFormatted = balance.toLocaleString('ko-KR');
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: this.i18n.t('assets.notification.balance_updated_title', {
        lang: ownerLang,
      }),
      body: this.i18n.t('assets.notification.balance_updated_body', {
        lang: ownerLang,
        args: { name: account.name, balance: balanceFormatted },
      }),
      data: { assetId: accountId },
    });

    return this.formatRecord(record);
  }

  /**
   * 자산 기록 + 출금 기록 통합 목록 조회 (그룹 멤버)
   * 날짜 내림차순, 같은 날짜면 출금이 스냅샷보다 먼저
   */
  async findAccountRecords(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    await this.validateGroupMember(userId, account.groupId);

    const [records, withdrawals] = await Promise.all([
      this.prisma.accountRecord.findMany({
        where: { accountId },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.accountWithdrawal.findMany({
        where: { accountId },
        orderBy: [{ withdrawalDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const snapshots = records.map((r) => ({
      entryType: 'SNAPSHOT' as const,
      date: r.recordDate,
      createdAt: r.createdAt,
      ...this.formatRecord(r),
    }));

    // 출금 기록에 잔액/원금/수익금 추가
    // 출금 createdAt 기준으로 직전에 생성된 스냅샷에 applyWithdrawal 적용
    const recordsByCreatedAt = [...records].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const withdrawalItems = withdrawals.map((w) => {
      const prevSnapshot = [...recordsByCreatedAt]
        .reverse()
        .find((r) => r.createdAt < w.createdAt);

      let balanceAfter: string | null = null;
      let principalAfter: string | null = null;
      let profitAfter: string | null = null;
      let profitRate: string | null = null;

      if (prevSnapshot) {
        const { principal, profit } = this.applyWithdrawal(
          Number(prevSnapshot.principal),
          Number(prevSnapshot.profit),
          Number(w.amount),
          w.type,
        );
        const balance = Math.max(
          0,
          Number(prevSnapshot.balance) - Number(w.amount),
        );
        balanceAfter = balance.toFixed(2);
        principalAfter = principal.toFixed(2);
        profitAfter = profit.toFixed(2);
        profitRate =
          principal > 0 ? ((profit / principal) * 100).toFixed(2) : '0.00';
      }

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
      // 같은 날짜면 createdAt 내림차순 (나중에 등록한 것이 위)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * 자산 기록 삭제 (소유자만)
   */
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

  /**
   * 그룹 자산 통계 조회
   */
  async getStatistics(userId: string, groupId: string, accountIds?: string[]) {
    await this.validateGroupMember(userId, groupId);

    const accountWhere: { groupId: string; id?: { in: string[] } } = {
      groupId,
    };
    if (accountIds && accountIds.length > 0) {
      const validAccounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, groupId },
        select: { id: true },
      });
      accountWhere.id = { in: validAccounts.map((a) => a.id) };
    }

    const accounts = await this.prisma.account.findMany({
      where: accountWhere,
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

      // 최신 스냅샷 이후 출금을 순서대로 적용 (balance, principal, profit 보정)
      const postSnapshotWithdrawals =
        await this.prisma.accountWithdrawal.findMany({
          where: {
            accountId: account.id,
            OR: [
              { withdrawalDate: { gt: latest.recordDate } },
              {
                withdrawalDate: latest.recordDate,
                createdAt: { gt: latest.createdAt },
              },
            ],
          },
          orderBy: [{ withdrawalDate: 'asc' }, { createdAt: 'asc' }],
          select: { amount: true, type: true },
        });

      let balance = Number(latest.balance);
      let principal = Number(latest.principal);
      let profit = Number(latest.profit);

      for (const w of postSnapshotWithdrawals) {
        balance = Math.max(0, balance - Number(w.amount));
        ({ principal, profit } = this.applyWithdrawal(
          principal,
          profit,
          Number(w.amount),
          w.type,
        ));
      }

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

    // 종목별 집계: 각 계좌+종목명별 가장 최신 기록 금액 합산
    const filteredAccountIds = accounts.map((a) => a.id);
    const holdingMap = new Map<
      string,
      { name: string; ticker: string | null; estimatedAmount: number }
    >();

    if (filteredAccountIds.length > 0) {
      // 계좌+종목명별 최신 recordDate 조회
      const latestDates = await this.prisma.accountHoldingRecord.groupBy({
        by: ['accountId', 'name'],
        where: { accountId: { in: filteredAccountIds } },
        _max: { recordDate: true },
      });

      // 최신 날짜 기록만 조회
      for (const { accountId, name, _max } of latestDates) {
        if (!_max.recordDate) continue;
        const record = await this.prisma.accountHoldingRecord.findUnique({
          where: {
            accountId_recordDate_name: {
              accountId,
              recordDate: _max.recordDate,
              name,
            },
          },
          select: { name: true, ticker: true, amount: true },
        });
        if (!record) continue;
        const key = `${record.name}||${record.ticker ?? ''}`;
        const prev = holdingMap.get(key) ?? {
          name: record.name,
          ticker: record.ticker,
          estimatedAmount: 0,
        };
        holdingMap.set(key, {
          ...prev,
          estimatedAmount: prev.estimatedAmount + Number(record.amount),
        });
      }
    }

    const byHolding = Array.from(holdingMap.values())
      .map((h) => ({
        name: h.name,
        ticker: h.ticker,
        estimatedAmount: h.estimatedAmount.toFixed(2),
        globalRatio:
          totalBalance > 0
            ? ((h.estimatedAmount / totalBalance) * 100).toFixed(2)
            : '0.00',
      }))
      .sort((a, b) => Number(b.estimatedAmount) - Number(a.estimatedAmount));

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

    // 저금통은 원금/수익 구분 없이 전액을 totalBalance, totalPrincipal에 합산
    const grandTotalBalance = totalBalance + savingsTotal;
    const grandTotalPrincipal = totalPrincipal + savingsTotal;
    const grandProfitRate =
      grandTotalPrincipal > 0 ? (totalProfit / grandTotalPrincipal) * 100 : 0;

    return {
      totalBalance: grandTotalBalance.toFixed(2),
      totalPrincipal: grandTotalPrincipal.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      profitRate: grandProfitRate.toFixed(2),
      accountCount: accounts.length,
      byType,
      savingsTotal: savingsTotal.toFixed(2),
      savingsGoals,
      byHolding,
    };
  }

  /**
   * holding record 목록 조회 (그룹 멤버) — recordDate 필터 가능
   */
  async findHoldingRecords(
    userId: string,
    accountId: string,
    recordDate?: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    await this.validateGroupMember(userId, account.groupId);

    const whereDate = recordDate ? new Date(recordDate) : undefined;

    const [records, accountRecord] = await Promise.all([
      this.prisma.accountHoldingRecord.findMany({
        where: { accountId, ...(whereDate && { recordDate: whereDate }) },
        orderBy: [{ recordDate: 'desc' }, { name: 'asc' }],
      }),
      whereDate
        ? this.prisma.accountRecord.findUnique({
            where: {
              accountId_recordDate: { accountId, recordDate: whereDate },
            },
            select: { balance: true },
          })
        : this.prisma.accountRecord.findFirst({
            where: { accountId },
            orderBy: { recordDate: 'desc' },
            select: { balance: true },
          }),
    ]);

    const balance = Number(accountRecord?.balance ?? 0);
    const totalAmount = records.reduce((sum, r) => sum + Number(r.amount), 0);
    const unallocatedAmount = (balance - totalAmount).toFixed(2);

    return {
      records: records.map((r) => this.formatHoldingRecord(r)),
      unallocatedAmount,
    };
  }

  /**
   * holding record 추가 (소유자만)
   */
  async createHoldingRecord(
    userId: string,
    accountId: string,
    dto: CreateAccountHoldingRecordDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('assets.errors.own_account_only_add_stock');
    }

    const recordDate = new Date(dto.recordDate);

    const existing = await this.prisma.accountHoldingRecord.findUnique({
      where: {
        accountId_recordDate_name: { accountId, recordDate, name: dto.name },
      },
    });

    if (existing) {
      throw new ConflictException(
        '해당 날짜에 동일한 종목명의 기록이 이미 존재합니다.',
      );
    }

    const record = await this.prisma.accountHoldingRecord.create({
      data: {
        accountId,
        recordDate,
        name: dto.name,
        ticker: dto.ticker ?? null,
        amount: dto.amount,
      },
    });

    return this.formatHoldingRecord(record);
  }

  /**
   * holding record 수정 (소유자만) — name, ticker, amount 수정 가능
   * name 변경 시 같은 날짜에 동일한 이름이 없어야 함
   */
  async updateHoldingRecord(
    userId: string,
    accountId: string,
    recordId: string,
    dto: UpdateAccountHoldingRecordDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException(
        'assets.errors.own_account_only_update_stock',
      );
    }

    const record = await this.prisma.accountHoldingRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.accountId !== accountId) {
      throw new NotFoundException('assets.errors.stock_not_found');
    }

    const newName = dto.name ?? record.name;
    const newAmount = dto.amount ?? Number(record.amount);

    if (dto.name !== undefined && dto.name !== record.name) {
      const conflict = await this.prisma.accountHoldingRecord.findUnique({
        where: {
          accountId_recordDate_name: {
            accountId,
            recordDate: record.recordDate,
            name: dto.name,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(
          '해당 날짜에 동일한 종목명의 기록이 이미 존재합니다.',
        );
      }
    }

    const updated = await this.prisma.accountHoldingRecord.update({
      where: { id: recordId },
      data: {
        name: newName,
        ...(dto.ticker !== undefined && { ticker: dto.ticker }),
        amount: newAmount,
      },
    });

    return this.formatHoldingRecord(updated);
  }

  /**
   * holding record 삭제 (소유자만)
   */
  async removeHoldingRecord(
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
      throw new ForbiddenException(
        'assets.errors.own_account_only_delete_stock',
      );
    }

    const record = await this.prisma.accountHoldingRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.accountId !== accountId) {
      throw new NotFoundException('assets.errors.stock_not_found');
    }

    await this.prisma.accountHoldingRecord.delete({ where: { id: recordId } });

    return {
      message: this.i18n.t('assets.success.record_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 자동완성용 종목명 목록 조회 (그룹 멤버)
   */
  async findHoldingNames(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    const names = await this.prisma.accountHoldingRecord.findMany({
      where: { account: { groupId } },
      select: { name: true, ticker: true },
      distinct: ['name', 'ticker'],
      orderBy: { name: 'asc' },
    });

    return names;
  }

  private formatHoldingRecord(record: {
    id: string;
    accountId: string;
    recordDate: Date;
    name: string;
    ticker: string | null;
    amount: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: record.id,
      accountId: record.accountId,
      recordDate: record.recordDate,
      name: record.name,
      ticker: record.ticker,
      amount: Number(record.amount).toFixed(2),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private maskAccountNumber(accountNumber: string | null): string | null {
    if (!accountNumber) return null;
    // 숫자만 추출 후 뒤 4자리만 노출, 나머지는 *로 마스킹
    const digits = accountNumber.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    const visible = digits.slice(-4);
    const masked = '*'.repeat(digits.length - 4);
    return `${masked}${visible}`;
  }

  /**
   * 최신 스냅샷 이후 출금을 적용해 보정된 balance/principal/profit 반환
   */
  private async applyPostSnapshotWithdrawals(
    accountId: string,
    latest: {
      recordDate: Date;
      createdAt: Date;
      balance: unknown;
      principal: unknown;
      profit: unknown;
    },
  ) {
    const postWithdrawals = await this.prisma.accountWithdrawal.findMany({
      where: {
        accountId,
        OR: [
          { withdrawalDate: { gt: latest.recordDate } },
          {
            withdrawalDate: latest.recordDate,
            createdAt: { gt: latest.createdAt },
          },
        ],
      },
      orderBy: [{ withdrawalDate: 'asc' }, { createdAt: 'asc' }],
      select: { amount: true, type: true },
    });

    let balance = Number(latest.balance);
    let principal = Number(latest.principal);
    let profit = Number(latest.profit);

    for (const w of postWithdrawals) {
      balance = Math.max(0, balance - Number(w.amount));
      ({ principal, profit } = this.applyWithdrawal(
        principal,
        profit,
        Number(w.amount),
        w.type,
      ));
    }

    return { balance, principal, profit };
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
      institution: string | null;
      type: AccountType;
      sortOrder: number;
      recordReminderDay?: number | null;
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
      accountNumber: this.maskAccountNumber(account.accountNumber),
      institution: account.institution,
      type: account.type,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      latestBalance,
      profitRate,
      recordReminderDay: account.recordReminderDay,
    };
  }

  /**
   * 기록 포맷 헬퍼
   */
  /**
   * 그룹 전체 자산 기간 통계
   */
  async getGroupTrend(userId: string, query: TrendQueryDto) {
    await this.validateGroupMember(userId, query.groupId);

    // accountIds 지정 시 해당 계좌들이 그룹 소속인지 검증
    let accountIds: string[];
    if (query.accountIds && query.accountIds.length > 0) {
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: query.accountIds }, groupId: query.groupId },
        select: { id: true },
      });
      accountIds = accounts.map((a) => a.id);
    } else {
      const accounts = await this.prisma.account.findMany({
        where: { groupId: query.groupId },
        select: { id: true },
      });
      accountIds = accounts.map((a) => a.id);
    }

    if (accountIds.length === 0) return [];

    const rangeStart =
      query.period === TrendPeriod.MONTHLY
        ? new Date(`${query.year}-01-01`)
        : null;
    const rangeEnd =
      query.period === TrendPeriod.MONTHLY
        ? new Date(`${Number(query.year) + 1}-01-01`)
        : null;

    const where =
      rangeStart && rangeEnd
        ? {
            accountId: { in: accountIds },
            recordDate: { gte: rangeStart, lt: rangeEnd },
          }
        : { accountId: { in: accountIds } };

    const records = await this.prisma.accountRecord.findMany({
      where,
      orderBy: { recordDate: 'asc' },
      select: {
        accountId: true,
        recordDate: true,
        balance: true,
        principal: true,
        profit: true,
      },
    });

    // monthly 모드: 조회 범위 이전의 계좌별 마지막 기록을 carry-forward 시작값으로 추가
    let seedRecords: typeof records = [];
    if (rangeStart) {
      const lastBeforeRange = await Promise.all(
        accountIds.map((id) =>
          this.prisma.accountRecord.findFirst({
            where: { accountId: id, recordDate: { lt: rangeStart } },
            orderBy: { recordDate: 'desc' },
            select: {
              accountId: true,
              recordDate: true,
              balance: true,
              principal: true,
              profit: true,
            },
          }),
        ),
      );
      seedRecords = lastBeforeRange.filter((r) => r !== null);
    }

    // 출금 데이터 조회 (스냅샷 없는 달의 balance carry-forward 보정용)
    const withdrawalWhere =
      rangeStart && rangeEnd
        ? {
            accountId: { in: accountIds },
            withdrawalDate: { gte: rangeStart, lt: rangeEnd },
          }
        : { accountId: { in: accountIds } };
    const withdrawals = await this.prisma.accountWithdrawal.findMany({
      where: withdrawalWhere,
      select: {
        accountId: true,
        withdrawalDate: true,
        amount: true,
        type: true,
      },
    });

    return this.aggregateTrend(
      seedRecords,
      records,
      query.period,
      rangeStart,
      withdrawals,
    );
  }

  /**
   * 계좌별 기간 통계
   */
  async getAccountTrend(
    userId: string,
    accountId: string,
    query: AccountTrendQueryDto,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    await this.validateGroupMember(userId, account.groupId);

    const rangeStart =
      query.period === TrendPeriod.MONTHLY
        ? new Date(`${query.year}-01-01`)
        : null;
    const rangeEnd =
      query.period === TrendPeriod.MONTHLY
        ? new Date(`${Number(query.year) + 1}-01-01`)
        : null;

    const where =
      rangeStart && rangeEnd
        ? {
            accountId,
            recordDate: { gte: rangeStart, lt: rangeEnd },
          }
        : { accountId };

    const records = await this.prisma.accountRecord.findMany({
      where,
      orderBy: { recordDate: 'asc' },
      select: {
        accountId: true,
        recordDate: true,
        balance: true,
        principal: true,
        profit: true,
      },
    });

    // monthly 모드: 조회 범위 이전의 마지막 기록을 carry-forward 시작값으로 추가
    let seedRecords: typeof records = [];
    if (rangeStart) {
      const lastBefore = await this.prisma.accountRecord.findFirst({
        where: { accountId, recordDate: { lt: rangeStart } },
        orderBy: { recordDate: 'desc' },
        select: {
          accountId: true,
          recordDate: true,
          balance: true,
          principal: true,
          profit: true,
        },
      });
      if (lastBefore) seedRecords = [lastBefore];
    }

    // 출금 데이터 조회 (스냅샷 없는 달의 balance carry-forward 보정용)
    const withdrawalWhere =
      rangeStart && rangeEnd
        ? { accountId, withdrawalDate: { gte: rangeStart, lt: rangeEnd } }
        : { accountId };
    const withdrawals = await this.prisma.accountWithdrawal.findMany({
      where: withdrawalWhere,
      select: {
        accountId: true,
        withdrawalDate: true,
        amount: true,
        type: true,
      },
    });

    return this.aggregateTrend(
      seedRecords,
      records,
      query.period,
      rangeStart,
      withdrawals,
    );
  }

  /**
   * 기간별 통계 집계 헬퍼
   * - 각 기간(월/년)마다 계좌별 마지막 기록을 합산
   * - 기록 없는 기간은 직전 기록값을 carry-forward (빈 달 채우기)
   * - carry-forward 시 해당 기간까지 누적된 출금을 balance에서 차감
   */
  private aggregateTrend(
    seedRecords: {
      accountId: string;
      recordDate: Date;
      balance: unknown;
      principal: unknown;
      profit: unknown;
    }[],
    records: {
      accountId: string;
      recordDate: Date;
      balance: unknown;
      principal: unknown;
      profit: unknown;
    }[],
    period: TrendPeriod,
    rangeStart: Date | null,
    withdrawals: {
      accountId: string;
      withdrawalDate: Date;
      amount: unknown;
      type: WithdrawalType;
    }[] = [],
  ) {
    // 실제 출력할 기간 범위는 records 기준으로 생성
    // rangeStart가 있으면 해당 월부터 시작 보장 (records가 비어도)
    if (records.length === 0 && seedRecords.length === 0) return [];

    const getPeriodKey = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      return period === TrendPeriod.MONTHLY ? `${y}-${m}` : `${y}`;
    };

    // 출력 키 범위: rangeStart가 있으면 그 달부터, 없으면 records 전체 범위
    const allKeys = this.generatePeriodKeys(records, period, rangeStart);
    if (allKeys.length === 0) return [];

    const rawMap = new Map<
      string,
      Map<string, { balance: number; principal: number; profit: number }>
    >();
    for (const key of allKeys) {
      rawMap.set(key, new Map());
    }

    // 실제 기간 내 기록 삽입
    for (const r of records) {
      const key = getPeriodKey(r.recordDate);
      const entry = rawMap.get(key);
      if (entry) {
        entry.set(r.accountId, {
          balance: Number(r.balance),
          principal: Number(r.principal),
          profit: Number(r.profit),
        });
      }
    }

    // 기간별 계좌별 출금 목록 맵 구성
    const withdrawalMap = new Map<
      string,
      Map<string, { amount: number; type: WithdrawalType }[]>
    >();
    for (const w of withdrawals) {
      const key = getPeriodKey(w.withdrawalDate);
      if (!withdrawalMap.has(key)) withdrawalMap.set(key, new Map());
      const periodMap = withdrawalMap.get(key);
      if (!periodMap.has(w.accountId)) periodMap.set(w.accountId, []);
      periodMap
        .get(w.accountId)
        .push({ amount: Number(w.amount), type: w.type });
    }

    // carry-forward 시작값: seed 기록으로 lastKnown 초기화
    const accountIds = [
      ...new Set([
        ...seedRecords.map((r) => r.accountId),
        ...records.map((r) => r.accountId),
      ]),
    ];
    const lastKnown = new Map<
      string,
      { balance: number; principal: number; profit: number }
    >();
    for (const r of seedRecords) {
      lastKnown.set(r.accountId, {
        balance: Number(r.balance),
        principal: Number(r.principal),
        profit: Number(r.profit),
      });
    }

    // carry-forward: 빈 기간에 직전 값 채우기 + 출금 차감
    for (const key of allKeys) {
      const periodEntry = rawMap.get(key);
      const periodWithdrawals = withdrawalMap.get(key);
      for (const accountId of accountIds) {
        if (periodEntry.has(accountId)) {
          // 스냅샷이 있는 달은 스냅샷 값 그대로 (출금은 이미 스냅샷에 반영됨)
          lastKnown.set(accountId, periodEntry.get(accountId));
        } else if (lastKnown.has(accountId)) {
          // 스냅샷 없는 달: 직전 값에서 이번 달 출금 순서대로 적용
          const prev = lastKnown.get(accountId);
          const accountWithdrawals = periodWithdrawals?.get(accountId) ?? [];
          let { balance, principal, profit } = prev;
          for (const w of accountWithdrawals) {
            balance = Math.max(0, balance - w.amount);
            ({ principal, profit } = this.applyWithdrawal(
              principal,
              profit,
              w.amount,
              w.type,
            ));
          }
          const adjusted = { balance, principal, profit };
          lastKnown.set(accountId, adjusted);
          periodEntry.set(accountId, adjusted);
        }
      }
    }

    return allKeys.map((key) => {
      const accountMap = rawMap.get(key);
      let balance = 0;
      let principal = 0;
      let profit = 0;

      for (const v of accountMap.values()) {
        balance += v.balance;
        principal += v.principal;
        profit += v.profit;
      }

      const profitRate =
        principal > 0 ? ((profit / principal) * 100).toFixed(2) : '0.00';

      return {
        period: key,
        balance: balance.toFixed(2),
        principal: principal.toFixed(2),
        profit: profit.toFixed(2),
        profitRate,
      };
    });
  }

  /**
   * 기록의 최솟값~최댓값 범위에서 모든 기간 키 목록 생성
   */
  private generatePeriodKeys(
    records: { recordDate: Date }[],
    period: TrendPeriod,
    rangeStart: Date | null,
  ): string[] {
    if (records.length === 0 && !rangeStart) return [];

    const keys: string[] = [];

    if (period === TrendPeriod.MONTHLY) {
      // 시작: rangeStart가 있으면 그 달, 없으면 records 최솟값
      const startBase =
        rangeStart ??
        new Date(Math.min(...records.map((r) => r.recordDate.getTime())));
      // 끝: rangeStart가 있으면(연도 조회) 현재 달까지, 없으면 records 최댓값
      const now = new Date();
      const endBase = rangeStart
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        : records.length > 0
          ? new Date(Math.max(...records.map((r) => r.recordDate.getTime())))
          : startBase;

      const cur = new Date(
        Date.UTC(startBase.getUTCFullYear(), startBase.getUTCMonth(), 1),
      );
      const end = new Date(
        Date.UTC(endBase.getUTCFullYear(), endBase.getUTCMonth(), 1),
      );
      while (cur <= end) {
        const y = cur.getUTCFullYear();
        const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
        keys.push(`${y}-${m}`);
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
    } else {
      const dates = records.map((r) => r.recordDate.getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const startYear = minDate.getUTCFullYear();
      const endYear = maxDate.getUTCFullYear();
      for (let y = startYear; y <= endYear; y++) {
        keys.push(`${y}`);
      }
    }

    return keys;
  }

  /**
   * 출금 기록 추가 (소유자만)
   * - 출금 금액만큼 출금일 이후 모든 AccountRecord의 principal 재계산
   * - profit = balance - principal 재계산
   */
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

    const withdrawal = await this.prisma.accountWithdrawal.create({
      data: {
        accountId,
        withdrawalDate,
        amount: dto.amount,
        type: dto.type,
        note: dto.note,
      },
    });

    // 출금일 이후 AccountRecord의 principal, profit 재계산
    // 같은 날 스냅샷은 출금 createdAt보다 먼저 생성된 것만 포함 (등록 순서 반영)
    const affectedRecords = await this.prisma.accountRecord.findMany({
      where: {
        accountId,
        OR: [
          { recordDate: { gt: withdrawalDate } },
          {
            recordDate: withdrawalDate,
            createdAt: { lte: withdrawal.createdAt },
          },
        ],
      },
      orderBy: { recordDate: 'asc' },
    });

    await Promise.all(
      affectedRecords.map((record) => {
        const { principal, profit } = this.applyWithdrawal(
          Number(record.principal),
          Number(record.profit),
          dto.amount,
          dto.type,
        );
        return this.prisma.accountRecord.update({
          where: { id: record.id },
          data: { principal, profit },
        });
      }),
    );

    const withdrawalOwner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    const withdrawalLang = withdrawalOwner?.language ?? 'ko';
    const amountFormatted = dto.amount.toLocaleString('ko-KR');
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: this.i18n.t('assets.notification.withdrawal_title', {
        lang: withdrawalLang,
      }),
      body: this.i18n.t('assets.notification.withdrawal_body', {
        lang: withdrawalLang,
        args: { name: account.name, amount: amountFormatted },
      }),
      data: { assetId: accountId },
    });

    return this.formatWithdrawal(withdrawal);
  }

  /**
   * 출금 기록 목록 조회 (그룹 멤버)
   */
  async findWithdrawals(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    await this.validateGroupMember(userId, account.groupId);

    const withdrawals = await this.prisma.accountWithdrawal.findMany({
      where: { accountId },
      orderBy: { withdrawalDate: 'desc' },
    });

    return withdrawals.map((w) => this.formatWithdrawal(w));
  }

  /**
   * 출금 기록 삭제 (소유자만)
   * - 삭제 시 해당 출금일 이후 AccountRecord의 principal 원복
   */
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

    await this.prisma.accountWithdrawal.delete({ where: { id: withdrawalId } });

    // 출금일 이후 AccountRecord의 principal/profit 원복
    // 같은 날 스냅샷은 출금 createdAt보다 먼저 생성된 것만 포함 (등록 순서 반영)
    const affectedRecords = await this.prisma.accountRecord.findMany({
      where: {
        accountId,
        OR: [
          { recordDate: { gt: withdrawal.withdrawalDate } },
          {
            recordDate: withdrawal.withdrawalDate,
            createdAt: { lte: withdrawal.createdAt },
          },
        ],
      },
      orderBy: { recordDate: 'asc' },
    });

    await Promise.all(
      affectedRecords.map((record) => {
        const { principal: restoredPrincipal, profit: restoredProfit } =
          this.reverseWithdrawal(
            Number(record.principal),
            Number(record.profit),
            Number(withdrawal.amount),
            withdrawal.type,
          );
        return this.prisma.accountRecord.update({
          where: { id: record.id },
          data: {
            principal: restoredPrincipal,
            profit: restoredProfit,
          },
        });
      }),
    );

    return {
      message: this.i18n.t('assets.success.withdrawal_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 출금 적용: type에 따라 principal/profit에서 amount 차감
   * PRINCIPAL: 원금 먼저 차감 → 부족하면 수익에서 차감
   * PROFIT: 수익 먼저 차감 → 부족하면 원금에서 차감
   */
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

  /**
   * 출금 원복: balance는 그대로이므로, principal/profit만 역산
   * PRINCIPAL: 원금 복원 → profit = balance - principal
   * PROFIT: 수익 복원 → principal = balance - profit
   */
  private reverseWithdrawal(
    principal: number,
    profit: number,
    amount: number,
    type: WithdrawalType,
  ): { principal: number; profit: number } {
    const balance = principal + profit;
    if (type === WithdrawalType.PRINCIPAL) {
      const restoredPrincipal = principal + amount;
      return {
        principal: restoredPrincipal,
        profit: balance - restoredPrincipal,
      };
    } else {
      const restoredProfit = profit + amount;
      return { principal: balance - restoredProfit, profit: restoredProfit };
    }
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

  private formatRecord(record: {
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
}
