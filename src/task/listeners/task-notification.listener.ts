import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskStatusChangedEvent,
  TaskDeletedEvent,
  RecurringSkippedEvent,
} from '../events';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskReminderType } from '../enums/task-reminder-type.enum';

@Injectable()
export class TaskNotificationListener {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private queueService: NotificationQueueService,
    private i18n: I18nService,
  ) {}

  private async getUserLang(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    return user?.language ?? 'ko';
  }

  private t(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.t(key, { lang, args });
  }

  private getCategoryByTaskType(taskType: string): NotificationCategory {
    const type = taskType as TaskType;
    return type === TaskType.TODO_LINKED || type === TaskType.TODO_ONLY
      ? NotificationCategory.TODO
      : NotificationCategory.SCHEDULE;
  }

  private async scheduleReminders(
    task: {
      id: string;
      title: string;
      scheduledAt: Date | null;
      dueAt: Date | null;
      type: string;
    },
    userId: string,
    reminders: { id: string; reminderType: string; offsetMinutes: number }[],
    category: NotificationCategory,
  ) {
    const now = new Date();
    const isTodo = category === NotificationCategory.TODO;
    const taskData = isTodo ? { todoId: task.id } : { scheduleId: task.id };
    const lang = await this.getUserLang(userId);

    await Promise.allSettled(
      reminders.map((reminder) => {
        const isBefore =
          (reminder.reminderType as TaskReminderType) ===
          TaskReminderType.BEFORE_START;
        const baseTime = isBefore ? task.scheduledAt : task.dueAt;

        if (!baseTime) return Promise.resolve();

        const offsetMs = Math.abs(reminder.offsetMinutes) * 60 * 1000;
        const scheduledTime = new Date(baseTime.getTime() - offsetMs);

        if (scheduledTime <= now) return Promise.resolve();

        const absMin = Math.abs(reminder.offsetMinutes);
        const timeText =
          absMin >= 60
            ? this.t('task.notification.reminder_hours_before', lang, {
                hours: Math.floor(absMin / 60),
              })
            : this.t('task.notification.reminder_minutes_before', lang, {
                minutes: absMin,
              });

        const bodyKey = isBefore
          ? 'task.notification.reminder_before_start'
          : 'task.notification.reminder_before_due';
        const body = this.t(bodyKey, lang, {
          title: task.title,
          time: timeText,
        });

        return this.queueService.enqueueScheduledIfAbsent(
          {
            userId,
            category,
            title: task.title,
            body,
            data: { ...taskData, reminderId: reminder.id },
            scheduledTime: scheduledTime.toISOString(),
          },
          reminder.id,
        );
      }),
    );
  }

  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    const { task, userId, groupId, participantIds, reminders } = event;
    const category = this.getCategoryByTaskType(task.type);
    const isTodo = category === NotificationCategory.TODO;
    const taskData = isTodo ? { todoId: task.id } : { scheduleId: task.id };

    if (participantIds.length > 0) {
      await this.sendParticipantNotifications(
        participantIds,
        userId,
        isTodo
          ? 'task.notification.new_todo_participant'
          : 'task.notification.new_schedule_participant',
        task.title,
        taskData,
        category,
      );
    }

    if (groupId) {
      await this.sendGroupNotification(
        groupId,
        userId,
        isTodo
          ? 'task.notification.new_todo_group'
          : 'task.notification.new_schedule_group',
        task.title,
        taskData,
        category,
        participantIds,
      );
    }

    if (reminders.length > 0) {
      await this.scheduleReminders(task, userId, reminders, category);
    }
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(event: TaskUpdatedEvent) {
    const { task, userId, newParticipantIds, reminders, canceledReminderIds } =
      event;
    const category = this.getCategoryByTaskType(task.type);
    const isTodo = category === NotificationCategory.TODO;
    const taskData = isTodo ? { todoId: task.id } : { scheduleId: task.id };

    if (newParticipantIds.length > 0) {
      await this.sendParticipantNotifications(
        newParticipantIds,
        userId,
        isTodo
          ? 'task.notification.added_todo_participant'
          : 'task.notification.added_schedule_participant',
        task.title,
        taskData,
        category,
      );
    }

    if (canceledReminderIds.length > 0) {
      await this.queueService.cancelScheduledReminders(canceledReminderIds);
    }
    if (reminders.length > 0) {
      await this.scheduleReminders(task, userId, reminders, category);
    }
  }

  @OnEvent('task.deleted')
  async handleTaskDeleted(event: TaskDeletedEvent) {
    const { reminderIds } = event;
    if (reminderIds.length > 0) {
      await this.queueService.cancelScheduledReminders(reminderIds);
    }
  }

  @OnEvent('task.status-changed')
  async handleTaskStatusChanged(event: TaskStatusChangedEvent) {
    const { task, userId, status } = event;

    const taskType = task.type as TaskType;
    if (
      (taskType === TaskType.TODO_LINKED || taskType === TaskType.TODO_ONLY) &&
      (status as TaskStatus) === TaskStatus.COMPLETED
    ) {
      const participants = await this.prisma.taskParticipant.findMany({
        where: { taskId: task.id },
        select: { userId: true },
      });

      await Promise.allSettled(
        participants
          .filter((p) => p.userId !== userId)
          .map(async (p) => {
            const lang = await this.getUserLang(p.userId);
            return this.notificationService.sendNotification({
              userId: p.userId,
              category: NotificationCategory.TODO,
              title: this.t('task.notification.todo_completed', lang),
              body: this.t('task.notification.todo_completed_body', lang, {
                title: task.title,
              }),
              data: { todoId: task.id },
            });
          }),
      );
    }
  }

  @OnEvent('recurring.skipped')
  async handleRecurringSkipped(event: RecurringSkippedEvent) {
    const { recurringId, userId, groupId, skipDate } = event;

    if (groupId) {
      await this.sendGroupNotification(
        groupId,
        userId,
        'task.notification.recurring_skipped',
        skipDate,
        { scheduleId: recurringId },
        NotificationCategory.SCHEDULE,
      );
    }
  }

  private async sendGroupNotification(
    groupId: string,
    excludeUserId: string,
    titleKey: string,
    body: string,
    data: object,
    category: NotificationCategory,
    excludeUserIds: string[] = [],
  ) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const excluded = new Set([excludeUserId, ...excludeUserIds]);

    await Promise.allSettled(
      members
        .filter((m) => !excluded.has(m.userId))
        .map(async (m) => {
          const lang = await this.getUserLang(m.userId);
          return this.notificationService.sendNotification({
            userId: m.userId,
            category,
            title: this.t(titleKey, lang),
            body,
            data,
          });
        }),
    );
  }

  private async sendParticipantNotifications(
    participantIds: string[],
    excludeUserId: string,
    titleKey: string,
    body: string,
    data: object,
    category: NotificationCategory,
  ) {
    await Promise.allSettled(
      participantIds
        .filter((userId) => userId !== excludeUserId)
        .map(async (userId) => {
          const lang = await this.getUserLang(userId);
          return this.notificationService.sendNotification({
            userId,
            category,
            title: this.t(titleKey, lang),
            body,
            data,
          });
        }),
    );
  }
}
