import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class HouseholdScheduler {
  private readonly logger = new Logger(HouseholdScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매일 00:05에 실행.
   * 이전 달 고정비용(isRecurring=true) 중 원본 날짜의 day를 이번 달로 옮긴 날짜가
   * 오늘인 항목을 자동 복사한다.
   * - 이번 달에 해당 day가 없으면(예: 2월에 31일) 말일로 clamp
   * - 같은 달에 이미 복사된 항목은 skip
   */
  @Cron('5 0 * * *')
  async autoGenerateRecurringExpenses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth(); // 0-based
    const todayDay = today.getDate();

    // 이번 달 말일
    const lastDayOfMonth = new Date(thisYear, thisMonth + 1, 0).getDate();

    // 이전 달 범위
    const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);
    const prevMonthStart = new Date(thisYear, thisMonth - 1, 1);
    const prevMonthEnd = new Date(thisYear, thisMonth, 1);

    this.logger.log(
      `고정비용 자동 생성 실행 — 기준일: ${today.toISOString().slice(0, 10)}`,
    );

    // 이전 달 고정비용 전체 조회
    const recurringExpenses = await this.prisma.expense.findMany({
      where: {
        isRecurring: true,
        date: { gte: prevMonthStart, lt: prevMonthEnd },
      },
    });

    if (recurringExpenses.length === 0) return;

    const toCreate: typeof recurringExpenses = [];

    for (const expense of recurringExpenses) {
      const originalDay = expense.date.getDate();

      // 원본 day를 이번 달로 옮길 때 말일로 clamp
      const targetDay = Math.min(originalDay, lastDayOfMonth);
      const targetDate = new Date(thisYear, thisMonth, targetDay);

      // 오늘 실행 차례가 아닌 항목은 skip
      if (targetDate.getTime() !== today.getTime()) continue;

      // 중복 체크: 이번 달 동일 (groupId, userId, amount, category, date) 존재 여부
      const exists = await this.prisma.expense.findFirst({
        where: {
          groupId: expense.groupId,
          userId: expense.userId,
          amount: expense.amount,
          category: expense.category,
          date: targetDate,
          isRecurring: true,
        },
      });

      if (!exists) {
        toCreate.push({ ...expense, date: targetDate });
      }
    }

    if (toCreate.length === 0) {
      this.logger.log('오늘 복사할 고정비용 없음');
      return;
    }

    await this.prisma.$transaction(
      toCreate.map((e) =>
        this.prisma.expense.create({
          data: {
            groupId: e.groupId,
            userId: e.userId,
            amount: e.amount,
            category: e.category,
            date: e.date,
            description: e.description,
            paymentMethod: e.paymentMethod,
            isRecurring: true,
          },
        }),
      ),
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
          groupId_category_month: {
            groupId: template.groupId,
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
          groupId_month: {
            groupId: template.groupId,
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
