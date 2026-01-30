import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, QueryTasksDto } from './dto';
import { RecurringGenerationType } from './enums';
import { RecurringService } from './recurring.service';
import { TaskQueryBuilder } from './builders';
import {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskCompletedEvent,
  TaskDeletedEvent,
  TaskBulkUpdatedEvent,
} from './events';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private recurringService: RecurringService,
  ) {}

  /**
   * Task 목록 조회 (캘린더/할일 뷰)
   */
  async getTasks(userId: string, query: QueryTasksDto) {
    const { view = 'calendar', groupId, page = 1, limit = 20 } = query;

    // 그룹 검증
    if (groupId) {
      const isMember = await this.checkGroupMember(userId, groupId);
      if (!isMember) {
        throw new ForbiddenException('그룹 멤버만 조회할 수 있습니다');
      }
    }

    // 사용자가 속한 그룹 목록 조회
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    // 쿼리 빌더로 조건 생성
    const where = TaskQueryBuilder.buildWhereClause(
      userId,
      groupIds,
      query,
      groupId,
    );
    const orderBy = TaskQueryBuilder.buildOrderBy(view);
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: TaskQueryBuilder.getListInclude(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    const now = new Date();
    const tasksWithDDay = tasks.map((task) => ({
      ...task,
      daysUntilDue: this.calculateDaysUntilDue(task.dueAt, now),
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
      include: TaskQueryBuilder.getDetailInclude(),
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
   * Task 생성 (트랜잭션 적용)
   */
  async createTask(userId: string, dto: CreateTaskDto) {
    // 사전 검증
    if (dto.groupId) {
      const isMember = await this.checkGroupMember(userId, dto.groupId);
      if (!isMember) {
        throw new ForbiddenException('그룹 멤버만 Task를 생성할 수 있습니다');
      }
    }

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    if (dto.participantIds && dto.participantIds.length > 0) {
      if (!dto.groupId) {
        throw new ForbiddenException(
          '참여자는 그룹 Task에서만 지정할 수 있습니다',
        );
      }
      await this.validateParticipants(dto.groupId, dto.participantIds);
    }

    // 트랜잭션으로 DB 작업 수행
    let createdRecurringId: string | null = null;

    const task = await this.prisma.$transaction(async (tx) => {
      // 반복 규칙 생성
      let recurringId: string | null = null;
      if (dto.recurring) {
        const recurring = await tx.recurring.create({
          data: {
            userId,
            groupId: dto.groupId || null,
            ruleType: dto.recurring.ruleType,
            ruleConfig: dto.recurring.ruleConfig as object,
            generationType: dto.recurring.generationType,
          },
        });
        recurringId = recurring.id;
        createdRecurringId = recurring.id;
      }

      // Task 생성
      const newTask = await tx.task.create({
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
          scheduledAt: dto.scheduledAt || null,
          dueAt: dto.dueAt || null,
        },
      });

      // 알림 생성
      if (dto.reminders && dto.reminders.length > 0) {
        await tx.taskReminder.createMany({
          data: dto.reminders.map((r) => ({
            taskId: newTask.id,
            userId,
            reminderType: r.reminderType,
            offsetMinutes: r.offsetMinutes,
          })),
        });
      }

      // 참여자 추가
      if (dto.participantIds && dto.participantIds.length > 0) {
        await tx.taskParticipant.createMany({
          data: dto.participantIds.map((pUserId) => ({
            taskId: newTask.id,
            userId: pUserId,
          })),
        });
      }

      return tx.task.findUnique({
        where: { id: newTask.id },
        include: TaskQueryBuilder.getListInclude(),
      });
    });

    if (!task) {
      throw new NotFoundException('Task 생성에 실패했습니다');
    }

    // 이벤트 발행 (히스토리 + 알림 처리)
    this.eventEmitter.emit(
      'task.created',
      new TaskCreatedEvent(
        task,
        userId,
        dto.groupId || null,
        dto.participantIds || [],
      ),
    );

    // 반복 일정: 미래 3개월치 즉시 생성
    if (
      createdRecurringId &&
      dto.recurring?.generationType === RecurringGenerationType.AUTO_SCHEDULER
    ) {
      await this.recurringService.generateRecurringTasks(createdRecurringId);
    }

    return {
      ...task,
      daysUntilDue: this.calculateDaysUntilDue(task.dueAt),
    };
  }

  /**
   * Task 수정 (트랜잭션 적용)
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

    // 참여자 검증
    if (dto.participantIds !== undefined && task.groupId) {
      await this.validateParticipants(task.groupId, dto.participantIds);
    } else if (dto.participantIds !== undefined && !task.groupId) {
      throw new ForbiddenException(
        '참여자는 그룹 Task에서만 지정할 수 있습니다',
      );
    }

    // 업데이트 데이터 준비
    const { updateData, changesAfter } = this.buildUpdateData(dto);

    const before = {
      title: task.title,
      description: task.description,
      priority: task.priority,
    };

    // 참여자 Diff 계산
    const { newParticipantIds, removedParticipantIds } =
      await this.calculateParticipantDiff(taskId, dto.participantIds);

    if (updateScope === 'current' || !task.recurringId) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id: taskId },
          data: updateData,
        });

        // 참여자 Diff Update
        await this.syncParticipants(
          tx,
          taskId,
          task.groupId,
          dto.participantIds,
          newParticipantIds,
          removedParticipantIds,
        );

        return tx.task.findUnique({
          where: { id: taskId },
          include: TaskQueryBuilder.getListInclude(),
        });
      });

      if (!updated) {
        throw new NotFoundException('Task 수정에 실패했습니다');
      }

      // 이벤트 발행
      this.eventEmitter.emit(
        'task.updated',
        new TaskUpdatedEvent(
          updated,
          userId,
          before,
          changesAfter,
          newParticipantIds,
        ),
      );

      return {
        ...updated,
        daysUntilDue: this.calculateDaysUntilDue(updated.dueAt),
      };
    } else {
      // 미래 모든 반복 Task 수정
      const updated = await this.prisma.$transaction(async (tx) => {
        const futureTasks = await tx.task.findMany({
          where: {
            recurringId: task.recurringId,
            scheduledAt: { gte: task.scheduledAt || new Date() },
            deletedAt: null,
          },
        });

        await tx.task.updateMany({
          where: { id: { in: futureTasks.map((t) => t.id) } },
          data: updateData as Prisma.TaskUpdateManyMutationInput,
        });

        // 일괄 수정 이벤트 발행
        this.eventEmitter.emit(
          'task.bulk-updated',
          new TaskBulkUpdatedEvent(
            futureTasks.map((t) => t.id),
            userId,
            before,
            changesAfter,
          ),
        );

        return tx.task.findUnique({
          where: { id: taskId },
          include: { category: true, recurring: true },
        });
      });

      return {
        ...updated,
        daysUntilDue: this.calculateDaysUntilDue(updated?.dueAt || null),
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

    // 이벤트 발행
    this.eventEmitter.emit(
      'task.completed',
      new TaskCompletedEvent(updated, userId, isCompleted),
    );

    // AFTER_COMPLETION 타입: 다음 Task 생성
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
    let deletedTaskIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      if (deleteScope === 'current' || !task.recurringId) {
        await tx.task.update({
          where: { id: taskId },
          data: { deletedAt: now },
        });
        deletedTaskIds = [taskId];
      } else if (deleteScope === 'future') {
        const futureTasks = await tx.task.findMany({
          where: {
            recurringId: task.recurringId,
            scheduledAt: { gte: task.scheduledAt || new Date() },
            deletedAt: null,
          },
        });
        deletedTaskIds = futureTasks.map((t) => t.id);

        await tx.task.updateMany({
          where: { id: { in: deletedTaskIds } },
          data: { deletedAt: now },
        });
      } else {
        const allTasks = await tx.task.findMany({
          where: { recurringId: task.recurringId, deletedAt: null },
        });
        deletedTaskIds = allTasks.map((t) => t.id);

        await tx.task.updateMany({
          where: { id: { in: deletedTaskIds } },
          data: { deletedAt: now },
        });
      }
    });

    // 이벤트 발행
    this.eventEmitter.emit(
      'task.deleted',
      new TaskDeletedEvent(deletedTaskIds, userId),
    );

    return { message: 'Task가 삭제되었습니다' };
  }

  // ==================== Private 헬퍼 메서드 ====================

  /**
   * 업데이트 데이터 빌드
   */
  private buildUpdateData(dto: UpdateTaskDto): {
    updateData: Prisma.TaskUpdateInput;
    changesAfter: Record<string, string | null>;
  } {
    const updateData: Prisma.TaskUpdateInput = {};
    const changesAfter: Record<string, string | null> = {};

    if (dto.title) {
      updateData.title = dto.title;
      changesAfter.title = dto.title;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
      changesAfter.description = dto.description ?? null;
    }
    if (dto.location !== undefined) {
      updateData.location = dto.location;
      changesAfter.location = dto.location ?? null;
    }
    if (dto.type) {
      updateData.type = dto.type;
      changesAfter.type = dto.type;
    }
    if (dto.priority) {
      updateData.priority = dto.priority;
      changesAfter.priority = dto.priority;
    }
    if (dto.scheduledAt) {
      updateData.scheduledAt = dto.scheduledAt;
      changesAfter.scheduledAt = dto.scheduledAt.toISOString();
    }
    if (dto.dueAt) {
      updateData.dueAt = dto.dueAt;
      changesAfter.dueAt = dto.dueAt.toISOString();
    }

    return { updateData, changesAfter };
  }

  /**
   * 참여자 Diff 계산
   */
  private async calculateParticipantDiff(
    taskId: string,
    participantIds?: string[],
  ): Promise<{
    newParticipantIds: string[];
    removedParticipantIds: string[];
  }> {
    if (participantIds === undefined) {
      return { newParticipantIds: [], removedParticipantIds: [] };
    }

    const existingParticipants = await this.prisma.taskParticipant.findMany({
      where: { taskId },
      select: { userId: true },
    });
    const existingIds = existingParticipants.map((p) => p.userId);

    return {
      newParticipantIds: participantIds.filter(
        (id) => !existingIds.includes(id),
      ),
      removedParticipantIds: existingIds.filter(
        (id) => !participantIds.includes(id),
      ),
    };
  }

  /**
   * 참여자 동기화 (트랜잭션 내부용)
   */
  private async syncParticipants(
    tx: Prisma.TransactionClient,
    taskId: string,
    groupId: string | null,
    participantIds: string[] | undefined,
    newParticipantIds: string[],
    removedParticipantIds: string[],
  ) {
    if (participantIds === undefined || !groupId) return;

    if (removedParticipantIds.length > 0) {
      await tx.taskParticipant.deleteMany({
        where: { taskId, userId: { in: removedParticipantIds } },
      });
    }

    if (newParticipantIds.length > 0) {
      await tx.taskParticipant.createMany({
        data: newParticipantIds.map((pUserId) => ({
          taskId,
          userId: pUserId,
        })),
      });
    }
  }

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
   * 참여자 유효성 검증
   */
  private async validateParticipants(
    groupId: string,
    participantIds: string[],
  ) {
    if (participantIds.length === 0) return;

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
  }

  /**
   * D-Day 계산
   */
  private calculateDaysUntilDue(dueAt: Date | null, now?: Date): number | null {
    if (!dueAt) return null;
    const currentTime = now || new Date();
    const due = new Date(dueAt);
    const diffTime = due.getTime() - currentTime.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
