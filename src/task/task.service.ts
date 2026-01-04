import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTaskDto,
  UpdateTaskDto,
  CompleteTaskDto,
  QueryTasksDto,
  SkipRecurringDto,
} from './dto';
import { TaskHistoryAction } from './enums';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ==================== 카테고리 관리 ====================

  /**
   * 카테고리 목록 조회 (개인 + 그룹)
   */
  async getCategories(userId: string, groupId?: string) {
    const where: any = {
      OR: [
        { userId, groupId: null }, // 개인 카테고리
      ],
    };

    if (groupId) {
      // 그룹 ID가 지정된 경우: 해당 그룹의 카테고리만
      const isMember = await this.checkGroupMember(userId, groupId);
      if (!isMember) {
        throw new ForbiddenException('그룹 멤버만 조회할 수 있습니다');
      }

      where.OR.push({ groupId });
    } else {
      // 그룹 ID가 없는 경우: 소속된 모든 그룹의 카테고리
      const memberships = await this.prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);
      if (groupIds.length > 0) {
        where.OR.push({ groupId: { in: groupIds } });
      }
    }

    return await this.prisma.category.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 카테고리 생성
   */
  async createCategory(userId: string, dto: CreateCategoryDto) {
    // 그룹 카테고리 생성 시 그룹 멤버 확인
    if (dto.groupId) {
      const isMember = await this.checkGroupMember(userId, dto.groupId);
      if (!isMember) {
        throw new ForbiddenException(
          '그룹 멤버만 카테고리를 생성할 수 있습니다',
        );
      }
    }

    return await this.prisma.category.create({
      data: {
        userId,
        groupId: dto.groupId || null,
        name: dto.name,
        description: dto.description || null,
        emoji: dto.emoji || null,
        color: dto.color || null,
      },
    });
  }

  /**
   * 카테고리 수정
   */
  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 카테고리만 수정할 수 있습니다',
      );
    }

    return await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        description: dto.description,
        emoji: dto.emoji,
        color: dto.color,
      },
    });
  }

  /**
   * 카테고리 삭제
   */
  async deleteCategory(userId: string, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { tasks: true },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException(
        '본인이 작성한 카테고리만 삭제할 수 있습니다',
      );
    }

    // 연결된 Task가 있으면 삭제 불가
    if (category.tasks.length > 0) {
      throw new ConflictException(
        '카테고리에 연결된 Task가 있어 삭제할 수 없습니다',
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: '카테고리가 삭제되었습니다' };
  }

  // ==================== Task 관리 ====================

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
      OR: [
        { userId }, // 개인 Task
      ],
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
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    // D-Day 계산
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
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task를 찾을 수 없습니다');
    }

    // 권한 확인: 본인 Task이거나 그룹 멤버인 경우
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

    // 반복 규칙 생성 (있는 경우)
    let recurringId: string | null = null;
    if (dto.recurring) {
      const recurring = await this.prisma.recurring.create({
        data: {
          userId,
          groupId: dto.groupId || null,
          ruleType: dto.recurring.ruleType,
          ruleConfig: dto.recurring.ruleConfig,
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
      include: {
        category: true,
        recurring: true,
      },
    });

    // TaskHistory 자동 생성
    await this.createTaskHistory(task.id, userId, TaskHistoryAction.CREATE);

    // 알림 생성 (있는 경우)
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

    // 그룹 Task인 경우 그룹 멤버에게 알림
    if (dto.groupId) {
      await this.sendGroupNotification(
        dto.groupId,
        userId,
        '새 일정이 추가되었습니다',
        task.title,
        { taskId: task.id, action: 'create' },
      );
    }

    return {
      ...task,
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

    // 반복 Task인 경우 updateScope 확인
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

    // 변경 이력 기록용 before 데이터
    const before = {
      title: task.title,
      description: task.description,
      priority: task.priority,
    };

    if (updateScope === 'current' || !task.recurringId) {
      // 현재 Task만 수정
      const updated = await this.prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: { category: true, recurring: true },
      });

      await this.createTaskHistory(taskId, userId, TaskHistoryAction.UPDATE, {
        before,
        after: updateData,
      });

      return {
        ...updated,
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
        daysUntilDue: this.calculateDaysUntilDue(updated.dueAt),
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
      // TODO: 다음 Task 자동 생성 로직 (향후 구현)
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

    // 반복 Task인 경우 deleteScope 확인
    if (task.recurringId && !deleteScope) {
      throw new ForbiddenException(
        '반복 Task는 deleteScope를 지정해야 합니다 (current, future, all)',
      );
    }

    const now = new Date();

    if (deleteScope === 'current' || !task.recurringId) {
      // 현재 Task만 삭제
      await this.prisma.task.update({
        where: { id: taskId },
        data: { deletedAt: now },
      });

      await this.createTaskHistory(taskId, userId, TaskHistoryAction.DELETE);
    } else if (deleteScope === 'future') {
      // 현재 + 미래 삭제
      const futureTasks = await this.prisma.task.findMany({
        where: {
          recurringId: task.recurringId,
          scheduledAt: { gte: task.scheduledAt || new Date() },
          deletedAt: null,
        },
      });

      await Promise.all([
        this.prisma.task.updateMany({
          where: {
            id: { in: futureTasks.map((t) => t.id) },
          },
          data: { deletedAt: now },
        }),
        ...futureTasks.map((t) =>
          this.createTaskHistory(t.id, userId, TaskHistoryAction.DELETE),
        ),
      ]);
    } else {
      // 과거 + 현재 + 미래 모두 삭제
      const allTasks = await this.prisma.task.findMany({
        where: {
          recurringId: task.recurringId,
          deletedAt: null,
        },
      });

      await Promise.all([
        this.prisma.task.updateMany({
          where: {
            id: { in: allTasks.map((t) => t.id) },
          },
          data: { deletedAt: now },
        }),
        ...allTasks.map((t) =>
          this.createTaskHistory(t.id, userId, TaskHistoryAction.DELETE),
        ),
      ]);
    }

    return { message: 'Task가 삭제되었습니다' };
  }

  // ==================== 반복 일정 관리 ====================

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

    // 그룹 반복 일정인 경우 그룹 멤버에게 알림
    if (recurring.groupId) {
      await this.sendGroupNotification(
        recurring.groupId,
        userId,
        '반복 일정이 건너뛰기 되었습니다',
        `${dto.skipDate} 일정이 건너뛰기 되었습니다`,
        { recurringId, skipDate: dto.skipDate },
      );
    }

    return skip;
  }

  /**
   * 반복 일정 Task 생성 (스케줄러용)
   */
  async generateRecurringTasks(recurringId: string) {
    // TODO: 반복 날짜 계산 및 Task 생성 로직
    // 미래 3개월 분량 생성, 건너뛰기 날짜 제외, 중복 방지
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
      where: {
        groupId_userId: { groupId, userId },
      },
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays; // 양수: 남은 일수, 음수: 지난 일수
  }

  /**
   * Task 변경 이력 자동 기록
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
}
