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
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutineQueryDto } from './dto/routine-query.dto';
import { CheckRoutineDto } from './dto/check-routine.dto';
import { CreateRoutineShareDto } from './dto/create-routine-share.dto';
import { ReorderRoutineDto } from './dto/reorder-routine.dto';
import { RoutineBadgeService } from './routine-badge.service';
import {
  RoutineFrequencyType,
  RoutineWeeklyMode,
  RoutineRecordType,
  RoutineStatus,
} from '@/routine/enums';
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

  /** frequencyType/weeklyMode/targetCount/targetDays 조합이 유효한지 검증 */
  private validateFrequencyCombo(input: {
    frequencyType: RoutineFrequencyType;
    weeklyMode?: RoutineWeeklyMode | null;
    targetCount?: number | null;
    targetDays?: number[] | null;
  }) {
    const { frequencyType, weeklyMode, targetCount, targetDays } = input;

    if (frequencyType === RoutineFrequencyType.DAILY) {
      if (weeklyMode || targetCount || (targetDays && targetDays.length > 0)) {
        throw new BadRequestException(this.t('errors.invalid_frequency_combo'));
      }
      return;
    }

    if (frequencyType === RoutineFrequencyType.WEEKLY) {
      if (!weeklyMode) {
        throw new BadRequestException(this.t('errors.weekly_mode_required'));
      }
      if (weeklyMode === RoutineWeeklyMode.COUNT_ONLY) {
        if (!targetCount) {
          throw new BadRequestException(
            this.t('errors.weekly_target_required'),
          );
        }
        if (targetDays && targetDays.length > 0) {
          throw new BadRequestException(
            this.t('errors.invalid_frequency_combo'),
          );
        }
      } else {
        if (!targetDays || targetDays.length === 0) {
          throw new BadRequestException(this.t('errors.fixed_days_required'));
        }
        if (targetCount) {
          throw new BadRequestException(
            this.t('errors.invalid_frequency_combo'),
          );
        }
      }
      return;
    }

    if (frequencyType === RoutineFrequencyType.MONTHLY) {
      if (!targetCount) {
        throw new BadRequestException(this.t('errors.monthly_target_required'));
      }
      if (weeklyMode || (targetDays && targetDays.length > 0)) {
        throw new BadRequestException(this.t('errors.invalid_frequency_combo'));
      }
    }
  }

  async create(userId: string, dto: CreateRoutineDto) {
    const frequencyType = dto.frequencyType ?? RoutineFrequencyType.WEEKLY;

    this.validateFrequencyCombo({
      frequencyType,
      weeklyMode: dto.weeklyMode,
      targetCount: dto.targetCount,
      targetDays: dto.targetDays,
    });

    if (dto.routineGroupId) {
      await this.findOwnRoutineGroup(userId, dto.routineGroupId);
    }
    if (dto.categoryId) {
      await this.findOwnRoutineCategory(userId, dto.categoryId);
    }

    const routine = await this.prisma.routine.create({
      data: {
        userId,
        groupId: dto.routineGroupId,
        categoryId: dto.categoryId,
        title: dto.title,
        emoji: dto.emoji,
        color: dto.color,
        memo: dto.memo,
        importance: dto.importance,
        timeFilter: dto.timeFilter,
        recordType: dto.recordType,
        frequencyType,
        weeklyMode: dto.weeklyMode,
        targetCount: dto.targetCount,
        targetDays: dto.targetDays,
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
      ...(query.status !== undefined && { status: query.status }),
      ...(query.routineGroupId !== undefined && {
        groupId: query.routineGroupId,
      }),
      ...(query.categoryId !== undefined && { categoryId: query.categoryId }),
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
    const weeklyMode =
      dto.weeklyMode !== undefined ? dto.weeklyMode : routine.weeklyMode;
    const targetCount =
      dto.targetCount !== undefined ? dto.targetCount : routine.targetCount;
    const targetDays =
      dto.targetDays !== undefined
        ? dto.targetDays
        : (routine.targetDays as number[] | null);

    this.validateFrequencyCombo({
      frequencyType,
      weeklyMode,
      targetCount,
      targetDays,
    });

    if (dto.routineGroupId) {
      await this.findOwnRoutineGroup(userId, dto.routineGroupId);
    }
    if (dto.categoryId) {
      await this.findOwnRoutineCategory(userId, dto.categoryId);
    }

    const updated = await this.prisma.routine.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.emoji !== undefined && { emoji: dto.emoji }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        ...(dto.importance !== undefined && { importance: dto.importance }),
        ...(dto.timeFilter !== undefined && { timeFilter: dto.timeFilter }),
        ...(dto.recordType !== undefined && { recordType: dto.recordType }),
        ...(dto.frequencyType !== undefined && {
          frequencyType: dto.frequencyType,
        }),
        ...(dto.weeklyMode !== undefined && { weeklyMode: dto.weeklyMode }),
        ...(dto.targetCount !== undefined && { targetCount: dto.targetCount }),
        ...(dto.targetDays !== undefined && { targetDays: dto.targetDays }),
        ...(dto.startDate !== undefined && {
          startDate: parseDateOnly(dto.startDate),
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? parseDateOnly(dto.endDate) : null,
        }),
        ...(dto.routineGroupId !== undefined && {
          groupId: dto.routineGroupId,
        }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      },
    });

    const today = todayInKst();
    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate: today } },
    });

    return this.toResponse(updated, !!log);
  }

  async pause(userId: string, id: string) {
    const routine = await this.findOwnRoutine(userId, id);

    if (routine.status === RoutineStatus.ENDED) {
      throw new BadRequestException(this.t('errors.cannot_pause_ended'));
    }
    if (routine.status === RoutineStatus.PAUSED) {
      throw new ConflictException(this.t('errors.already_paused'));
    }

    const today = todayInKst();
    const [updated] = await this.prisma.$transaction([
      this.prisma.routine.update({
        where: { id },
        data: { status: RoutineStatus.PAUSED },
      }),
      this.prisma.routinePause.create({
        data: { routineId: id, pausedFrom: today },
      }),
    ]);

    return this.toResponse(updated, false);
  }

  async resume(userId: string, id: string) {
    const routine = await this.findOwnRoutine(userId, id);

    if (routine.status !== RoutineStatus.PAUSED) {
      throw new ConflictException(this.t('errors.not_paused'));
    }

    const openPause = await this.prisma.routinePause.findFirst({
      where: { routineId: id, pausedTo: null },
      orderBy: { pausedFrom: 'desc' },
    });

    const today = todayInKst();
    const ops = [
      this.prisma.routine.update({
        where: { id },
        data: { status: RoutineStatus.ACTIVE },
      }),
    ];
    if (openPause) {
      ops.push(
        this.prisma.routinePause.update({
          where: { id: openPause.id },
          data: { pausedTo: today },
        }) as unknown as (typeof ops)[number],
      );
    }
    const [updated] = await this.prisma.$transaction(ops);

    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate: today } },
    });

    return this.toResponse(updated, !!log);
  }

  /** 루틴 종료 (soft delete, 체크 기록은 보존) */
  async end(userId: string, id: string) {
    const routine = await this.findOwnRoutine(userId, id);

    const today = todayInKst();
    const ops = [
      this.prisma.routine.update({
        where: { id },
        data: { status: RoutineStatus.ENDED, deletedAt: new Date() },
      }),
    ];
    if (routine.status === RoutineStatus.PAUSED) {
      const openPause = await this.prisma.routinePause.findFirst({
        where: { routineId: id, pausedTo: null },
        orderBy: { pausedFrom: 'desc' },
      });
      if (openPause) {
        ops.push(
          this.prisma.routinePause.update({
            where: { id: openPause.id },
            data: { pausedTo: today },
          }) as unknown as (typeof ops)[number],
        );
      }
    }

    await this.prisma.$transaction(ops);

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
    const routine = await this.findOwnRoutine(userId, id);

    if (routine.status === RoutineStatus.PAUSED) {
      throw new BadRequestException(this.t('errors.routine_paused'));
    }
    if (routine.status === RoutineStatus.ENDED) {
      throw new BadRequestException(this.t('errors.routine_ended'));
    }

    this.validateRecordValue(routine.recordType, dto);

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
        textValue: dto.textValue,
        numericValue: dto.numericValue,
        timeValue: dto.timeValue,
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

  /** recordType에 맞는 값만 제공됐는지 검증 (BOOLEAN=값 없음, 그 외=해당 값 필수+나머지 없음) */
  private validateRecordValue(
    recordType: RoutineRecordType,
    dto: CheckRoutineDto,
  ) {
    const provided = {
      textValue: dto.textValue !== undefined,
      numericValue: dto.numericValue !== undefined,
      timeValue: dto.timeValue !== undefined,
    };
    const anyProvided =
      provided.textValue || provided.numericValue || provided.timeValue;

    if (recordType === RoutineRecordType.BOOLEAN) {
      if (anyProvided) {
        throw new BadRequestException(this.t('errors.record_type_mismatch'));
      }
      return;
    }

    const requiredField =
      recordType === RoutineRecordType.TEXT
        ? 'textValue'
        : recordType === RoutineRecordType.NUMERIC
          ? 'numericValue'
          : 'timeValue';

    if (!provided[requiredField]) {
      throw new BadRequestException(this.t('errors.record_value_required'));
    }
    const otherFields = (
      ['textValue', 'numericValue', 'timeValue'] as const
    ).filter((f) => f !== requiredField);
    if (otherFields.some((f) => provided[f])) {
      throw new BadRequestException(this.t('errors.record_type_mismatch'));
    }
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
      categoryId: string | null;
      title: string;
      emoji: string | null;
      color: string | null;
      memo: string | null;
      importance: string;
      timeFilter: string | null;
      recordType: string;
      status: string;
      frequencyType: string;
      weeklyMode: string | null;
      targetCount: number | null;
      targetDays: Prisma.JsonValue;
      startDate: Date;
      endDate: Date | null;
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
      memo: routine.memo,
      importance: routine.importance,
      timeFilter: routine.timeFilter,
      categoryId: routine.categoryId,
      recordType: routine.recordType,
      status: routine.status,
      frequencyType: routine.frequencyType,
      weeklyMode: routine.weeklyMode,
      targetCount: routine.targetCount,
      targetDays: (routine.targetDays as number[] | null) ?? null,
      startDate: routine.startDate,
      endDate: routine.endDate,
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

  /** 카테고리 소속 검증용: RoutineCategoryService에서도 재사용 */
  async findOwnRoutineCategory(userId: string, categoryId: string) {
    const category = await this.prisma.routineCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(this.t('errors.routine_category_not_found'));
    }
    if (category.userId !== userId) {
      throw new ForbiddenException(
        this.t('errors.own_routine_category_only_update'),
      );
    }
    return category;
  }
}
