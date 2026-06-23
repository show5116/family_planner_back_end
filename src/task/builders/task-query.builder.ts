import { Prisma } from '@prisma/client';
import { QueryTasksDto } from '../dto';
import { TaskType } from '../enums';

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
    const andConditions: Prisma.TaskWhereInput[] = [{ deletedAt: null }];

    // anniversaryId 지정 시 해당 기념일 Task만 조회 (소속 그룹 검증은 서비스 레이어)
    if (query.anniversaryId) {
      andConditions.push({ anniversaryId: query.anniversaryId });
    } else {
      // 일반 조회: 개인 + 그룹 OR 조건
      const orConditions: Prisma.TaskWhereInput[] = [];
      const includePersonal = query.includePersonal ?? true;

      if (includePersonal) {
        orConditions.push({ userId, groupId: null });
      }

      // groupIds가 명시적으로 전달된 경우에만 해당 그룹 일정 포함
      if (query.groupIds && query.groupIds.length > 0) {
        const validGroupIds = query.groupIds.filter((gid) =>
          userGroupIds.includes(gid),
        );
        if (validGroupIds.length > 0) {
          orConditions.push({ groupId: { in: validGroupIds } });
        }
      }

      if (orConditions.length === 0) {
        return { deletedAt: null, id: 'none' };
      }
      andConditions.push({ OR: orConditions });
    }

    // 필터링 조건 추가
    if (query.categoryIds && query.categoryIds.length > 0) {
      andConditions.push({ categoryId: { in: query.categoryIds } });
    }

    // type 필터: 명시적으로 지정된 경우 우선, 없으면 view 기반 자동 필터링
    if (query.type) {
      andConditions.push({ type: query.type });
    } else if (query.view === 'calendar') {
      andConditions.push({ type: { not: TaskType.TODO_ONLY } });
    } else if (query.view === 'todo') {
      andConditions.push({ type: { not: TaskType.CALENDAR_ONLY } });
    }
    if (query.priority) andConditions.push({ priority: query.priority });
    if (query.status) andConditions.push({ status: query.status });

    // 검색어 필터 (title, description, location)
    if (query.search) {
      const searchKeyword = query.search.trim();
      andConditions.push({
        OR: [
          { title: { contains: searchKeyword } },
          { description: { contains: searchKeyword } },
        ],
      });
    }

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
