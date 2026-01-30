import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  RecurringSkippedEvent,
} from '../events';

@Injectable()
export class TaskNotificationListener {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    const { task, userId, groupId, participantIds } = event;

    // 참여자들에게 알림
    if (participantIds.length > 0) {
      await this.sendParticipantNotifications(
        participantIds,
        userId,
        '새 일정에 참여자로 지정되었습니다',
        task.title,
        { category: 'SCHEDULE', scheduleId: task.id },
      );
    }

    // 그룹 멤버들에게 알림
    if (groupId) {
      await this.sendGroupNotification(
        groupId,
        userId,
        '새 일정이 추가되었습니다',
        task.title,
        { category: 'SCHEDULE', scheduleId: task.id },
      );
    }
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(event: TaskUpdatedEvent) {
    const { task, userId, newParticipantIds } = event;

    // 새로 추가된 참여자들에게만 알림
    if (newParticipantIds.length > 0) {
      await this.sendParticipantNotifications(
        newParticipantIds,
        userId,
        '일정에 참여자로 지정되었습니다',
        task.title,
        { category: 'SCHEDULE', scheduleId: task.id },
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

  /**
   * 특정 참여자들에게 알림 발송
   */
  private async sendParticipantNotifications(
    participantIds: string[],
    excludeUserId: string,
    title: string,
    body: string,
    data: object,
  ) {
    await Promise.allSettled(
      participantIds
        .filter((userId) => userId !== excludeUserId)
        .map((userId) =>
          this.notificationService.sendNotification({
            userId,
            category: NotificationCategory.SCHEDULE,
            title,
            body,
            data,
          }),
        ),
    );
  }
}
