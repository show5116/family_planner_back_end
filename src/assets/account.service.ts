import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountQueryDto } from './dto/account-query.dto';
import { ReorderAccountsDto } from './dto/reorder-accounts.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly i18n: I18nService,
  ) {}

  async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('assets.errors.not_member');
    }
  }

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

    const members = await this.prisma.groupMember.findMany({
      where: { groupId: dto.groupId },
      select: { userId: true, user: { select: { language: true } } },
    });

    await Promise.allSettled(
      members
        .filter((m) => m.userId !== userId)
        .map((m) => {
          const lang = m.user.language ?? 'ko';
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

  async findAllAccounts(userId: string, query: AccountQueryDto) {
    await this.validateGroupMember(userId, query.groupId);

    const accounts = await this.prisma.account.findMany({
      where: {
        groupId: query.groupId,
        ...(query.userId && { userId: query.userId }),
      },
      include: {
        records: {
          orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return accounts.map((account) =>
      this.formatAccount(account, account.records[0] ?? null),
    );
  }

  async findOneAccount(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('assets.errors.account_not_found');
    }

    await this.validateGroupMember(userId, account.groupId);
    return this.formatAccount(account, account.records[0] ?? null);
  }

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
          orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
    });

    return this.formatAccount(updated, updated.records[0] ?? null);
  }

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

  private maskAccountNumber(accountNumber: string | null): string | null {
    if (!accountNumber) return null;
    const digits = accountNumber.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    const visible = digits.slice(-4);
    const masked = '*'.repeat(digits.length - 4);
    return `${masked}${visible}`;
  }

  formatAccount(
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
}
