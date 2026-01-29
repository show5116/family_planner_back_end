import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateTaskDto, UpdateTaskDto, QueryTasksDto } from './dto';
import { TaskHistoryAction } from './enums';
import { RecurringService } from './recurring.service';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private recurringService: RecurringService,
  ) {}

  /**
   * Task 목록 조회 (캘린더/할일 뷰)
   */
  async getTasks(userId: string, query: QueryTasksDto) {
    const {
      view = 'calendar',
      groupId,
      categoryId,
      type,
      priority,
      isCompleted,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {
      deletedAt: null,
      OR: [{ userId }],
    };

    // 그룹 Task 추가
    if (groupId) {
      const isMember = await this.checkGroupMember(userId, groupId);
      if (!isMember) {
        throw new ForbiddenException('그룹 멤버만 조회할 수 있습니다');
      }
      where.OR.push({ groupId });
    } else {
      const memberships = await this.prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);
      if (groupIds.length > 0) {
        where.OR.push({ groupId: { in: groupIds } });
      }
    }

    // 필터링
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (isCompleted !== undefined) where.isCompleted = isCompleted;

    // 날짜 범위 필터
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    // 정렬
    const orderBy: any =
      view === 'calendar'
        ? { scheduledAt: 'asc' }
        : [{ isCompleted: 'asc' }, { priority: 'desc' }, { dueAt: 'asc' }];

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          category: true,
          recurring: true,
          participants: {
            include: {
              user: {
                select: { id: true, name: true, profileImageKey: true },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const tasksWithDDay = tasks.map((task) => ({
      ...task,
      daysUntilDue: this.calculateDaysUntilDue(task.dueAt),
    }));

    return {
      data: tasksWithDDay,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Task 상세 조회
   */
  async getTaskById(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        category: true,
        recurring: true,
        reminders: true,
        histories: { orderBy: { createdAt: 'desc' } },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, profileImageKey: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task를 찾을 수 없습니다');
    }

    // 권한 확인
    if (task.userId !== userId) {
      if (task.groupId) {
        const isMember = await this.checkGroupMember(userId, task.groupId);
        if (!isMember) {
          throw new ForbiddenException(
            '그룹 Task는 그룹 멤버만 조회할 수 있습니다',
          );
        }
      } else {
        throw new ForbiddenException('본인의 Task만 조회할 수 있습니다');
      }
    }

    return {
      ...task,
      daysUntilDue: this.calculateDaysUntilDue(task.dueAt),
    };
  }

  /**
   * Task 생성
   */
  async createTask(userId: string, dto: CreateTaskDto) {
    // 그룹 Task 생성 시 그룹 멤버 확인
    if (dto.groupId) {
      const isMember = await this.checkGroupMember(userId, dto.groupId);
      if (!isMember) {
        throw new ForbiddenException('그룹 멤버만 Task를 생성할 수 있습니다');
      }
    }

    // 카테고리 존재 확인
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    // 반복 규칙 생성
    let recurringId: string | null = null;
    if (dto.recurring) {
      const recurring = await this.prisma.recurring.create({
        data: {
          userId,
          groupId: dto.groupId || null,
          ruleType: dto.recurring.ruleType,
          ruleConfig: dto.recurring.ruleConfig as object,
          generationType: dto.recurring.generationType,
        },
      });
      recurringId = recurring.id;
    }

    // Task 생성
    const task = await this.prisma.task.create({
      data: {
        userId,
        groupId: dto.groupId || null,
        categoryId: dto.categoryId,
        recurringId,
        title: dto.title,
        description: dto.description || null,
        location: dto.location || null,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
      include: { category: true, recurring: true },
    });

    // TaskHistory 생성
    await this.createTaskHistory(task.id, userId, TaskHistoryAction.CREATE);

    // 알림 생성
    if (dto.reminders && dto.reminders.length > 0) {
      await this.prisma.taskReminder.createMany({
        data: dto.reminders.map((r) => ({
          taskId: task.id,
          userId,
          reminderType: r.reminderType,
          offsetMinutes: r.offsetMinutes,
        })),
      });
    }

    // 참여자 추가
    if (dto.participantIds && dto.participantIds.length > 0) {
      if (!dto.groupId) {
        throw new ForbiddenException(
          '참여자는 그룹 Task에서만 지정할 수 있습니다',
        );
      }
      await this.addParticipants(task.id, dto.groupId, dto.participantIds);
      await this.sendParticipantNotifications(
        dto.participantIds,
        userId,
        '새 일정에 참여자로 지정되었습니다',
        task.title,
        { category: 'SCHEDULE', scheduleId: task.id },
      );
    }

    // 그룹 Task 알림
    if (dto.groupId) {
      await this.sendGroupNotification(
        dto.groupId,
        userId,
        '새 일정이 추가되었습니다',
        task.title,
        { category: 'SCHEDULE', scheduleId: task.id },
      );
    }

    // 참여자 포함하여 재조회
    const taskWithParticipants = await this.prisma.task.findUnique({
      where: { id: task.id },
      include: {
        category: true,
        recurring: true,
        participants: {
          include: {
            user: {
              select: { id: true, name: true, profileImageKey: true },
            },
          },
        },
      },
    });

    return {
      ...taskWithParticipants,
      daysUntilDue: this.calculateDaysUntilDue(task.dueAt),
    };
  }

  /**
   * Task 수정
   */
  async updateTask(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
    updateScope?: 'current' | 'future',
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      include: { recurring: true },
    });

    if (!task) {
      throw new NotFoundException('Task를 찾을 수 없습니다');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('본인이 작성한 Task만 수정할 수 있습니다');
    }

    if (task.recurringId && !updateScope) {
      throw new ForbiddenException(
        '반복 Task는 updateScope를 지정해야 합니다 (current 또는 future)',
      );
    }

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.type) updateData.type = dto.type;
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.scheduledAt) updateData.scheduledAt = new Date(dto.scheduledAt);
    if (dto.dueAt) updateData.dueAt = new Date(dto.dueAt);

    const before = {
      title: task.title,
      description: task.description,
      priority: task.priority,
    };

    if (updateScope === 'current' || !task.recurringId) {
      const updated = await this.prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: { category: true, recurring: true },
      });

      await this.createTaskHistory(taskId, userId, TaskHistoryAction.UPDATE, {
        before,
        after: updateData,
      });

      // 참여자 업데이트
      if (dto.participantIds !== undefined) {
        if (!task.groupId) {
          throw new ForbiddenException(
            '참여자는 그룹 Task에서만 지정할 수 있습니다',
          );
        }

        const existingParticipants = await this.prisma.taskParticipant.findMany(
          {
            where: { taskId },
            select: { userId: true },
          },
        );
        const existingIds = existingParticipants.map((p) => p.userId);
        const newParticipantIds = dto.participantIds.filter(
          (id) => !existingIds.includes(id),
        );

        await this.updateParticipants(taskId, task.groupId, dto.participantIds);

        if (newParticipantIds.length > 0) {
          await this.sendParticipantNotifications(
            newParticipantIds,
            userId,
            '일정에 참여자로 지정되었습니다',
            updated.title,
            { category: 'SCHEDULE', scheduleId: taskId },
          );
        }
      }

      const taskWithParticipants = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          category: true,
          recurring: true,
          participants: {
            include: {
              user: {
                select: { id: true, name: true, profileImageKey: true },
              },
            },
          },
        },
      });

      return {
        ...taskWithParticipants,
        daysUntilDue: this.calculateDaysUntilDue(updated.dueAt),
      };
    } else {
      // 현재 + 미래 모든 반복 Task 수정
      const futureTasks = await this.prisma.task.findMany({
        where: {
          recurringId: task.recurringId,
          scheduledAt: { gte: task.scheduledAt || new Date() },
          deletedAt: null,
        },
      });

      await Promise.all([
        ...futureTasks.map((t) =>
          this.prisma.task.update({
            where: { id: t.id },
            data: updateData,
          }),
        ),
        ...futureTasks.map((t) =>
          this.createTaskHistory(t.id, userId, TaskHistoryAction.UPDATE, {
            before,
            after: updateData,
          }),
        ),
      ]);

      const updated = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { category: true, recurring: true },
      });

      return {
        ...updated,
        daysUntilDue: this.calculateDaysUntilDue(updated?.dueAt),
      };
    }
  }

  /**
   * Task 완료/미완료 처리
   */
  async completeTask(userId: string, taskId: string, isCompleted: boolean) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      include: { recurring: true },
    });

    if (!task) {
      throw new NotFoundException('Task를 찾을 수 없습니다');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      include: { category: true, recurring: true },
    });

    await this.createTaskHistory(taskId, userId, TaskHistoryAction.COMPLETE);

    // AFTER_COMPLETION 타입 반복 일정인 경우 다음 Task 생성
    if (
      isCompleted &&
      task.recurring &&
      task.recurring.generationType === 'AFTER_COMPLETION'
    ) {
      await this.recurringService.generateNextTaskAfterCompletion(taskId);
    }

    return {
      ...updated,
      daysUntilDue: this.calculateDaysUntilDue(updated.dueAt),
    };
  }

  /**
   * Task 삭제 (Soft Delete)
   */
  async deleteTask(
    userId: string,
    taskId: string,
    deleteScope?: 'current' | 'future' | 'all',
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task를 찾을 수 없습니다');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('본인이 작성한 Task만 삭제할 수 있습니다');
    }

    if (task.recurringId && !deleteScope) {
      throw new ForbiddenException(
        '반복 Task는 deleteScope를 지정해야 합니다 (current, future, all)',
      );
    }

    const now = new Date();

    if (deleteScope === 'current' || !task.recurringId) {
      await this.prisma.task.update({
        where: { id: taskId },
        data: { deletedAt: now },
      });
      await this.createTaskHistory(taskId, userId, TaskHistoryAction.DELETE);
    } else if (deleteScope === 'future') {
      const futureTasks = await this.prisma.task.findMany({
        where: {
          recurringId: task.recurringId,
          scheduledAt: { gte: task.scheduledAt || new Date() },
          deletedAt: null,
        },
      });

      await Promise.all([
        this.prisma.task.updateMany({
          where: { id: { in: futureTasks.map((t) => t.id) } },
          data: { deletedAt: now },
        }),
        ...futureTasks.map((t) =>
          this.createTaskHistory(t.id, userId, TaskHistoryAction.DELETE),
        ),
      ]);
    } else {
      const allTasks = await this.prisma.task.findMany({
        where: { recurringId: task.recurringId, deletedAt: null },
      });

      await Promise.all([
        this.prisma.task.updateMany({
          where: { id: { in: allTasks.map((t) => t.id) } },
          data: { deletedAt: now },
        }),
        ...allTasks.map((t) =>
          this.createTaskHistory(t.id, userId, TaskHistoryAction.DELETE),
        ),
      ]);
    }

    return { message: 'Task가 삭제되었습니다' };
  }

  // ==================== 헬퍼 메서드 ====================

  /**
   * 그룹 멤버 확인
   */
  private async checkGroupMember(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    return !!member;
  }

  /**
   * D-Day 계산
   */
  private calculateDaysUntilDue(dueAt: Date | null): number | null {
    if (!dueAt) return null;
    const now = new Date();
    const due = new Date(dueAt);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Task 변경 이력 기록
   */
  private async createTaskHistory(
    taskId: string,
    userId: string,
    action: TaskHistoryAction,
    changes?: { before: any; after: any },
  ) {
    await this.prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        action,
        changes: changes || null,
      },
    });
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

  /**
   * Task에 참여자 추가
   */
  private async addParticipants(
    taskId: string,
    groupId: string,
    participantIds: string[],
  ) {
    const groupMembers = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { in: participantIds } },
      select: { userId: true },
    });

    const validUserIds = groupMembers.map((m) => m.userId);
    const invalidUserIds = participantIds.filter(
      (id) => !validUserIds.includes(id),
    );

    if (invalidUserIds.length > 0) {
      throw new ForbiddenException('참여자는 그룹 멤버만 지정할 수 있습니다');
    }

    await this.prisma.taskParticipant.createMany({
      data: participantIds.map((userId) => ({ taskId, userId })),
      skipDuplicates: true,
    });
  }

  /**
   * Task 참여자 업데이트
   */
  private async updateParticipants(
    taskId: string,
    groupId: string,
    participantIds: string[],
  ) {
    await this.prisma.taskParticipant.deleteMany({ where: { taskId } });
    if (participantIds.length > 0) {
      await this.addParticipants(taskId, groupId, participantIds);
    }
  }

  /**
   * 특정 참여자들에게 알림 발송
   */
  private async sendParticipantNotifications(
    participantIds: string[],
    excludeUserId: string,
    title: string,
    body: string,
    data: any,
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
