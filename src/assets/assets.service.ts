import {
  ConflictException,
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
import {
  CreateAccountRecordDto,
  RecordInputMode,
} from './dto/create-account-record.dto';
import { CreateAccountWithdrawalDto } from './dto/create-account-withdrawal.dto';
import { AccountQueryDto } from './dto/account-query.dto';
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
            data: { assetId: account.id },
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

    const recordDate = new Date(dto.recordDate);

    const duplicate = await this.prisma.accountRecord.findUnique({
      where: { accountId_recordDate: { accountId, recordDate } },
    });

    if (duplicate) {
      throw new ConflictException('해당 날짜에 이미 기록이 존재합니다');
    }

    let balance: number;
    let principal: number;
    let profit: number;

    if (dto.inputMode === RecordInputMode.AUTO) {
      const prevRecord = await this.prisma.accountRecord.findFirst({
        where: { accountId, recordDate: { lt: recordDate } },
        orderBy: { recordDate: 'desc' },
      });

      const prevPrincipal = prevRecord ? Number(prevRecord.principal) : 0;
      balance = dto.currentBalance ?? 0;
      principal = prevPrincipal + (dto.additionalPrincipal ?? 0);
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
        note: dto.note,
      },
    });

    // 계좌 소유자에게 잔액 기록 알림
    const balanceFormatted = balance.toLocaleString('ko-KR');
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: '자산 잔액 업데이트',
      body: `"${account.name}" 잔액이 ${balanceFormatted}원으로 기록되었습니다`,
      data: { assetId: accountId },
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
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('본인의 계좌 기록만 삭제할 수 있습니다');
    }

    const record = await this.prisma.accountRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.accountId !== accountId) {
      throw new NotFoundException('기록을 찾을 수 없습니다');
    }

    await this.prisma.accountRecord.delete({ where: { id: recordId } });

    return { message: '기록이 삭제되었습니다' };
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

    return this.aggregateTrend(seedRecords, records, query.period, rangeStart);
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
      throw new NotFoundException('계좌를 찾을 수 없습니다');
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

    return this.aggregateTrend(seedRecords, records, query.period, rangeStart);
  }

  /**
   * 기간별 통계 집계 헬퍼
   * - 각 기간(월/년)마다 계좌별 마지막 기록을 합산
   * - 기록 없는 기간은 직전 기록값을 carry-forward (빈 달 채우기)
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

    // carry-forward: 빈 기간에 직전 값 채우기
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
      // 끝: records 최댓값 (없으면 rangeStart 달)
      const endBase =
        records.length > 0
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
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException(
        '본인의 계좌에만 출금 기록을 추가할 수 있습니다',
      );
    }

    const withdrawalDate = new Date(dto.withdrawalDate);

    const withdrawal = await this.prisma.accountWithdrawal.create({
      data: {
        accountId,
        withdrawalDate,
        amount: dto.amount,
        note: dto.note,
      },
    });

    // 출금일 이후(당일 포함) AccountRecord의 principal, profit 재계산
    const affectedRecords = await this.prisma.accountRecord.findMany({
      where: { accountId, recordDate: { gte: withdrawalDate } },
      orderBy: { recordDate: 'asc' },
    });

    await Promise.all(
      affectedRecords.map((record) => {
        const newPrincipal = Math.max(0, Number(record.principal) - dto.amount);
        const newProfit = Number(record.balance) - newPrincipal;
        return this.prisma.accountRecord.update({
          where: { id: record.id },
          data: { principal: newPrincipal, profit: newProfit },
        });
      }),
    );

    const amountFormatted = dto.amount.toLocaleString('ko-KR');
    await this.notificationService.sendNotification({
      userId,
      category: NotificationCategory.ASSET,
      title: '출금 기록 추가',
      body: `"${account.name}"에서 ${amountFormatted}원이 출금되었습니다`,
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
      throw new NotFoundException('계좌를 찾을 수 없습니다');
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
      throw new NotFoundException('계좌를 찾을 수 없습니다');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException(
        '본인의 계좌 출금 기록만 삭제할 수 있습니다',
      );
    }

    const withdrawal = await this.prisma.accountWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.accountId !== accountId) {
      throw new NotFoundException('출금 기록을 찾을 수 없습니다');
    }

    await this.prisma.accountWithdrawal.delete({ where: { id: withdrawalId } });

    // 출금일 이후 AccountRecord의 principal 원복
    const affectedRecords = await this.prisma.accountRecord.findMany({
      where: {
        accountId,
        recordDate: { gte: withdrawal.withdrawalDate },
      },
      orderBy: { recordDate: 'asc' },
    });

    await Promise.all(
      affectedRecords.map((record) => {
        const restoredPrincipal =
          Number(record.principal) + Number(withdrawal.amount);
        const restoredProfit = Number(record.balance) - restoredPrincipal;
        return this.prisma.accountRecord.update({
          where: { id: record.id },
          data: {
            principal: restoredPrincipal,
            profit: restoredProfit,
          },
        });
      }),
    );

    return { message: '출금 기록이 삭제되었습니다' };
  }

  private formatWithdrawal(withdrawal: {
    id: string;
    accountId: string;
    withdrawalDate: Date;
    amount: unknown;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      id: withdrawal.id,
      accountId: withdrawal.accountId,
      withdrawalDate: withdrawal.withdrawalDate,
      amount: Number(withdrawal.amount).toFixed(2),
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
      note: record.note,
      createdAt: record.createdAt,
    };
  }
}
