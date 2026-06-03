import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AccountTrendQueryDto,
  TrendPeriod,
  TrendQueryDto,
} from './dto/assets-query.dto';
import { AccountService } from './account.service';

type TrendRecord = {
  accountId: string;
  recordDate: Date;
  balance: unknown;
  principal: unknown;
  profit: unknown;
};

@Injectable()
export class AssetsStatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
  ) {}

  async getStatistics(userId: string, groupId: string, accountIds?: string[]) {
    await this.accountService.validateGroupMember(userId, groupId);

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
          orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
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

    const byType = Array.from(typeMap.entries()).map(([type, stat]) => ({
      type,
      balance: stat.balance.toFixed(2),
      count: stat.count,
    }));

    const filteredAccountIds = accounts.map((a) => a.id);
    const holdingMap = new Map<
      string,
      { name: string; ticker: string | null; estimatedAmount: number }
    >();

    if (filteredAccountIds.length > 0) {
      const latestDates = await this.prisma.accountHoldingRecord.groupBy({
        by: ['accountId', 'name'],
        where: { accountId: { in: filteredAccountIds } },
        _max: { recordDate: true },
      });

      const targets = latestDates.filter((d) => d._max.recordDate);

      if (targets.length > 0) {
        const holdingRecords = await this.prisma.accountHoldingRecord.findMany({
          where: {
            OR: targets.map((t) => ({
              accountId: t.accountId,
              name: t.name,
              recordDate: t._max.recordDate,
            })),
          },
          select: { name: true, ticker: true, amount: true },
        });

        for (const record of holdingRecords) {
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

  async getGroupTrend(userId: string, query: TrendQueryDto) {
    await this.accountService.validateGroupMember(userId, query.groupId);

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

    const { rangeStart, rangeEnd } = this.getTrendRange(
      query.period,
      query.year,
    );

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

    return this.aggregateTrend(seedRecords, records, query.period, rangeStart);
  }

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
    await this.accountService.validateGroupMember(userId, account.groupId);

    const { rangeStart, rangeEnd } = this.getTrendRange(
      query.period,
      query.year,
    );

    const where =
      rangeStart && rangeEnd
        ? { accountId, recordDate: { gte: rangeStart, lt: rangeEnd } }
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

    return this.aggregateTrend(seedRecords, records, query.period, rangeStart);
  }

  private getTrendRange(period: TrendPeriod, year?: string) {
    if (period !== TrendPeriod.MONTHLY)
      return { rangeStart: null, rangeEnd: null };
    return {
      rangeStart: new Date(`${year}-01-01`),
      rangeEnd: new Date(`${Number(year) + 1}-01-01`),
    };
  }

  private aggregateTrend(
    seedRecords: TrendRecord[],
    records: TrendRecord[],
    period: TrendPeriod,
    rangeStart: Date | null,
  ) {
    if (records.length === 0 && seedRecords.length === 0) return [];

    const getPeriodKey = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      return period === TrendPeriod.MONTHLY ? `${y}-${m}` : `${y}`;
    };

    const allKeys = this.generatePeriodKeys(records, period, rangeStart);
    if (allKeys.length === 0) return [];

    const rawMap = new Map<
      string,
      Map<string, { balance: number; principal: number; profit: number }>
    >();
    for (const key of allKeys) rawMap.set(key, new Map());

    for (const r of records) {
      const key = getPeriodKey(r.recordDate);
      rawMap.get(key)?.set(r.accountId, {
        balance: Number(r.balance),
        principal: Number(r.principal),
        profit: Number(r.profit),
      });
    }

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

    for (const key of allKeys) {
      const periodEntry = rawMap.get(key);
      for (const accountId of accountIds) {
        if (periodEntry.has(accountId)) {
          lastKnown.set(accountId, periodEntry.get(accountId));
        } else if (lastKnown.has(accountId)) {
          periodEntry.set(accountId, lastKnown.get(accountId));
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

      return {
        period: key,
        balance: balance.toFixed(2),
        principal: principal.toFixed(2),
        profit: profit.toFixed(2),
        profitRate:
          principal > 0 ? ((profit / principal) * 100).toFixed(2) : '0.00',
      };
    });
  }

  private generatePeriodKeys(
    records: { recordDate: Date }[],
    period: TrendPeriod,
    rangeStart: Date | null,
  ): string[] {
    if (records.length === 0 && !rangeStart) return [];

    const keys: string[] = [];

    if (period === TrendPeriod.MONTHLY) {
      const startBase =
        rangeStart ??
        new Date(Math.min(...records.map((r) => r.recordDate.getTime())));
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
        keys.push(
          `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`,
        );
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
    } else {
      const dates = records.map((r) => r.recordDate.getTime());
      const startYear = new Date(Math.min(...dates)).getUTCFullYear();
      const endYear = new Date(Math.max(...dates)).getUTCFullYear();
      for (let y = startYear; y <= endYear; y++) keys.push(`${y}`);
    }

    return keys;
  }
}
