import { Prisma } from '@prisma/client';
import { QueryTasksDto } from '../dto';

/**
 * Task 조회 쿼리 빌더
 * 복잡한 조건 생성 로직을 TaskService에서 분리
 */
export class TaskQueryBuilder {
  /**
   * 사용자/그룹 기반 Task 조회 조건 생성
   * @param userId 사용자 ID
   * @param userGroupIds 사용자가 속한 그룹 ID 목록
   * @param query 조회 조건
   */
  static buildWhereClause(
    userId: string,
    userGroupIds: string[],
    query: QueryTasksDto,
  ): Prisma.TaskWhereInput {
    const orConditions: Prisma.TaskWhereInput[] = [];
    const includePersonal = query.includePersonal ?? true;

    // 개인 일정 포함
    if (includePersonal) {
      orConditions.push({ userId, groupId: null });
    }

    // 그룹 일정 필터링
    if (query.groupIds && query.groupIds.length > 0) {
      // 요청된 그룹 중 사용자가 속한 그룹만 필터링
      const validGroupIds = query.groupIds.filter((gid) =>
        userGroupIds.includes(gid),
      );
      if (validGroupIds.length > 0) {
        orConditions.push({ groupId: { in: validGroupIds } });
      }
    } else if (userGroupIds.length > 0) {
      // groupIds가 없으면 사용자가 속한 모든 그룹 조회
      orConditions.push({ groupId: { in: userGroupIds } });
    }

    // 조건이 없으면 빈 결과 반환
    if (orConditions.length === 0) {
      return { deletedAt: null, id: 'none' };
    }

    const andConditions: Prisma.TaskWhereInput[] = [
      { deletedAt: null },
      { OR: orConditions },
    ];

    // 필터링 조건 추가
    if (query.categoryIds && query.categoryIds.length > 0) {
      andConditions.push({ categoryId: { in: query.categoryIds } });
    }
    if (query.type) andConditions.push({ type: query.type });
    if (query.priority) andConditions.push({ priority: query.priority });
    if (query.status) andConditions.push({ status: query.status });

    // 날짜 범위 필터 (scheduledAt 또는 dueAt 기준)
    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeNullableFilter = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) dateFilter.lte = new Date(query.endDate);

      andConditions.push({
        OR: [{ scheduledAt: dateFilter }, { dueAt: dateFilter }],
      });
    }

    return { AND: andConditions };
  }

  /**
   * 정렬 조건 생성
   */
  static buildOrderBy(
    view: string = 'calendar',
  ): Prisma.TaskOrderByWithRelationInput[] {
    return view === 'calendar'
      ? [{ scheduledAt: 'asc' }]
      : [{ status: 'asc' }, { priority: 'desc' }, { dueAt: 'asc' }];
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
