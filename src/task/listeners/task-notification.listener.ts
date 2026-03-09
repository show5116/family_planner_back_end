import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskStatusChangedEvent,
  RecurringSkippedEvent,
} from '../events';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';

@Injectable()
export class TaskNotificationListener {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * task.type에 따라 알림 카테고리 결정
   * TODO_LINKED → TODO, CALENDAR_ONLY → SCHEDULE
   */
  private getCategoryByTaskType(taskType: string): NotificationCategory {
    return (taskType as TaskType) === TaskType.TODO_LINKED
      ? NotificationCategory.TODO
      : NotificationCategory.SCHEDULE;
  }

  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    const { task, userId, groupId, participantIds } = event;
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
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(event: TaskUpdatedEvent) {
    const { task, userId, newParticipantIds } = event;
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
  }

  @OnEvent('task.status-changed')
  async handleTaskStatusChanged(event: TaskStatusChangedEvent) {
    const { task, userId, status } = event;

    // TODO 완료 시 참여자들에게 알림
    if (
      (task.type as TaskType) === TaskType.TODO_LINKED &&
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
