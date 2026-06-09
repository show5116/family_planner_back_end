import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class HouseholdScheduler {
  private readonly logger = new Logger(HouseholdScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매일 00:05에 실행.
   * RecurringExpense 테이블의 활성 고정지출 중 dayOfMonth가 오늘인 항목을 Expense로 생성한다.
   * - dayOfMonth가 이번 달에 없으면(예: 2월에 31일) 말일로 clamp
   * - 이미 오늘 날짜로 동일 recurringExpenseId의 Expense가 있으면 skip
   */
  @Cron('5 0 * * *')
  async autoGenerateRecurringExpenses() {
    if (!isSchedulerEnabled('')) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth(); // 0-based
    const todayDay = today.getDate();
    const lastDayOfMonth = new Date(thisYear, thisMonth + 1, 0).getDate();

    this.logger.log(
      `고정비용 자동 생성 실행 — 기준일: ${today.toISOString().slice(0, 10)}`,
    );

    const recurringList = await this.prisma.recurringExpense.findMany({
      where: { isActive: true },
    });

    if (recurringList.length === 0) return;

    const toCreate: (typeof recurringList)[0][] = [];

    for (const rec of recurringList) {
      const targetDay = Math.min(rec.dayOfMonth, lastDayOfMonth);

      if (targetDay !== todayDay) continue;

      const targetDate = new Date(thisYear, thisMonth, targetDay);

      const exists = await this.prisma.expense.findFirst({
        where: {
          recurringExpenseId: rec.id,
          date: targetDate,
        },
      });

      if (!exists) {
        toCreate.push(rec);
      }
    }

    if (toCreate.length === 0) {
      this.logger.log('오늘 생성할 고정비용 없음');
      return;
    }

    const targetDate = new Date(thisYear, thisMonth, todayDay);

    await this.prisma.$transaction(
      toCreate.map((rec) => {
        return this.prisma.expense.create({
          data: {
            groupId: rec.groupId,
            userId: rec.userId,
            type: rec.type,
            amount: rec.amount,
            category: rec.category,
            date: targetDate,
            description: rec.description,
            paymentMethod: rec.paymentMethod,
            merchantId: rec.merchantId,
            incomeCategory: rec.incomeCategory,
            recurringExpenseId: rec.id,
            isConfirmed: !rec.isVariable,
          },
        });
      }),
    );

    this.logger.log(`고정비용 ${toCreate.length}건 자동 생성 완료`);
  }

  /**
   * 매월 1일 00:10에 실행.
   * BudgetTemplate에 등록된 그룹별 카테고리 예산을 이번 달 Budget으로 자동 생성한다.
   * - 이미 해당 월에 Budget이 존재하면 skip (수동 설정 우선)
   */
  @Cron('10 0 1 * *')
  async autoGenerateBudgetsFromTemplates() {
    if (!isSchedulerEnabled('')) return;
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-based
    const monthDate = new Date(Date.UTC(year, month, 1));

    this.logger.log(
      `예산 자동 생성 실행 — 기준월: ${year}-${String(month + 1).padStart(2, '0')}`,
    );

    const templates = await this.prisma.budgetTemplate.findMany();

    if (templates.length === 0) {
      this.logger.log('등록된 예산 템플릿 없음');
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      const exists = await this.prisma.budget.findUnique({
        where: {
          groupId_userId_category_month: {
            groupId: template.groupId,
            userId: template.userId,
            category: template.category,
            month: monthDate,
          },
        },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await this.prisma.budget.create({
        data: {
          groupId: template.groupId,
          userId: template.userId,
          category: template.category,
          amount: template.amount,
          month: monthDate,
        },
      });
      created++;
    }

    this.logger.log(
      `예산 자동 생성 완료 — 생성: ${created}건, 건너뜀: ${skipped}건`,
    );

    await this.autoGenerateGroupBudgetsFromTemplates(
      monthDate,
      `${year}-${String(month + 1).padStart(2, '0')}`,
    );
  }

  /**
   * 매월 1일 00:10에 함께 실행.
   * GroupBudgetTemplate에 등록된 그룹별 전체 예산을 이번 달 GroupBudget으로 자동 생성한다.
   * - 이미 해당 월에 GroupBudget이 존재하면 skip (수동 설정 우선)
   */
  private async autoGenerateGroupBudgetsFromTemplates(
    monthDate: Date,
    label: string,
  ) {
    const templates = await this.prisma.groupBudgetTemplate.findMany();

    if (templates.length === 0) return;

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      const exists = await this.prisma.groupBudget.findUnique({
        where: {
          groupId_userId_month: {
            groupId: template.groupId,
            userId: template.userId,
            month: monthDate,
          },
        },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await this.prisma.groupBudget.create({
        data: {
          groupId: template.groupId,
          userId: template.userId,
          amount: template.amount,
          month: monthDate,
        },
      });
      created++;
    }

    this.logger.log(
      `전체 예산 자동 생성 완료 (${label}) — 생성: ${created}건, 건너뜀: ${skipped}건`,
    );
  }
}
