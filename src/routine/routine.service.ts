import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Prisma, RoutineFrequencyType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineQueryDto } from './dto/routine-query.dto';
import { CheckRoutineDto } from './dto/check-routine.dto';
import { CreateRoutineShareDto } from './dto/create-routine-share.dto';
import { ReorderRoutineDto } from './dto/reorder-routine.dto';
import { RoutineBadgeService } from './routine-badge.service';
import { todayInKst, parseDateOnly } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    @Inject(forwardRef(() => RoutineBadgeService))
    private readonly routineBadgeService: RoutineBadgeService,
  ) {}

  private t(key: string) {
    return this.i18n.t(`routine.${key}`, {
      lang: I18nContext.current()?.lang ?? 'ko',
    });
  }

  async create(userId: string, dto: CreateRoutineDto) {
    const frequencyType =
      dto.frequencyType ?? RoutineFrequencyType.WEEKLY_COUNT;

    if (
      frequencyType === RoutineFrequencyType.WEEKLY_COUNT &&
      !dto.targetCount
    ) {
      throw new BadRequestException(this.t('errors.weekly_target_required'));
    }

    if (dto.routineGroupId) {
      await this.findOwnRoutineGroup(userId, dto.routineGroupId);
    }

    const routine = await this.prisma.routine.create({
      data: {
        userId,
        groupId: dto.routineGroupId,
        title: dto.title,
        emoji: dto.emoji,
        color: dto.color,
        frequencyType,
        targetCount: dto.targetCount,
        startDate: parseDateOnly(dto.startDate),
        endDate: dto.endDate ? parseDateOnly(dto.endDate) : undefined,
      },
    });

    return this.toResponse(routine, false);
  }

  async findAll(userId: string, query: RoutineQueryDto) {
    const where: Prisma.RoutineWhereInput = {
      userId,
      deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.routineGroupId !== undefined && {
        groupId: query.routineGroupId,
      }),
    };

    const routines = await this.prisma.routine.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
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

    return routines.map((r) => this.toResponse(r, checkedRoutineIds.has(r.id)));
  }

  async findOne(userId: string, id: string) {
    const routine = await this.findRoutineWithAccess(userId, id);
    const today = todayInKst();
    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate: today } },
    });

    return this.toResponse(routine, !!log);
  }

  async update(userId: string, id: string, dto: UpdateRoutineDto) {
    const routine = await this.findOwnRoutine(userId, id);

    const frequencyType = dto.frequencyType ?? routine.frequencyType;
    const targetCount = dto.targetCount ?? routine.targetCount;
    if (frequencyType === RoutineFrequencyType.WEEKLY_COUNT && !targetCount) {
      throw new BadRequestException(this.t('errors.weekly_target_required'));
    }

    if (dto.routineGroupId) {
      await this.findOwnRoutineGroup(userId, dto.routineGroupId);
    }

    const updated = await this.prisma.routine.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.frequencyType !== undefined && {
          frequencyType: dto.frequencyType,
        }),
        ...(dto.targetCount !== undefined && { targetCount: dto.targetCount }),
        ...(dto.startDate !== undefined && {
          startDate: parseDateOnly(dto.startDate),
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? parseDateOnly(dto.endDate) : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.routineGroupId !== undefined && {
          groupId: dto.routineGroupId,
        }),
      },
    });

    const today = todayInKst();
    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate: today } },
    });

    return this.toResponse(updated, !!log);
  }

  async remove(userId: string, id: string) {
    await this.findOwnRoutine(userId, id);

    await this.prisma.routine.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: this.t('success.routine_deleted') };
  }

  async reorder(userId: string, dto: ReorderRoutineDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.routine.updateMany({
          where: { id: item.id, userId, deletedAt: null },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.findAll(userId, {});
  }

  async check(userId: string, id: string, dto: CheckRoutineDto) {
    await this.findOwnRoutine(userId, id);

    const checkedDate = dto.date ? parseDateOnly(dto.date) : todayInKst();
    if (checkedDate.getTime() > todayInKst().getTime()) {
      throw new BadRequestException(this.t('errors.future_date_not_allowed'));
    }

    const existing = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate } },
    });
    if (existing) {
      throw new ConflictException(this.t('errors.already_checked'));
    }

    const log = await this.prisma.routineLog.create({
      data: {
        routineId: id,
        userId,
        checkedDate,
        note: dto.note,
      },
    });

    const newlyEarnedBadges = await this.routineBadgeService
      .evaluateAndAward(userId, id)
      .catch((err) => {
        this.logger.error(`배지 평가 실패 (routineId=${id}): ${err.message}`);
        return [];
      });

    return { ...log, newlyEarnedBadges };
  }

  async uncheck(userId: string, id: string, dateStr?: string) {
    await this.findOwnRoutine(userId, id);

    const checkedDate = dateStr ? parseDateOnly(dateStr) : todayInKst();

    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate } },
    });
    if (!log) {
      throw new NotFoundException(this.t('errors.log_not_found'));
    }

    await this.prisma.routineLog.delete({ where: { id: log.id } });

    return { message: this.t('success.check_removed') };
  }

  async addShare(userId: string, id: string, dto: CreateRoutineShareDto) {
    await this.findOwnRoutine(userId, id);
    await this.validateGroupMembership(userId, dto.groupId);

    const existing = await this.prisma.routineShare.findUnique({
      where: { routineId_groupId: { routineId: id, groupId: dto.groupId } },
    });
    if (existing) {
      throw new ConflictException(this.t('errors.already_shared'));
    }

    const share = await this.prisma.routineShare.create({
      data: { routineId: id, groupId: dto.groupId },
      include: { group: { select: { name: true } } },
    });

    return {
      id: share.id,
      routineId: share.routineId,
      groupId: share.groupId,
      groupName: share.group.name,
      createdAt: share.createdAt,
    };
  }

  async removeShare(userId: string, id: string, groupId: string) {
    await this.findOwnRoutine(userId, id);

    const share = await this.prisma.routineShare.findUnique({
      where: { routineId_groupId: { routineId: id, groupId } },
    });
    if (!share) {
      throw new NotFoundException(this.t('errors.share_not_found'));
    }

    await this.prisma.routineShare.delete({ where: { id: share.id } });

    return { message: this.t('success.share_removed') };
  }

  async findShares(userId: string, id: string) {
    await this.findOwnRoutine(userId, id);

    const shares = await this.prisma.routineShare.findMany({
      where: { routineId: id },
      include: { group: { select: { name: true } } },
    });

    return shares.map((s) => ({
      id: s.id,
      routineId: s.routineId,
      groupId: s.groupId,
      groupName: s.group.name,
      createdAt: s.createdAt,
    }));
  }

  async findGroupMembers(userId: string, groupId: string) {
    await this.validateGroupMembership(userId, groupId);

    const shares = await this.prisma.routineShare.findMany({
      where: { groupId },
      include: {
        routine: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    const activeShares = shares.filter((s) => !s.routine.deletedAt);
    const routineIds = activeShares.map((s) => s.routineId);
    const today = todayInKst();
    const todayLogs = await this.prisma.routineLog.findMany({
      where: { routineId: { in: routineIds }, checkedDate: today },
      select: { routineId: true },
    });
    const checkedRoutineIds = new Set(todayLogs.map((l) => l.routineId));

    const memberMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        routines: ReturnType<typeof this.toResponse>[];
      }
    >();

    for (const share of activeShares) {
      const owner = share.routine.user;
      let member = memberMap.get(owner.id);
      if (!member) {
        member = { userId: owner.id, userName: owner.name, routines: [] };
        memberMap.set(owner.id, member);
      }
      member.routines.push(
        this.toResponse(share.routine, checkedRoutineIds.has(share.routineId)),
      );
    }

    return Array.from(memberMap.values());
  }

  async findGroupMemberDetail(
    userId: string,
    groupId: string,
    targetUserId: string,
  ) {
    await this.validateGroupMembership(userId, groupId);

    const shares = await this.prisma.routineShare.findMany({
      where: { groupId, routine: { userId: targetUserId, deletedAt: null } },
      include: { routine: true },
    });

    const routineIds = shares.map((s) => s.routineId);
    const today = todayInKst();
    const todayLogs = await this.prisma.routineLog.findMany({
      where: { routineId: { in: routineIds }, checkedDate: today },
      select: { routineId: true },
    });
    const checkedRoutineIds = new Set(todayLogs.map((l) => l.routineId));

    return shares.map((s) =>
      this.toResponse(s.routine, checkedRoutineIds.has(s.routineId)),
    );
  }

  /** 통계 서비스에서 재사용하는 소유권/공유 접근 검증 */
  async findRoutineWithAccess(userId: string, id: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, deletedAt: null },
    });
    if (!routine) {
      throw new NotFoundException(this.t('errors.routine_not_found'));
    }

    if (routine.userId === userId) {
      return routine;
    }

    const sharedGroupIds = (
      await this.prisma.routineShare.findMany({
        where: { routineId: id },
        select: { groupId: true },
      })
    ).map((s) => s.groupId);

    if (sharedGroupIds.length === 0) {
      throw new ForbiddenException(this.t('errors.no_access'));
    }

    const membership = await this.prisma.groupMember.findFirst({
      where: { userId, groupId: { in: sharedGroupIds } },
    });
    if (!membership) {
      throw new ForbiddenException(this.t('errors.no_access'));
    }

    return routine;
  }

  private async findOwnRoutine(userId: string, id: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, deletedAt: null },
    });
    if (!routine) {
      throw new NotFoundException(this.t('errors.routine_not_found'));
    }
    if (routine.userId !== userId) {
      throw new ForbiddenException(this.t('errors.own_routine_only_update'));
    }
    return routine;
  }

  private async validateGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new ForbiddenException(this.t('errors.no_group_access'));
    }
  }

  private toResponse(
    routine: {
      id: string;
      groupId: string | null;
      title: string;
      emoji: string | null;
      color: string | null;
      frequencyType: RoutineFrequencyType;
      targetCount: number | null;
      startDate: Date;
      endDate: Date | null;
      isActive: boolean;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    },
    checkedToday: boolean,
  ) {
    return {
      id: routine.id,
      title: routine.title,
      emoji: routine.emoji,
      color: routine.color,
      frequencyType: routine.frequencyType,
      targetCount: routine.targetCount,
      startDate: routine.startDate,
      endDate: routine.endDate,
      isActive: routine.isActive,
      sortOrder: routine.sortOrder,
      checkedToday,
      routineGroupId: routine.groupId,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    };
  }

  /** 그룹 소속 검증용: RoutineGroupService에서도 재사용 */
  async findOwnRoutineGroup(userId: string, groupId: string) {
    const group = await this.prisma.routineGroup.findFirst({
      where: { id: groupId, deletedAt: null },
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
}
