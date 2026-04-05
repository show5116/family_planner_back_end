import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateBudgetDto, BulkUpsertBudgetDto } from './dto/create-budget.dto';
import {
  UpsertBudgetTemplateDto,
  BulkUpsertBudgetTemplateDto,
} from './dto/budget-template.dto';
import {
  UpsertGroupBudgetDto,
  UpsertGroupBudgetTemplateDto,
} from './dto/group-budget.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';

const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  /**
   * 지출 등록 (예산 초과 알림 포함)
   */
  async createExpense(userId: string, dto: CreateExpenseDto) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const expense = await this.prisma.expense.create({
      data: {
        groupId: dto.groupId ?? null,
        userId,
        amount: dto.amount,
        category: dto.category,
        date: new Date(dto.date),
        description: dto.description,
        paymentMethod: dto.paymentMethod,
        isRecurring: dto.isRecurring ?? false,
      },
    });

    // 예산 초과 여부 확인 후 알림 (그룹 지출인 경우만)
    if (dto.groupId) {
      this.checkBudgetExceeded(
        userId,
        dto.groupId,
        dto.date,
        expense.category,
      ).catch(() => null);
    }

    return expense;
  }

  /**
   * 지출 목록 조회
   */
  async findAllExpenses(userId: string, query: ExpenseQueryDto) {
    if (query.groupId) {
      await this.validateGroupMember(userId, query.groupId);
    }

    const where: Record<string, unknown> = query.groupId
      ? { groupId: query.groupId }
      : { groupId: null, userId };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    return await this.prisma.expense.findMany({
      where,
      include: { receipts: true },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * 지출 상세 조회
   */
  async findOneExpense(userId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { receipts: true },
    });

    if (!expense) {
      throw new NotFoundException('지출 내역을 찾을 수 없습니다');
    }

    if (expense.groupId) {
      await this.validateGroupMember(userId, expense.groupId);
    } else if (expense.userId !== userId) {
      throw new ForbiddenException('본인의 지출 내역만 조회할 수 있습니다');
    }

    return expense;
  }

  /**
   * 지출 수정
   */
  async updateExpense(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException('지출 내역을 찾을 수 없습니다');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('본인이 등록한 지출만 수정할 수 있습니다');
    }

    return await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
      },
      include: { receipts: true },
    });
  }

  /**
   * 지출 삭제 (R2 영수증 파일 함께 삭제)
   */
  async removeExpense(userId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { receipts: true },
    });

    if (!expense) {
      throw new NotFoundException('지출 내역을 찾을 수 없습니다');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('본인이 등록한 지출만 삭제할 수 있습니다');
    }

    for (const receipt of expense.receipts) {
      await this.storage.deleteFile(receipt.fileKey).catch(() => null);
    }

    await this.prisma.expense.delete({ where: { id } });

    return { message: '지출 내역이 삭제되었습니다' };
  }

  /**
   * 월별 통계 조회
   */
  async getStatistics(
    userId: string,
    groupId: string | undefined,
    month: string,
  ) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);
    const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

    const expenseWhere = groupId
      ? { groupId, date: { gte: startDate, lt: endDate } }
      : {
          groupId: null,
          userId,
          date: { gte: startDate, lt: endDate },
        };

    const budgetWhere = groupId
      ? { groupId, month: monthDate }
      : { groupId: null, userId, month: monthDate };

    const gid = groupId ?? null;
    const ownerId = groupId ? null : userId;

    const [expenses, budgets, groupBudget] = await Promise.all([
      this.prisma.expense.findMany({ where: expenseWhere }),
      this.prisma.budget.findMany({ where: budgetWhere }),
      this.prisma.groupBudget.findFirst({
        where: { groupId: gid, userId: ownerId, month: monthDate },
      }),
    ]);

    const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));

    // 카테고리별 집계
    const categoryMap = new Map<string, { total: number; count: number }>();

    for (const expense of expenses) {
      const key = expense.category;
      const current = categoryMap.get(key) ?? { total: 0, count: 0 };
      categoryMap.set(key, {
        total: current.total + Number(expense.amount),
        count: current.count + 1,
      });
    }

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const categoryBudgetSum = budgets.reduce(
      (sum, b) => sum + Number(b.amount),
      0,
    );
    const groupBudgetAmount = groupBudget ? Number(groupBudget.amount) : 0;
    const totalBudget = Math.max(categoryBudgetSum, groupBudgetAmount);

    const categories = Array.from(categoryMap.entries()).map(
      ([category, stat]) => {
        const budget = budgetMap.get(category as never);
        const budgetNum = budget ? Number(budget) : null;
        return {
          category,
          total: stat.total.toFixed(2),
          count: stat.count,
          budget: budgetNum !== null ? budgetNum.toFixed(2) : null,
          budgetRatio:
            budgetNum !== null && budgetNum > 0
              ? Math.round((stat.total / budgetNum) * 100)
              : null,
        };
      },
    );

    return {
      month,
      totalExpense: totalExpense.toFixed(2),
      totalBudget: totalBudget.toFixed(2),
      categories,
    };
  }

  /**
   * 연별 지출 통계 조회 (월별 합계)
   */
  async getYearlyStatistics(
    userId: string,
    groupId: string | undefined,
    year: string,
  ) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const yearNum = Number(year);
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    const expenseWhere = groupId
      ? { groupId, date: { gte: startDate, lt: endDate } }
      : {
          groupId: null,
          userId,
          date: { gte: startDate, lt: endDate },
        };

    const expenses = await this.prisma.expense.findMany({
      where: expenseWhere,
    });

    // 월별 집계
    const monthMap = new Map<string, { total: number; count: number }>();

    for (const expense of expenses) {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const current = monthMap.get(key) ?? { total: 0, count: 0 };
      monthMap.set(key, {
        total: current.total + Number(expense.amount),
        count: current.count + 1,
      });
    }

    // 1~12월 전체 채우기
    const months = Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const stat = monthMap.get(key) ?? { total: 0, count: 0 };
      return {
        month: key,
        total: stat.total.toFixed(2),
        count: stat.count,
      };
    });

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      year,
      totalExpense: totalExpense.toFixed(2),
      months,
    };
  }

  /**
   * 영수증 업로드 Presigned URL 발급
   */
  async getReceiptUploadUrl(
    userId: string,
    expenseId: string,
    mimeType: string,
  ) {
    if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        '지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP, PDF)',
      );
    }

    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('지출 내역을 찾을 수 없습니다');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('본인이 등록한 지출만 수정할 수 있습니다');
    }

    const ext = mimeType.split('/')[1] || 'bin';
    const { randomUUID } = await import('crypto');
    const fileKey = `receipts/${randomUUID()}.${ext}`;

    const uploadUrl = await this.storage.getUploadUrl(fileKey, mimeType);

    return { uploadUrl, fileKey };
  }

  /**
   * 영수증 업로드 완료 확인 (DB 등록)
   */
  async confirmReceipt(
    userId: string,
    expenseId: string,
    dto: ConfirmReceiptDto,
  ) {
    if (dto.fileSize > MAX_RECEIPT_SIZE) {
      throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다');
    }

    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('지출 내역을 찾을 수 없습니다');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('본인이 등록한 지출만 수정할 수 있습니다');
    }

    const fileUrl = this.storage.getPublicUrl(dto.fileKey);

    return await this.prisma.expenseReceipt.create({
      data: {
        expenseId,
        fileKey: dto.fileKey,
        fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
      },
    });
  }

  /**
   * 영수증 삭제
   */
  async removeReceipt(userId: string, expenseId: string, receiptId: string) {
    const receipt = await this.prisma.expenseReceipt.findUnique({
      where: { id: receiptId },
      include: { expense: true },
    });

    if (!receipt || receipt.expenseId !== expenseId) {
      throw new NotFoundException('영수증을 찾을 수 없습니다');
    }

    if (receipt.expense.userId !== userId) {
      throw new ForbiddenException(
        '본인이 등록한 지출의 영수증만 삭제할 수 있습니다',
      );
    }

    await this.storage.deleteFile(receipt.fileKey).catch(() => null);
    await this.prisma.expenseReceipt.delete({ where: { id: receiptId } });

    return { message: '영수증이 삭제되었습니다' };
  }

  /**
   * 고정비용 다음 달 복사
   */
  async copyRecurringExpenses(
    userId: string,
    groupId: string | undefined,
    targetMonth: string,
  ) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const [year, monthNum] = targetMonth.split('-').map(Number);
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;

    const prevStart = new Date(prevYear, prevMonth - 1, 1);
    const prevEnd = new Date(prevYear, prevMonth, 1);

    const recurringWhere = groupId
      ? { groupId, isRecurring: true, date: { gte: prevStart, lt: prevEnd } }
      : {
          groupId: null,
          userId,
          isRecurring: true,
          date: { gte: prevStart, lt: prevEnd },
        };

    const recurringExpenses = await this.prisma.expense.findMany({
      where: recurringWhere,
    });

    if (recurringExpenses.length === 0) {
      return { count: 0, expenses: [] };
    }

    const targetDate = new Date(year, monthNum - 1, 1);
    const created = await this.prisma.$transaction(
      recurringExpenses.map((e) =>
        this.prisma.expense.create({
          data: {
            groupId: e.groupId,
            userId: e.userId,
            amount: e.amount,
            category: e.category,
            date: targetDate,
            description: e.description,
            paymentMethod: e.paymentMethod,
            isRecurring: true,
          },
        }),
      ),
    );

    return { count: created.length, expenses: created };
  }

  /**
   * 예산 설정
   */
  async upsertBudget(userId: string, dto: CreateBudgetDto) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const [year, month] = dto.month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    const groupId = dto.groupId ?? null;
    const ownerId = dto.groupId ? null : userId;

    return this.upsertBudgetRecord(
      groupId,
      ownerId,
      dto.category,
      monthDate,
      dto.amount,
    );
  }

  /**
   * 예산 목록 조회
   */
  async findBudgets(
    userId: string,
    groupId: string | undefined,
    month: string,
    category?: string,
  ) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

    const where = groupId
      ? {
          groupId,
          month: monthDate,
          ...(category && { category: category as never }),
        }
      : {
          groupId: null,
          userId,
          month: monthDate,
          ...(category && { category: category as never }),
        };

    return await this.prisma.budget.findMany({
      where,
      orderBy: { category: 'asc' },
    });
  }

  /**
   * 예산 템플릿 설정 (없으면 생성, 있으면 수정)
   * 신규 등록 시 이번 달 예산이 없으면 즉시 적용
   */
  async upsertBudgetTemplate(userId: string, dto: UpsertBudgetTemplateDto) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const groupId = dto.groupId ?? null;
    const ownerId = dto.groupId ? null : userId;

    const existing = await this.prisma.budgetTemplate.findFirst({
      where: { groupId, userId: ownerId, category: dto.category },
    });
    const isNew = !existing;

    const template = await this.upsertBudgetTemplateRecord(
      groupId,
      ownerId,
      dto.category,
      dto.amount,
    );

    // 신규 템플릿이고 이번 달 예산이 없으면 즉시 생성
    if (isNew) {
      const now = new Date();
      const monthDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );

      const existsBudget = await this.prisma.budget.findFirst({
        where: {
          groupId,
          userId: ownerId,
          category: dto.category,
          month: monthDate,
        },
      });

      if (!existsBudget) {
        await this.prisma.budget.create({
          data: {
            groupId,
            userId: ownerId,
            category: dto.category,
            amount: dto.amount,
            month: monthDate,
          },
        });
      }
    }

    return template;
  }

  /**
   * 예산 템플릿 목록 조회
   */
  async findBudgetTemplates(userId: string, groupId?: string) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const where = groupId ? { groupId } : { groupId: null, userId };

    return await this.prisma.budgetTemplate.findMany({
      where,
      orderBy: { category: 'asc' },
    });
  }

  /**
   * 예산 템플릿 삭제
   */
  async removeBudgetTemplate(
    userId: string,
    groupId: string | undefined,
    category: string,
  ) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const ownerId = groupId ? null : userId;
    const gid = groupId ?? null;

    const template = await this.prisma.budgetTemplate.findFirst({
      where: { groupId: gid, userId: ownerId, category: category as never },
    });

    if (!template) {
      throw new NotFoundException('예산 템플릿을 찾을 수 없습니다');
    }

    await this.prisma.budgetTemplate.delete({ where: { id: template.id } });

    return { message: '예산 템플릿이 삭제되었습니다' };
  }

  /**
   * 예산 일괄 설정 (전체 + 카테고리별 한번에)
   */
  async bulkUpsertBudget(userId: string, dto: BulkUpsertBudgetDto) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const [year, month] = dto.month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    const groupId = dto.groupId ?? null;
    const ownerId = dto.groupId ? null : userId;

    const results: { total?: unknown; categories?: unknown[] } = {};

    if (dto.total !== undefined) {
      results.total = await this.upsertGroupBudgetRecord(
        groupId,
        ownerId,
        monthDate,
        dto.total,
      );
    }

    if (dto.categories && dto.categories.length > 0) {
      results.categories = await Promise.all(
        dto.categories.map((item) =>
          this.upsertBudgetRecord(
            groupId,
            ownerId,
            item.category,
            monthDate,
            item.amount,
          ),
        ),
      );
    }

    return results;
  }

  /**
   * 예산 템플릿 일괄 설정 (전체 + 카테고리별 한번에)
   * 신규 항목이고 이번 달 예산이 없으면 즉시 적용
   */
  async bulkUpsertBudgetTemplate(
    userId: string,
    dto: BulkUpsertBudgetTemplateDto,
  ) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const groupId = dto.groupId ?? null;
    const ownerId = dto.groupId ? null : userId;

    const now = new Date();
    const monthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const results: { total?: unknown; categories?: unknown[] } = {};

    if (dto.total !== undefined) {
      const whereKey = groupId ? { groupId } : { userId: ownerId };
      results.total = await this.prisma.groupBudgetTemplate.upsert({
        where: whereKey,
        create: { groupId, userId: ownerId, amount: dto.total },
        update: { amount: dto.total },
      });

      const existingGroupBudget = await this.prisma.groupBudget.findFirst({
        where: { groupId, userId: ownerId, month: monthDate },
      });
      if (!existingGroupBudget) {
        await this.prisma.groupBudget.create({
          data: {
            groupId,
            userId: ownerId,
            amount: dto.total,
            month: monthDate,
          },
        });
      }
    }

    if (dto.categories && dto.categories.length > 0) {
      const categoryResults: unknown[] = [];
      for (const item of dto.categories) {
        const template = await this.upsertBudgetTemplateRecord(
          groupId,
          ownerId,
          item.category,
          item.amount,
        );

        const existingBudget = await this.prisma.budget.findFirst({
          where: {
            groupId,
            userId: ownerId,
            category: item.category,
            month: monthDate,
          },
        });
        if (!existingBudget) {
          await this.prisma.budget.create({
            data: {
              groupId,
              userId: ownerId,
              category: item.category,
              amount: item.amount,
              month: monthDate,
            },
          });
        }

        categoryResults.push(template);
      }
      results.categories = categoryResults;
    }

    return results;
  }

  /**
   * 전체 예산 설정 (월별 수동)
   */
  async upsertGroupBudget(userId: string, dto: UpsertGroupBudgetDto) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const groupId = dto.groupId ?? null;
    const ownerId = dto.groupId ? null : userId;

    const [year, month] = dto.month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    return this.upsertGroupBudgetRecord(
      groupId,
      ownerId,
      monthDate,
      dto.amount,
    );
  }

  /**
   * 전체 예산 조회 (월별)
   */
  async findGroupBudget(
    userId: string,
    groupId: string | undefined,
    month: string,
  ) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const gid = groupId ?? null;
    const ownerId = groupId ? null : userId;

    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

    return this.prisma.groupBudget.findFirst({
      where: { groupId: gid, userId: ownerId, month: monthDate },
    });
  }

  /**
   * 전체 예산 템플릿 설정 (자동 적용)
   * 신규 등록 시 이번 달 전체 예산이 없으면 즉시 적용
   */
  async upsertGroupBudgetTemplate(
    userId: string,
    dto: UpsertGroupBudgetTemplateDto,
  ) {
    if (dto.groupId) {
      await this.validateGroupMember(userId, dto.groupId);
    }

    const groupId = dto.groupId ?? null;
    const ownerId = dto.groupId ? null : userId;

    const whereKey = groupId ? { groupId } : { userId: ownerId };

    const isNew = !(await this.prisma.groupBudgetTemplate.findUnique({
      where: whereKey,
    }));

    const template = await this.prisma.groupBudgetTemplate.upsert({
      where: whereKey,
      create: { groupId, userId: ownerId, amount: dto.amount },
      update: { amount: dto.amount },
    });

    if (isNew) {
      const now = new Date();
      const monthDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );

      const exists = await this.prisma.groupBudget.findFirst({
        where: { groupId, userId: ownerId, month: monthDate },
      });

      if (!exists) {
        await this.prisma.groupBudget.create({
          data: {
            groupId,
            userId: ownerId,
            amount: dto.amount,
            month: monthDate,
          },
        });
      }
    }

    return template;
  }

  /**
   * 전체 예산 템플릿 조회
   */
  async findGroupBudgetTemplate(userId: string, groupId?: string) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const whereKey = groupId ? { groupId } : { userId };

    return await this.prisma.groupBudgetTemplate.findUnique({
      where: whereKey,
    });
  }

  /**
   * 전체 예산 템플릿 삭제
   */
  async removeGroupBudgetTemplate(userId: string, groupId?: string) {
    if (groupId) {
      await this.validateGroupMember(userId, groupId);
    }

    const whereKey = groupId ? { groupId } : { userId };

    const template = await this.prisma.groupBudgetTemplate.findUnique({
      where: whereKey,
    });

    if (!template) {
      throw new NotFoundException('전체 예산 템플릿을 찾을 수 없습니다');
    }

    await this.prisma.groupBudgetTemplate.delete({ where: whereKey });

    return { message: '전체 예산 템플릿이 삭제되었습니다' };
  }

  /**
   * 예산 초과 여부 확인 후 그룹 멤버에게 알림 발송
   */
  private async checkBudgetExceeded(
    userId: string,
    groupId: string,
    dateStr: string,
    category: string,
  ) {
    const d = new Date(dateStr);
    const startDate = new Date(d.getFullYear(), d.getMonth(), 1);
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const budget = await this.prisma.budget.findFirst({
      where: {
        groupId,
        userId: null,
        category: category as never,
        month: startDate,
      },
    });
    if (!budget) return;

    const result = await this.prisma.expense.aggregate({
      where: {
        groupId,
        category: category as never,
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    });

    const totalSpent = Number(result._sum.amount ?? 0);
    const budgetAmount = Number(budget.amount);

    if (totalSpent <= budgetAmount) return;

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const categoryLabel: Record<string, string> = {
      TRANSPORTATION: '교통비',
      FOOD: '식비',
      LEISURE: '여가비',
      LIVING: '생활비',
      MEDICAL: '의료비',
      EDUCATION: '교육비',
      OTHER: '기타',
    };
    const label = categoryLabel[category] ?? category;

    for (const member of members) {
      await this.notificationQueue.enqueueImmediate({
        userId: member.userId,
        category: NotificationCategory.HOUSEHOLD,
        title: '예산 초과 알림',
        body: `${label} 예산을 초과했습니다. (지출 ${totalSpent.toLocaleString()}원 / 예산 ${budgetAmount.toLocaleString()}원)`,
        data: { groupId, category },
      });
    }

    void userId; // unused param (멤버 검증은 상위에서 완료)
  }

  /**
   * Budget upsert — nullable composite key 때문에 findFirst + create/update 사용
   */
  private async upsertBudgetRecord(
    groupId: string | null,
    userId: string | null,
    category: string,
    month: Date,
    amount: number,
  ) {
    const existing = await this.prisma.budget.findFirst({
      where: { groupId, userId, category: category as never, month },
    });

    if (existing) {
      return this.prisma.budget.update({
        where: { id: existing.id },
        data: { amount },
      });
    }

    return this.prisma.budget.create({
      data: { groupId, userId, category: category as never, amount, month },
    });
  }

  /**
   * BudgetTemplate upsert — nullable composite key 때문에 findFirst + create/update 사용
   */
  private async upsertBudgetTemplateRecord(
    groupId: string | null,
    userId: string | null,
    category: string,
    amount: number,
  ) {
    const existing = await this.prisma.budgetTemplate.findFirst({
      where: { groupId, userId, category: category as never },
    });

    if (existing) {
      return this.prisma.budgetTemplate.update({
        where: { id: existing.id },
        data: { amount },
      });
    }

    return this.prisma.budgetTemplate.create({
      data: { groupId, userId, category: category as never, amount },
    });
  }

  /**
   * GroupBudget upsert — nullable composite key 때문에 findFirst + create/update 사용
   */
  private async upsertGroupBudgetRecord(
    groupId: string | null,
    userId: string | null,
    month: Date,
    amount: number,
  ) {
    const existing = await this.prisma.groupBudget.findFirst({
      where: { groupId, userId, month },
    });

    if (existing) {
      return this.prisma.groupBudget.update({
        where: { id: existing.id },
        data: { amount },
      });
    }

    return this.prisma.groupBudget.create({
      data: { groupId, userId, amount, month },
    });
  }

  /**
   * 그룹 멤버 여부 확인
   */
  private async validateGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('해당 그룹의 멤버가 아닙니다');
    }
  }
}
