import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoutineGroupDto } from './dto/create-routine-group.dto';
import { UpdateRoutineGroupDto } from './dto/update-routine-group.dto';
import { ReorderRoutineGroupDto } from './dto/reorder-routine-group.dto';
import { RoutineService } from './routine.service';
import { RoutineStatus } from '@/routine/enums';
import { todayInKst } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    @Inject(forwardRef(() => RoutineService))
    private readonly routineService: RoutineService,
  ) {}

  private t(key: string) {
    return this.i18n.t(`routine.${key}`, {
      lang: I18nContext.current()?.lang ?? 'ko',
    });
  }

  async create(userId: string, dto: CreateRoutineGroupDto) {
    const sortOrder = await this.getNextSortOrder(userId);

    const group = await this.prisma.routineGroup.create({
      data: {
        userId,
        title: dto.title,
        emoji: dto.emoji,
        color: dto.color,
        sortOrder,
      },
    });

    return this.toResponse(group, { checked: 0, total: 0 });
  }

  async findAll(userId: string) {
    const groups = await this.prisma.routineGroup.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const progressMap = await this.calculateProgress(
      userId,
      groups.map((g) => g.id),
    );

    return groups.map((g) =>
      this.toResponse(g, progressMap.get(g.id) ?? { checked: 0, total: 0 }),
    );
  }

  async findOne(userId: string, id: string) {
    const group = await this.findOwnGroup(userId, id);

    const routines = await this.routineService.findAll(userId, {
      routineGroupId: id,
    });

    const total = routines.filter(
      (r) => r.status === RoutineStatus.ACTIVE,
    ).length;
    const checked = routines.filter(
      (r) => r.status === RoutineStatus.ACTIVE && r.checkedToday,
    ).length;

    return {
      ...this.toResponse(group, { checked, total }),
      routines,
    };
  }

  async update(userId: string, id: string, dto: UpdateRoutineGroupDto) {
    await this.findOwnGroup(userId, id);

    const updated = await this.prisma.routineGroup.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });

    const progressMap = await this.calculateProgress(userId, [id]);
    return this.toResponse(
      updated,
      progressMap.get(id) ?? { checked: 0, total: 0 },
    );
  }

  async remove(userId: string, id: string) {
    await this.findOwnGroup(userId, id);

    await this.prisma.$transaction([
      this.prisma.routine.updateMany({
        where: { groupId: id },
        data: { groupId: null },
      }),
      this.prisma.routineGroup.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);

    return { message: this.t('success.routine_group_deleted') };
  }

  async reorder(userId: string, dto: ReorderRoutineGroupDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.routineGroup.updateMany({
          where: { id: item.id, userId, deletedAt: null },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.findAll(userId);
  }

  /** 사용자 소유 그룹 중 현재 최댓값+1을 신규 그룹의 정렬 순서로 반환 */
  private async getNextSortOrder(userId: string): Promise<number> {
    const result = await this.prisma.routineGroup.aggregate({
      where: { userId, deletedAt: null },
      _max: { sortOrder: true },
    });
    return (result._max.sortOrder ?? -1) + 1;
  }

  private async findOwnGroup(userId: string, id: string) {
    const group = await this.prisma.routineGroup.findFirst({
      where: { id, deletedAt: null },
    });
    if (!group) {
      throw new NotFoundException(this.t('errors.routine_group_not_found'));
    }
    if (group.userId !== userId) {
      throw new ForbiddenException(
        this.t('errors.own_routine_group_only_update'),
      );
    }
    return group;
  }

  private async calculateProgress(userId: string, groupIds: string[]) {
    const progressMap = new Map<string, { checked: number; total: number }>();
    if (groupIds.length === 0) return progressMap;

    const routines = await this.prisma.routine.findMany({
      where: {
        userId,
        groupId: { in: groupIds },
        status: RoutineStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, groupId: true },
    });

    const today = todayInKst();
    const todayLogs = await this.prisma.routineLog.findMany({
      where: {
        routineId: { in: routines.map((r) => r.id) },
        checkedDate: today,
      },
      select: { routineId: true },
    });
    const checkedRoutineIds = new Set(todayLogs.map((l) => l.routineId));

    for (const routine of routines) {
      if (!routine.groupId) continue;
      const progress = progressMap.get(routine.groupId) ?? {
        checked: 0,
        total: 0,
      };
      progress.total += 1;
      if (checkedRoutineIds.has(routine.id)) progress.checked += 1;
      progressMap.set(routine.groupId, progress);
    }

    return progressMap;
  }

  private toResponse(
    group: {
      id: string;
      title: string;
      emoji: string | null;
      color: string | null;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    },
    todayProgress: { checked: number; total: number },
  ) {
    return {
      id: group.id,
      title: group.title,
      emoji: group.emoji,
      color: group.color,
      sortOrder: group.sortOrder,
      todayProgress,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}
