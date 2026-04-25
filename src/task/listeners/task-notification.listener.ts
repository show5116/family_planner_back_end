import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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
  ) {}

  /**
   * task.type에 따라 알림 카테고리 결정
   * TODO_LINKED / TODO_ONLY → TODO, CALENDAR_ONLY → SCHEDULE
   */
  private getCategoryByTaskType(taskType: string): NotificationCategory {
    const type = taskType as TaskType;
    return type === TaskType.TODO_LINKED || type === TaskType.TODO_ONLY
      ? NotificationCategory.TODO
      : NotificationCategory.SCHEDULE;
  }

  /**
   * reminder 목록을 Waiting Room(Redis Sorted Set)에 등록
   * - BEFORE_START: scheduledAt - offsetMinutes
   * - BEFORE_DUE: dueAt - offsetMinutes
   * 기준 시각이 없거나 이미 지난 reminder는 스킵
   */
  private async scheduleReminders(
    task: {
      id: string;
      title: string;
      scheduledAt: Date | null;
      dueAt: Date | null;
    },
    userId: string,
    reminders: { id: string; reminderType: string; offsetMinutes: number }[],
    category: NotificationCategory,
  ) {
    const now = new Date();

    await Promise.allSettled(
      reminders.map((reminder) => {
        const isBefore =
          (reminder.reminderType as TaskReminderType) ===
          TaskReminderType.BEFORE_START;
        const baseTime = isBefore ? task.scheduledAt : task.dueAt;

        if (!baseTime) return Promise.resolve();

        // BEFORE_* 타입은 항상 기준 시각 "이전"으로 계산 (부호 무관하게 강제)
        const offsetMs = Math.abs(reminder.offsetMinutes) * 60 * 1000;
        const scheduledTime = new Date(baseTime.getTime() - offsetMs);

        if (scheduledTime <= now) return Promise.resolve();

        const label = isBefore ? '시작' : '마감';
        const absMin = Math.abs(reminder.offsetMinutes);
        const timeText =
          absMin >= 60 ? `${Math.floor(absMin / 60)}시간 전` : `${absMin}분 전`;
        const body = `${task.title} ${label} ${timeText}`;

        // reminderId를 중복 방지 키로 사용 — 동일 reminder가 중복 등록되지 않음
        return this.queueService.enqueueScheduledIfAbsent(
          {
            userId,
            category,
            title: task.title,
            body,
            data: { taskId: task.id, reminderId: reminder.id },
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

    // 참여자들에게 알림
    if (participantIds.length > 0) {
      await this.sendParticipantNotifications(
        participantIds,
        userId,
        isTodo
          ? '새 할 일에 참여자로 지정되었습니다'
          : '새 일정에 참여자로 지정되었습니다',
        task.title,
        { category, scheduleId: task.id },
        category,
      );
    }

    // 그룹 멤버들에게 알림
    if (groupId) {
      await this.sendGroupNotification(
        groupId,
        userId,
        isTodo ? '새 할 일이 추가되었습니다' : '새 일정이 추가되었습니다',
        task.title,
        { category, scheduleId: task.id },
        category,
      );
    }

    // reminder Waiting Room 등록
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

    // 새로 추가된 참여자들에게만 알림
    if (newParticipantIds.length > 0) {
      await this.sendParticipantNotifications(
        newParticipantIds,
        userId,
        isTodo
          ? '할 일에 참여자로 지정되었습니다'
          : '일정에 참여자로 지정되었습니다',
        task.title,
        { category, scheduleId: task.id },
        category,
      );
    }

    // 기존 reminder Waiting Room에서 제거 후 새 reminder 등록
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

    // TODO 완료 시 참여자들에게 알림
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
          .map((p) =>
            this.notificationService.sendNotification({
              userId: p.userId,
              category: NotificationCategory.TODO,
              title: '할 일 완료',
              body: `"${task.title}"이(가) 완료되었습니다`,
              data: { taskId: task.id },
            }),
          ),
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
        '반복 일정이 건너뛰기 되었습니다',
        `${skipDate} 일정이 건너뛰기 되었습니다`,
        { category: 'SCHEDULE', scheduleId: recurringId },
        NotificationCategory.SCHEDULE,
      );
    }
  }

  /**
   * 그룹 멤버 전체에게 알림 발송
   */
  private async sendGroupNotification(
    groupId: string,
    excludeUserId: string,
    title: string,
    body: string,
    data: object,
    category: NotificationCategory,
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
            category,
            title,
            body,
            data,
          }),
        ),
    );
  }

  /**
   * 특정 참여자들에게 알림 발송
   */
  private async sendParticipantNotifications(
    participantIds: string[],
    excludeUserId: string,
    title: string,
    body: string,
    data: object,
    category: NotificationCategory,
  ) {
    await Promise.allSettled(
      participantIds
        .filter((userId) => userId !== excludeUserId)
        .map((userId) =>
          this.notificationService.sendNotification({
            userId,
            category,
            title,
            body,
            data,
          }),
        ),
    );
  }
}
