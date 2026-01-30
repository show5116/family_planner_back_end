import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskHistoryAction } from '../enums';
import {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskCompletedEvent,
  TaskDeletedEvent,
  TaskBulkUpdatedEvent,
} from '../events';

@Injectable()
export class TaskHistoryListener {
  constructor(private prisma: PrismaService) {}

  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    await this.prisma.taskHistory.create({
      data: {
        taskId: event.task.id,
        userId: event.userId,
        action: TaskHistoryAction.CREATE,
        changes: null,
      },
    });
  }

  @OnEvent('task.updated')
  async handleTaskUpdated(event: TaskUpdatedEvent) {
    await this.prisma.taskHistory.create({
      data: {
        taskId: event.task.id,
        userId: event.userId,
        action: TaskHistoryAction.UPDATE,
        changes: { before: event.before, after: event.after },
      },
    });
  }

  @OnEvent('task.completed')
  async handleTaskCompleted(event: TaskCompletedEvent) {
    await this.prisma.taskHistory.create({
      data: {
        taskId: event.task.id,
        userId: event.userId,
        action: TaskHistoryAction.COMPLETE,
        changes: null,
      },
    });
  }

  @OnEvent('task.deleted')
  async handleTaskDeleted(event: TaskDeletedEvent) {
    await this.prisma.taskHistory.createMany({
      data: event.taskIds.map((taskId) => ({
        taskId,
        userId: event.userId,
        action: TaskHistoryAction.DELETE,
        changes: null,
      })),
    });
  }

  @OnEvent('task.bulk-updated')
  async handleTaskBulkUpdated(event: TaskBulkUpdatedEvent) {
    await this.prisma.taskHistory.createMany({
      data: event.taskIds.map((taskId) => ({
        taskId,
        userId: event.userId,
        action: TaskHistoryAction.UPDATE,
        changes: { before: event.before, after: event.after },
      })),
    });
  }
}
