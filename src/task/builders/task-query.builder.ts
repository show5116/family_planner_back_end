import { Prisma } from '@prisma/client';
import { QueryTasksDto } from '../dto';

/**
 * Task 조회 쿼리 빌더
 * 복잡한 조건 생성 로직을 TaskService에서 분리
 */
export class TaskQueryBuilder {
  /**
   * 사용자/그룹 기반 Task 조회 조건 생성
   */
  static buildWhereClause(
    userId: string,
    groupIds: string[],
    query: QueryTasksDto,
    specificGroupId?: string,
  ): Prisma.TaskWhereInput {
    const orConditions: Prisma.TaskWhereInput[] = [{ userId }];

    // 특정 그룹 지정 또는 사용자가 속한 모든 그룹
    if (specificGroupId) {
      orConditions.push({ groupId: specificGroupId });
    } else if (groupIds.length > 0) {
      orConditions.push({ groupId: { in: groupIds } });
    }

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      OR: orConditions,
    };

    // 필터링 조건 추가
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.isCompleted !== undefined) where.isCompleted = query.isCompleted;

    // 날짜 범위 필터
    if (query.startDate || query.endDate) {
      where.scheduledAt = {};
      if (query.startDate) {
        (where.scheduledAt as Prisma.DateTimeNullableFilter).gte = new Date(
          query.startDate,
        );
      }
      if (query.endDate) {
        (where.scheduledAt as Prisma.DateTimeNullableFilter).lte = new Date(
          query.endDate,
        );
      }
    }

    return where;
  }

  /**
   * 정렬 조건 생성
   */
  static buildOrderBy(
    view: string = 'calendar',
  ): Prisma.TaskOrderByWithRelationInput[] {
    return view === 'calendar'
      ? [{ scheduledAt: 'asc' }]
      : [{ isCompleted: 'asc' }, { priority: 'desc' }, { dueAt: 'asc' }];
  }

  /**
   * Task 목록 조회용 include 옵션
   */
  static getListInclude(): Prisma.TaskInclude {
    return {
      category: true,
      recurring: true,
      participants: {
        include: {
          user: {
            select: { id: true, name: true, profileImageKey: true },
          },
        },
      },
    };
  }

  /**
   * Task 상세 조회용 include 옵션
   */
  static getDetailInclude(): Prisma.TaskInclude {
    return {
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
    };
  }
}
