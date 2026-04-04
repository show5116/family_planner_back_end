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
    await this.validateGroupMember(userId, dto.groupId);

    const expense = await this.prisma.expense.create({
      data: {
        groupId: dto.groupId,
        userId,
        amount: dto.amount,
        category: dto.category,
        date: new Date(dto.date),
        description: dto.description,
        paymentMethod: dto.paymentMethod,
        isRecurring: dto.isRecurring ?? false,
      },
    });

    // 예산 초과 여부 확인 후 알림 (비동기, 실패해도 등록은 완료)
    this.checkBudgetExceeded(
      userId,
      dto.groupId,
      dto.date,
      expense.category,
    ).catch(() => null);

    return expense;
  }

  /**
   * 지출 목록 조회
   */
  async findAllExpenses(userId: string, query: ExpenseQueryDto) {
    await this.validateGroupMember(userId, query.groupId);

    const where: Record<string, unknown> = { groupId: query.groupId };

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

    await this.validateGroupMember(userId, expense.groupId);

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
  async getStatistics(userId: string, groupId: string, month: string) {
    await this.validateGroupMember(userId, groupId);

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);
    const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

    const [expenses, budgets, groupBudget] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          groupId,
          date: { gte: startDate, lt: endDate },
        },
      }),
      this.prisma.budget.findMany({
        where: {
          groupId,
          month: monthDate,
        },
      }),
      this.prisma.groupBudget.findUnique({
        where: { groupId_month: { groupId, month: monthDate } },
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
  async getYearlyStatistics(userId: string, groupId: string, year: string) {
    await this.validateGroupMember(userId, groupId);

    const yearNum = Number(year);
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId,
        date: { gte: startDate, lt: endDate },
      },
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
    groupId: string,
    targetMonth: string,
  ) {
    await this.validateGroupMember(userId, groupId);

    const [year, monthNum] = targetMonth.split('-').map(Number);
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;

    const prevStart = new Date(prevYear, prevMonth - 1, 1);
    const prevEnd = new Date(prevYear, prevMonth, 1);

    const recurringExpenses = await this.prisma.expense.findMany({
      where: {
        groupId,
        isRecurring: true,
        date: { gte: prevStart, lt: prevEnd },
      },
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
    await this.validateGroupMember(userId, dto.groupId);

    const [year, month] = dto.month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    return await this.prisma.budget.upsert({
      where: {
        groupId_category_month: {
          groupId: dto.groupId,
          category: dto.category,
          month: monthDate,
        },
      },
      create: {
        groupId: dto.groupId,
        category: dto.category,
        amount: dto.amount,
        month: monthDate,
      },
      update: {
        amount: dto.amount,
      },
    });
  }

  /**
   * 예산 목록 조회
   */
  async findBudgets(
    userId: string,
    groupId: string,
    month: string,
    category?: string,
  ) {
    await this.validateGroupMember(userId, groupId);

    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

    return await this.prisma.budget.findMany({
      where: {
        groupId,
        month: monthDate,
        ...(category && { category: category as never }),
      },
      orderBy: { category: 'asc' },
    });
  }

  /**
   * 예산 템플릿 설정 (없으면 생성, 있으면 수정)
   * 신규 등록 시 이번 달 예산이 없으면 즉시 적용
   */
  async upsertBudgetTemplate(userId: string, dto: UpsertBudgetTemplateDto) {
    await this.validateGroupMember(userId, dto.groupId);

    const isNew = !(await this.prisma.budgetTemplate.findUnique({
      where: {
        groupId_category: { groupId: dto.groupId, category: dto.category },
      },
    }));

    const template = await this.prisma.budgetTemplate.upsert({
      where: {
        groupId_category: {
          groupId: dto.groupId,
          category: dto.category,
        },
      },
      create: {
        groupId: dto.groupId,
        category: dto.category,
        amount: dto.amount,
      },
      update: {
        amount: dto.amount,
      },
    });

    // 신규 템플릿이고 이번 달 예산이 없으면 즉시 생성
    if (isNew) {
      const now = new Date();
      const monthDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const exists = await this.prisma.budget.findUnique({
        where: {
          groupId_category_month: {
            groupId: dto.groupId,
            category: dto.category,
            month: monthDate,
          },
        },
      });

      if (!exists) {
        await this.prisma.budget.create({
          data: {
            groupId: dto.groupId,
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
  async findBudgetTemplates(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    return await this.prisma.budgetTemplate.findMany({
      where: { groupId },
      orderBy: { category: 'asc' },
    });
  }

  /**
   * 예산 템플릿 삭제
   */
  async removeBudgetTemplate(
    userId: string,
    groupId: string,
    category: string,
  ) {
    await this.validateGroupMember(userId, groupId);

    const template = await this.prisma.budgetTemplate.findUnique({
      where: {
        groupId_category: {
          groupId,
          category: category as never,
        },
      },
    });

    if (!template) {
      throw new NotFoundException('예산 템플릿을 찾을 수 없습니다');
    }

    await this.prisma.budgetTemplate.delete({
      where: {
        groupId_category: {
          groupId,
          category: category as never,
        },
      },
    });

    return { message: '예산 템플릿이 삭제되었습니다' };
  }

  /**
   * 예산 일괄 설정 (전체 + 카테고리별 한번에)
   */
  async bulkUpsertBudget(userId: string, dto: BulkUpsertBudgetDto) {
    await this.validateGroupMember(userId, dto.groupId);

    const [year, month] = dto.month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    const results: { total?: unknown; categories?: unknown[] } = {};

    if (dto.total !== undefined) {
      results.total = await this.prisma.groupBudget.upsert({
        where: { groupId_month: { groupId: dto.groupId, month: monthDate } },
        create: { groupId: dto.groupId, amount: dto.total, month: monthDate },
        update: { amount: dto.total },
      });
    }

    if (dto.categories && dto.categories.length > 0) {
      results.categories = await Promise.all(
        dto.categories.map((item) =>
          this.prisma.budget.upsert({
            where: {
              groupId_category_month: {
                groupId: dto.groupId,
                category: item.category,
                month: monthDate,
              },
            },
            create: {
              groupId: dto.groupId,
              category: item.category,
              amount: item.amount,
              month: monthDate,
            },
            update: { amount: item.amount },
          }),
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
    await this.validateGroupMember(userId, dto.groupId);

    const now = new Date();
    const monthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const results: { total?: unknown; categories?: unknown[] } = {};

    if (dto.total !== undefined) {
      results.total = await this.prisma.groupBudgetTemplate.upsert({
        where: { groupId: dto.groupId },
        create: { groupId: dto.groupId, amount: dto.total },
        update: { amount: dto.total },
      });

      const existingGroupBudget = await this.prisma.groupBudget.findUnique({
        where: { groupId_month: { groupId: dto.groupId, month: monthDate } },
      });
      if (!existingGroupBudget) {
        await this.prisma.groupBudget.create({
          data: { groupId: dto.groupId, amount: dto.total, month: monthDate },
        });
      }
    }

    if (dto.categories && dto.categories.length > 0) {
      const categoryResults: unknown[] = [];
      for (const item of dto.categories) {
        const template = await this.prisma.budgetTemplate.upsert({
          where: {
            groupId_category: {
              groupId: dto.groupId,
              category: item.category,
            },
          },
          create: {
            groupId: dto.groupId,
            category: item.category,
            amount: item.amount,
          },
          update: { amount: item.amount },
        });

        const existingBudget = await this.prisma.budget.findUnique({
          where: {
            groupId_category_month: {
              groupId: dto.groupId,
              category: item.category,
              month: monthDate,
            },
          },
        });
        if (!existingBudget) {
          await this.prisma.budget.create({
            data: {
              groupId: dto.groupId,
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
   * 그룹 전체 예산 설정 (월별 수동)
   */
  async upsertGroupBudget(userId: string, dto: UpsertGroupBudgetDto) {
    await this.validateGroupMember(userId, dto.groupId);

    const [year, month] = dto.month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    return await this.prisma.groupBudget.upsert({
      where: {
        groupId_month: {
          groupId: dto.groupId,
          month: monthDate,
        },
      },
      create: {
        groupId: dto.groupId,
        amount: dto.amount,
        month: monthDate,
      },
      update: {
        amount: dto.amount,
      },
    });
  }

  /**
   * 그룹 전체 예산 조회 (월별)
   */
  async findGroupBudget(userId: string, groupId: string, month: string) {
    await this.validateGroupMember(userId, groupId);

    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

    return await this.prisma.groupBudget.findUnique({
      where: { groupId_month: { groupId, month: monthDate } },
    });
  }

  /**
   * 그룹 전체 예산 템플릿 설정 (자동 적용)
   * 신규 등록 시 이번 달 전체 예산이 없으면 즉시 적용
   */
  async upsertGroupBudgetTemplate(
    userId: string,
    dto: UpsertGroupBudgetTemplateDto,
  ) {
    await this.validateGroupMember(userId, dto.groupId);

    const isNew = !(await this.prisma.groupBudgetTemplate.findUnique({
      where: { groupId: dto.groupId },
    }));

    const template = await this.prisma.groupBudgetTemplate.upsert({
      where: { groupId: dto.groupId },
      create: {
        groupId: dto.groupId,
        amount: dto.amount,
      },
      update: {
        amount: dto.amount,
      },
    });

    // 신규 템플릿이고 이번 달 전체 예산이 없으면 즉시 생성
    if (isNew) {
      const now = new Date();
      const monthDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const exists = await this.prisma.groupBudget.findUnique({
        where: { groupId_month: { groupId: dto.groupId, month: monthDate } },
      });

      if (!exists) {
        await this.prisma.groupBudget.create({
          data: {
            groupId: dto.groupId,
            amount: dto.amount,
            month: monthDate,
          },
        });
      }
    }

    return template;
  }

  /**
   * 그룹 전체 예산 템플릿 조회
   */
  async findGroupBudgetTemplate(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    return await this.prisma.groupBudgetTemplate.findUnique({
      where: { groupId },
    });
  }

  /**
   * 그룹 전체 예산 템플릿 삭제
   */
  async removeGroupBudgetTemplate(userId: string, groupId: string) {
    await this.validateGroupMember(userId, groupId);

    const template = await this.prisma.groupBudgetTemplate.findUnique({
      where: { groupId },
    });

    if (!template) {
      throw new NotFoundException('전체 예산 템플릿을 찾을 수 없습니다');
    }

    await this.prisma.groupBudgetTemplate.delete({ where: { groupId } });

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

    const budget = await this.prisma.budget.findUnique({
      where: {
        groupId_category_month: {
          groupId,
          category: category as never,
          month: startDate,
        },
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
