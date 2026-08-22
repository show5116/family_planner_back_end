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
import { CreateRoutineCategoryLinkDto } from './dto/create-routine-category-link.dto';
import { ReorderRoutineDto } from './dto/reorder-routine.dto';
import { UpdateDailyGoalInclusionsDto } from './dto/update-daily-goal-inclusions.dto';
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
    const includeInDailyGoal =
      dto.includeInDailyGoal ?? frequencyType === RoutineFrequencyType.DAILY;

    this.validateFrequencyCombo({
      frequencyType,
      weeklyMode: dto.weeklyMode,
      targetCount: dto.targetCount,
      targetDays: dto.targetDays,
    });

    if (dto.routineGroupId) {
      await this.findOwnRoutineGroup(userId, dto.routineGroupId);
    }
    if (dto.categoryIds?.length) {
      for (const categoryId of dto.categoryIds) {
        await this.findOwnRoutineCategory(userId, categoryId);
      }
    }

    const sortOrder = await this.getNextRoutineSortOrder(
      userId,
      dto.routineGroupId,
    );

    const routine = await this.prisma.routine.create({
      data: {
        userId,
        groupId: dto.routineGroupId,
        sortOrder,
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
        includeInDailyGoal,
        ...(dto.categoryIds?.length && {
          categoryLinks: {
            create: dto.categoryIds.map((categoryId) => ({ categoryId })),
          },
        }),
      },
    });

    return this.toResponse(routine, null, dto.categoryIds ?? []);
  }

  async findAll(userId: string, query: RoutineQueryDto) {
    const where: Prisma.RoutineWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status !== undefined && { status: query.status }),
      ...(query.routineGroupId !== undefined && {
        groupId: query.routineGroupId,
      }),
      ...(query.categoryId !== undefined && {
        categoryLinks: { some: { categoryId: query.categoryId } },
      }),
    };

    const routines = await this.prisma.routine.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const targetDate = query.date ? parseDateOnly(query.date) : todayInKst();
    const logs = await this.prisma.routineLog.findMany({
      where: {
        routineId: { in: routines.map((r) => r.id) },
        checkedDate: targetDate,
      },
    });
    const logsByRoutine = new Map(logs.map((l) => [l.routineId, l]));
    const categoryIdsByRoutine = await this.batchFetchCategoryIds(
      routines.map((r) => r.id),
    );

    return routines.map((r) =>
      this.toResponse(
        r,
        logsByRoutine.get(r.id) ?? null,
        categoryIdsByRoutine.get(r.id) ?? [],
      ),
    );
  }

  async findOne(userId: string, id: string) {
    const routine = await this.findRoutineWithAccess(userId, id);
    const today = todayInKst();
    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate: today } },
    });
    const categoryIds = await this.fetchCategoryIds(id);

    return this.toResponse(routine, log, categoryIds);
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
    if (dto.categoryIds?.length) {
      for (const categoryId of dto.categoryIds) {
        await this.findOwnRoutineCategory(userId, categoryId);
      }
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.routine.update({
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
          ...(dto.targetCount !== undefined && {
            targetCount: dto.targetCount,
          }),
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
          ...(dto.includeInDailyGoal !== undefined && {
            includeInDailyGoal: dto.includeInDailyGoal,
          }),
        },
      }),
      ...(dto.categoryIds !== undefined
        ? [
            this.prisma.routineCategoryLink.deleteMany({
              where: { routineId: id },
            }),
            ...(dto.categoryIds.length
              ? [
                  this.prisma.routineCategoryLink.createMany({
                    data: dto.categoryIds.map((categoryId) => ({
                      routineId: id,
                      categoryId,
                    })),
                  }),
                ]
              : []),
          ]
        : []),
    ]);

    const today = todayInKst();
    const log = await this.prisma.routineLog.findUnique({
      where: { routineId_checkedDate: { routineId: id, checkedDate: today } },
    });
    const categoryIds =
      dto.categoryIds !== undefined
        ? dto.categoryIds
        : await this.fetchCategoryIds(id);

    return this.toResponse(updated, log, categoryIds);
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

    const categoryIds = await this.fetchCategoryIds(id);
    return this.toResponse(updated, null, categoryIds);
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
    const categoryIds = await this.fetchCategoryIds(id);

    return this.toResponse(updated, log, categoryIds);
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

  async updateDailyGoalInclusions(
    userId: string,
    dto: UpdateDailyGoalInclusionsDto,
  ) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.routine.updateMany({
          where: { id: item.id, userId, deletedAt: null },
          data: { includeInDailyGoal: item.includeInDailyGoal },
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

  async addCategory(
    userId: string,
    id: string,
    dto: CreateRoutineCategoryLinkDto,
  ) {
    await this.findOwnRoutine(userId, id);
    await this.findOwnRoutineCategory(userId, dto.categoryId);

    const existing = await this.prisma.routineCategoryLink.findUnique({
      where: {
        routineId_categoryId: { routineId: id, categoryId: dto.categoryId },
      },
    });
    if (existing) {
      throw new ConflictException(this.t('errors.already_categorized'));
    }

    const link = await this.prisma.routineCategoryLink.create({
      data: { routineId: id, categoryId: dto.categoryId },
      include: { category: { select: { title: true } } },
    });

    return {
      id: link.id,
      routineId: link.routineId,
      categoryId: link.categoryId,
      categoryTitle: link.category.title,
      createdAt: link.createdAt,
    };
  }

  async removeCategory(userId: string, id: string, categoryId: string) {
    await this.findOwnRoutine(userId, id);

    const link = await this.prisma.routineCategoryLink.findUnique({
      where: { routineId_categoryId: { routineId: id, categoryId } },
    });
    if (!link) {
      throw new NotFoundException(this.t('errors.category_link_not_found'));
    }

    await this.prisma.routineCategoryLink.delete({ where: { id: link.id } });

    return { message: this.t('success.category_link_removed') };
  }

  async findCategories(userId: string, id: string) {
    await this.findOwnRoutine(userId, id);

    const links = await this.prisma.routineCategoryLink.findMany({
      where: { routineId: id },
      include: { category: { select: { title: true } } },
    });

    return links.map((l) => ({
      id: l.id,
      routineId: l.routineId,
      categoryId: l.categoryId,
      categoryTitle: l.category.title,
      createdAt: l.createdAt,
    }));
  }

  /** 단일 루틴의 연결된 카테고리 ID 목록 조회 */
  private async fetchCategoryIds(routineId: string): Promise<string[]> {
    const links = await this.prisma.routineCategoryLink.findMany({
      where: { routineId },
      select: { categoryId: true },
    });
    return links.map((l) => l.categoryId);
  }

  /** 여러 루틴의 카테고리 ID 목록을 한 번에 배치 조회 (N+1 방지) */
  private async batchFetchCategoryIds(
    routineIds: string[],
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (routineIds.length === 0) return map;

    const links = await this.prisma.routineCategoryLink.findMany({
      where: { routineId: { in: routineIds } },
      select: { routineId: true, categoryId: true },
    });
    for (const link of links) {
      const list = map.get(link.routineId) ?? [];
      list.push(link.categoryId);
      map.set(link.routineId, list);
    }
    return map;
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
    });
    const logsByRoutine = new Map(todayLogs.map((l) => [l.routineId, l]));
    const categoryIdsByRoutine = await this.batchFetchCategoryIds(routineIds);

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
        this.toResponse(
          share.routine,
          logsByRoutine.get(share.routineId) ?? null,
          categoryIdsByRoutine.get(share.routineId) ?? [],
        ),
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
    });
    const logsByRoutine = new Map(todayLogs.map((l) => [l.routineId, l]));
    const categoryIdsByRoutine = await this.batchFetchCategoryIds(routineIds);

    return shares.map((s) =>
      this.toResponse(
        s.routine,
        logsByRoutine.get(s.routineId) ?? null,
        categoryIdsByRoutine.get(s.routineId) ?? [],
      ),
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

  /** 같은 스코프(routineGroupId 소속 여부) 내 현재 최댓값+1을 신규 루틴의 정렬 순서로 반환 */
  private async getNextRoutineSortOrder(
    userId: string,
    routineGroupId?: string,
  ): Promise<number> {
    const result = await this.prisma.routine.aggregate({
      where: {
        userId,
        deletedAt: null,
        groupId: routineGroupId ?? null,
      },
      _max: { sortOrder: true },
    });
    return (result._max.sortOrder ?? -1) + 1;
  }

  private toResponse(
    routine: {
      id: string;
      groupId: string | null;
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
      includeInDailyGoal: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    checkedLog: {
      note: string | null;
      textValue: string | null;
      numericValue: Prisma.Decimal | null;
      timeValue: string | null;
    } | null,
    categoryIds: string[],
  ) {
    return {
      id: routine.id,
      title: routine.title,
      emoji: routine.emoji,
      color: routine.color,
      memo: routine.memo,
      importance: routine.importance,
      timeFilter: routine.timeFilter,
      categoryIds,
      recordType: routine.recordType,
      status: routine.status,
      frequencyType: routine.frequencyType,
      weeklyMode: routine.weeklyMode,
      targetCount: routine.targetCount,
      targetDays: (routine.targetDays as number[] | null) ?? null,
      startDate: routine.startDate,
      endDate: routine.endDate,
      sortOrder: routine.sortOrder,
      includeInDailyGoal: routine.includeInDailyGoal,
      checkedToday: !!checkedLog,
      checkedLog: checkedLog
        ? {
            note: checkedLog.note,
            textValue: checkedLog.textValue,
            numericValue: checkedLog.numericValue
              ? Number(checkedLog.numericValue)
              : null,
            timeValue: checkedLog.timeValue,
          }
        : null,
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
