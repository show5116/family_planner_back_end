import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SkipRecurringDto } from './dto';
import { TaskHistoryAction, RecurringRuleType } from './enums';
import { RecurringDateUtil } from './recurring-date.util';
import { RuleConfig, RecurringEndType } from './interfaces';
import { RecurringSkippedEvent, RecurringTasksGeneratedEvent } from './events';

@Injectable()
export class RecurringService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
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

    // Event Emitter로 알림 위임
    this.eventEmitter.emit(
      'recurring.skipped',
      new RecurringSkippedEvent(
        recurringId,
        userId,
        recurring.groupId,
        dto.skipDate,
        dto.reason || null,
      ),
    );

    return skip;
  }

  /**
   * 반복 일정 Task 생성 (스케줄러용, 트랜잭션 적용)
   *
   * 주의: 템플릿 Task는 가장 오래된(최초) Task를 사용합니다.
   * 사용자가 특정 Task만 수정해도 이후 생성에 영향이 없습니다.
   */
  async generateRecurringTasks(recurringId: string) {
    const recurring = await this.prisma.recurring.findUnique({
      where: { id: recurringId },
      include: {
        // 최초 생성된 Task를 템플릿으로 사용 (asc)
        tasks: {
          where: { deletedAt: null },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          include: {
            reminders: true,
            participants: true, // 참여자 포함
          },
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

    // 트랜잭션으로 모든 DB 작업 수행
    const createdTaskIds = await this.prisma.$transaction(async (tx) => {
      const taskIds: string[] = [];

      for (const date of newDates) {
        const { scheduledAt, dueAt } = this.calculateTaskDates(
          date,
          templateTask.scheduledAt,
          templateTask.dueAt,
        );

        const task = await tx.task.create({
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

        taskIds.push(task.id);

        // Reminder 복사
        if (templateTask.reminders.length > 0) {
          await tx.taskReminder.createMany({
            data: templateTask.reminders.map((r) => ({
              taskId: task.id,
              userId: r.userId,
              reminderType: r.reminderType,
              offsetMinutes: r.offsetMinutes,
            })),
          });
        }

        // 참여자 복사 (Critical Fix)
        if (templateTask.participants.length > 0) {
          await tx.taskParticipant.createMany({
            data: templateTask.participants.map((p) => ({
              taskId: task.id,
              userId: p.userId,
            })),
          });
        }

        // TaskHistory 생성
        await tx.taskHistory.create({
          data: {
            taskId: task.id,
            userId: recurring.userId,
            action: TaskHistoryAction.CREATE,
            changes: { source: 'SCHEDULER' } as Prisma.InputJsonValue,
          },
        });
      }

      // 생성 횟수 및 마지막 생성일 업데이트
      const newGeneratedCount =
        (ruleConfig.generatedCount || 0) + taskIds.length;
      const updatedRuleConfig = {
        ...ruleConfig,
        generatedCount: newGeneratedCount,
      };

      await tx.recurring.update({
        where: { id: recurringId },
        data: {
          lastGeneratedAt: new Date(),
          ruleConfig: updatedRuleConfig,
        },
      });

      return taskIds;
    });

    // 이벤트 발행
    if (createdTaskIds.length > 0) {
      this.eventEmitter.emit(
        'recurring.tasks.generated',
        new RecurringTasksGeneratedEvent(
          createdTaskIds,
          recurring.userId,
          recurringId,
        ),
      );
    }
  }

  /**
   * AFTER_COMPLETION 타입: Task 완료 시 다음 Task 자동 생성 (트랜잭션 적용)
   *
   * 주의: 완료된 Task를 템플릿으로 사용합니다.
   * 이 타입은 "이번 Task 완료 후 X일 뒤" 생성 방식이므로 가장 최근 Task가 적합합니다.
   */
  async generateNextTaskAfterCompletion(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        recurring: true,
        reminders: true,
        participants: true, // 참여자 포함
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

    // 날짜 계산
    const { scheduledAt, dueAt } = this.calculateTaskDates(
      nextDate,
      task.scheduledAt,
      task.dueAt,
    );

    // 트랜잭션으로 모든 DB 작업 수행
    const newTask = await this.prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
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
      });

      // Reminder 복사
      if (task.reminders.length > 0) {
        await tx.taskReminder.createMany({
          data: task.reminders.map((r) => ({
            taskId: createdTask.id,
            userId: r.userId,
            reminderType: r.reminderType,
            offsetMinutes: r.offsetMinutes,
          })),
        });
      }

      // 참여자 복사 (Critical Fix)
      if (task.participants.length > 0) {
        await tx.taskParticipant.createMany({
          data: task.participants.map((p) => ({
            taskId: createdTask.id,
            userId: p.userId,
          })),
        });
      }

      // TaskHistory 생성
      await tx.taskHistory.create({
        data: {
          taskId: createdTask.id,
          userId: task.userId,
          action: TaskHistoryAction.CREATE,
          changes: { source: 'AFTER_COMPLETION' } as Prisma.InputJsonValue,
        },
      });

      // 생성 횟수 업데이트
      const newGeneratedCount = (ruleConfig.generatedCount || 0) + 1;
      const updatedRuleConfig = {
        ...ruleConfig,
        generatedCount: newGeneratedCount,
      };

      await tx.recurring.update({
        where: { id: recurring.id },
        data: {
          lastGeneratedAt: new Date(),
          ruleConfig: updatedRuleConfig,
        },
      });

      return tx.task.findUnique({
        where: { id: createdTask.id },
        include: {
          category: true,
          recurring: true,
          participants: { include: { user: true } },
        },
      });
    });

    // 이벤트 발행
    if (newTask) {
      this.eventEmitter.emit(
        'recurring.tasks.generated',
        new RecurringTasksGeneratedEvent(
          [newTask.id],
          task.userId,
          recurring.id,
        ),
      );
    }

    return newTask;
  }

  /**
   * Task 날짜 계산 헬퍼
   */
  private calculateTaskDates(
    baseDate: Date,
    templateScheduledAt: Date | null,
    templateDueAt: Date | null,
  ): { scheduledAt: Date; dueAt: Date | null } {
    const scheduledAt = new Date(baseDate);
    if (templateScheduledAt) {
      scheduledAt.setHours(
        templateScheduledAt.getHours(),
        templateScheduledAt.getMinutes(),
        templateScheduledAt.getSeconds(),
      );
    }

    let dueAt: Date | null = null;
    if (templateDueAt && templateScheduledAt) {
      const diff = templateDueAt.getTime() - templateScheduledAt.getTime();
      dueAt = new Date(scheduledAt.getTime() + diff);
    } else if (templateDueAt) {
      dueAt = new Date(baseDate);
      dueAt.setHours(
        templateDueAt.getHours(),
        templateDueAt.getMinutes(),
        templateDueAt.getSeconds(),
      );
    }

    return { scheduledAt, dueAt };
  }
}
