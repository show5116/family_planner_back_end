import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { SkipRecurringDto } from './dto';
import { TaskHistoryAction, RecurringRuleType } from './enums';
import { RecurringDateUtil } from './recurring-date.util';
import { RuleConfig, RecurringEndType } from './interfaces';

@Injectable()
export class RecurringService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * 반복 일정 일시정지/재개
   */
  async pauseRecurring(userId: string, recurringId: string) {
    const recurring = await this.prisma.recurring.findUnique({
      where: { id: recurringId },
    });

    if (!recurring) {
      throw new NotFoundException('반복 규칙을 찾을 수 없습니다');
    }

    if (recurring.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 반복 규칙만 변경할 수 있습니다',
      );
    }

    return await this.prisma.recurring.update({
      where: { id: recurringId },
      data: { isActive: !recurring.isActive },
    });
  }

  /**
   * 반복 일정 건너뛰기
   */
  async skipRecurring(
    userId: string,
    recurringId: string,
    dto: SkipRecurringDto,
  ) {
    const recurring = await this.prisma.recurring.findUnique({
      where: { id: recurringId },
    });

    if (!recurring) {
      throw new NotFoundException('반복 규칙을 찾을 수 없습니다');
    }

    if (recurring.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 반복 규칙만 건너뛸 수 있습니다',
      );
    }

    const skip = await this.prisma.taskSkip.create({
      data: {
        recurringId,
        skipDate: new Date(dto.skipDate),
        reason: dto.reason || null,
        createdBy: userId,
      },
    });

    if (recurring.groupId) {
      await this.sendGroupNotification(
        recurring.groupId,
        userId,
        '반복 일정이 건너뛰기 되었습니다',
        `${dto.skipDate} 일정이 건너뛰기 되었습니다`,
        { category: 'SCHEDULE', scheduleId: recurringId },
      );
    }

    return skip;
  }

  /**
   * 반복 일정 Task 생성 (스케줄러용)
   */
  async generateRecurringTasks(recurringId: string) {
    const recurring = await this.prisma.recurring.findUnique({
      where: { id: recurringId },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          include: { reminders: true },
        },
        skips: true,
      },
    });

    if (!recurring || !recurring.isActive) return;

    const ruleConfig = recurring.ruleConfig as unknown as RuleConfig;

    // 종료 조건 확인: COUNT
    if (ruleConfig.endType === RecurringEndType.COUNT && ruleConfig.count) {
      const generatedCount = ruleConfig.generatedCount || 0;
      if (generatedCount >= ruleConfig.count) {
        await this.prisma.recurring.update({
          where: { id: recurringId },
          data: { isActive: false },
        });
        return;
      }
    }

    // 종료 조건 확인: DATE
    if (ruleConfig.endType === RecurringEndType.DATE && ruleConfig.endDate) {
      if (new Date(ruleConfig.endDate) < new Date()) {
        await this.prisma.recurring.update({
          where: { id: recurringId },
          data: { isActive: false },
        });
        return;
      }
    }

    const templateTask = recurring.tasks[0];
    if (!templateTask) return;

    // 기존 생성된 날짜들 수집
    const existingTasks = await this.prisma.task.findMany({
      where: { recurringId, deletedAt: null },
      select: { scheduledAt: true },
    });
    const existingDates = new Set(
      existingTasks
        .filter((t) => t.scheduledAt)
        .map((t) => RecurringDateUtil.formatDateString(t.scheduledAt)),
    );

    // 건너뛰기 날짜들 수집
    const skipDates = new Set(
      recurring.skips.map((s) =>
        RecurringDateUtil.formatDateString(s.skipDate),
      ),
    );

    // 시작 날짜 계산
    const fromDate = recurring.lastGeneratedAt
      ? new Date(recurring.lastGeneratedAt)
      : new Date();
    fromDate.setDate(fromDate.getDate() + 1);
    fromDate.setHours(0, 0, 0, 0);

    // 미래 3개월 분량 날짜 계산
    const newDates = RecurringDateUtil.calculateNextDates(
      recurring.ruleType as RecurringRuleType,
      ruleConfig,
      fromDate,
      3,
      existingDates,
      skipDates,
    );

    if (newDates.length === 0) return;

    // Task 일괄 생성
    const createdTasks = await Promise.all(
      newDates.map(async (date) => {
        const scheduledAt = new Date(date);
        if (templateTask.scheduledAt) {
          scheduledAt.setHours(
            templateTask.scheduledAt.getHours(),
            templateTask.scheduledAt.getMinutes(),
            templateTask.scheduledAt.getSeconds(),
          );
        }

        let dueAt: Date | null = null;
        if (templateTask.dueAt && templateTask.scheduledAt) {
          const diff =
            templateTask.dueAt.getTime() - templateTask.scheduledAt.getTime();
          dueAt = new Date(scheduledAt.getTime() + diff);
        } else if (templateTask.dueAt) {
          dueAt = new Date(date);
          dueAt.setHours(
            templateTask.dueAt.getHours(),
            templateTask.dueAt.getMinutes(),
            templateTask.dueAt.getSeconds(),
          );
        }

        const task = await this.prisma.task.create({
          data: {
            userId: recurring.userId,
            groupId: recurring.groupId,
            categoryId: templateTask.categoryId,
            recurringId: recurring.id,
            title: templateTask.title,
            description: templateTask.description,
            location: templateTask.location,
            type: templateTask.type,
            priority: templateTask.priority,
            scheduledAt,
            dueAt,
          },
        });

        // Reminder 복사
        if (templateTask.reminders.length > 0) {
          await this.prisma.taskReminder.createMany({
            data: templateTask.reminders.map((r) => ({
              taskId: task.id,
              userId: r.userId,
              reminderType: r.reminderType,
              offsetMinutes: r.offsetMinutes,
            })),
          });
        }

        return task;
      }),
    );

    // 생성 횟수 및 마지막 생성일 업데이트
    const newGeneratedCount =
      (ruleConfig.generatedCount || 0) + createdTasks.length;
    const updatedRuleConfig = {
      ...ruleConfig,
      generatedCount: newGeneratedCount,
    };

    await this.prisma.recurring.update({
      where: { id: recurringId },
      data: {
        lastGeneratedAt: new Date(),
        ruleConfig: updatedRuleConfig,
      },
    });
  }

  /**
   * AFTER_COMPLETION 타입: Task 완료 시 다음 Task 자동 생성
   */
  async generateNextTaskAfterCompletion(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        recurring: true,
        reminders: true,
      },
    });

    if (
      !task ||
      !task.recurring ||
      task.recurring.generationType !== 'AFTER_COMPLETION'
    ) {
      return null;
    }

    const recurring = task.recurring;
    if (!recurring.isActive) return null;

    const ruleConfig = recurring.ruleConfig as unknown as RuleConfig;

    // 종료 조건 확인
    if (ruleConfig.endType === RecurringEndType.COUNT && ruleConfig.count) {
      const generatedCount = ruleConfig.generatedCount || 0;
      if (generatedCount >= ruleConfig.count) {
        await this.prisma.recurring.update({
          where: { id: recurring.id },
          data: { isActive: false },
        });
        return null;
      }
    }

    if (ruleConfig.endType === RecurringEndType.DATE && ruleConfig.endDate) {
      if (new Date(ruleConfig.endDate) < new Date()) {
        await this.prisma.recurring.update({
          where: { id: recurring.id },
          data: { isActive: false },
        });
        return null;
      }
    }

    // 다음 날짜 계산
    const fromDate = task.completedAt || new Date();
    const nextDate = RecurringDateUtil.calculateNextSingleDate(
      recurring.ruleType as RecurringRuleType,
      ruleConfig,
      fromDate,
    );

    if (!nextDate) return null;

    // 종료일 확인
    if (ruleConfig.endType === RecurringEndType.DATE && ruleConfig.endDate) {
      if (nextDate > new Date(ruleConfig.endDate)) return null;
    }

    // 새 Task 생성
    const scheduledAt = new Date(nextDate);
    if (task.scheduledAt) {
      scheduledAt.setHours(
        task.scheduledAt.getHours(),
        task.scheduledAt.getMinutes(),
        task.scheduledAt.getSeconds(),
      );
    }

    let dueAt: Date | null = null;
    if (task.dueAt && task.scheduledAt) {
      const diff = task.dueAt.getTime() - task.scheduledAt.getTime();
      dueAt = new Date(scheduledAt.getTime() + diff);
    } else if (task.dueAt) {
      dueAt = new Date(nextDate);
      dueAt.setHours(
        task.dueAt.getHours(),
        task.dueAt.getMinutes(),
        task.dueAt.getSeconds(),
      );
    }

    const newTask = await this.prisma.task.create({
      data: {
        userId: task.userId,
        groupId: task.groupId,
        categoryId: task.categoryId,
        recurringId: recurring.id,
        title: task.title,
        description: task.description,
        location: task.location,
        type: task.type,
        priority: task.priority,
        scheduledAt,
        dueAt,
      },
      include: {
        category: true,
        recurring: true,
      },
    });

    // Reminder 복사
    if (task.reminders.length > 0) {
      await this.prisma.taskReminder.createMany({
        data: task.reminders.map((r) => ({
          taskId: newTask.id,
          userId: r.userId,
          reminderType: r.reminderType,
          offsetMinutes: r.offsetMinutes,
        })),
      });
    }

    // TaskHistory 생성
    await this.prisma.taskHistory.create({
      data: {
        taskId: newTask.id,
        userId: task.userId,
        action: TaskHistoryAction.CREATE,
        changes: null,
      },
    });

    // 생성 횟수 업데이트
    const newGeneratedCount = (ruleConfig.generatedCount || 0) + 1;
    const updatedRuleConfig = {
      ...ruleConfig,
      generatedCount: newGeneratedCount,
    };

    await this.prisma.recurring.update({
      where: { id: recurring.id },
      data: {
        lastGeneratedAt: new Date(),
        ruleConfig: updatedRuleConfig,
      },
    });

    return newTask;
  }

  /**
   * 그룹 멤버 전체에게 알림 발송
   */
  private async sendGroupNotification(
    groupId: string,
    excludeUserId: string,
    title: string,
    body: string,
    data: any,
  ) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    await Promise.allSettled(
      members
        .filter((m) => m.userId !== excludeUserId)
        .map((m) =>
          this.notificationService.sendNotification({
            userId: m.userId,
            category: NotificationCategory.SCHEDULE,
            title,
            body,
            data,
          }),
        ),
    );
  }
}
