import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAccountHoldingRecordDto } from './dto/create-account-holding-record.dto';
import { UpdateAccountHoldingRecordDto } from './dto/update-account-holding-record.dto';
import { AccountService } from './account.service';

@Injectable()
export class HoldingRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly accountService: AccountService,
  ) {}

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
    await this.accountService.validateGroupMember(userId, account.groupId);

    const whereDate = recordDate ? new Date(recordDate) : undefined;

    const [records, accountRecord] = await Promise.all([
      this.prisma.accountHoldingRecord.findMany({
        where: { accountId, ...(whereDate && { recordDate: whereDate }) },
        orderBy: [{ recordDate: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.accountRecord.findFirst({
        where: { accountId, ...(whereDate && { recordDate: whereDate }) },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
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

  async findHoldingNames(userId: string, groupId: string) {
    await this.accountService.validateGroupMember(userId, groupId);

    return this.prisma.accountHoldingRecord.findMany({
      where: { account: { groupId } },
      select: { name: true, ticker: true },
      distinct: ['name', 'ticker'],
      orderBy: { name: 'asc' },
    });
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
}
