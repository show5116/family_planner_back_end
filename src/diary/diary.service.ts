import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { deltaToPlainText } from '@/common/utils/delta-to-plain-text.util';
import {
  diaryDateInKst,
  formatDateOnly,
  parseDateOnly,
} from '@/common/utils/date-kst.util';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { AppendDiaryDto } from './dto/append-diary.dto';
import { DiaryCalendarQueryDto, DiaryQueryDto } from './dto/diary-query.dto';
import { DiaryVisibility } from './enums/diary-visibility.enum';
import { appendTextToDelta } from './utils/delta-append.util';

const DIARY_INCLUDE = {
  user: { select: { id: true, name: true } },
} as const;

type DiaryWithRelations = Prisma.DiaryGetPayload<{
  include: typeof DIARY_INCLUDE;
}>;

/** 응답 변환 — date는 문자열로 내려야 기기 타임존에서 하루가 밀리지 않는다 */
function toDiaryResponse(diary: DiaryWithRelations) {
  return {
    ...diary,
    date: formatDateOnly(diary.date),
    // Phase 2(미디어)에서 실제 값을 채운다
    hasMedia: false,
  };
}

const GROUP_IDS_CACHE_TTL = 60;
const RESTORE_WINDOW_DAYS = 30;
const FLASHBACK_EXCERPT_LENGTH = 120;

@Injectable()
export class DiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 일기 생성 (같은 날짜에 이미 있으면 409)
   */
  async create(userId: string, dto: CreateDiaryDto) {
    if (!dto.content?.trim()) {
      throw new BadRequestException('diary.errors.content_required');
    }

    const date = this.resolveTargetDate(dto.date);
    const groupId = await this.resolveGroupId(
      userId,
      dto.visibility,
      dto.groupId,
    );

    const existing = await this.prisma.diary.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('diary.errors.duplicate_date');
    }

    try {
      const diary = await this.prisma.$transaction(async (tx) => {
        // 같은 날짜의 휴지통 일기는 완전 삭제하고 새로 쓴다 (유니크 제약 회피)
        if (existing) {
          await tx.diary.delete({ where: { id: existing.id } });
        }

        return tx.diary.create({
          data: {
            userId,
            groupId,
            date,
            title: dto.title,
            content: dto.content,
            plainText: deltaToPlainText(dto.content),
            format: dto.format,
            visibility: dto.visibility,
            mood: dto.mood,
            weather: dto.weather,
          },
          include: DIARY_INCLUDE,
        });
      });

      return toDiaryResponse(diary);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('diary.errors.duplicate_date');
      }
      throw error;
    }
  }

  /**
   * 빠른 기록 — 그날 일기에 조각을 append (없으면 생성, upsert)
   */
  async append(userId: string, dto: AppendDiaryDto) {
    const text = dto.text?.trim();
    if (!text) {
      throw new BadRequestException('diary.errors.text_required');
    }

    const date = this.resolveTargetDate(dto.date);

    // 새로 만들 때만 쓰이는 값 — 기존 일기가 있으면 그 공개범위를 그대로 따른다
    const visibility = dto.visibility ?? DiaryVisibility.PRIVATE;
    const groupId = await this.resolveGroupId(userId, visibility, dto.groupId);

    // 연타 시 같은 (userId, date)에 동시 생성이 겹쳐 P2002가 날 수 있어 1회 재시도한다
    for (let attempt = 0; attempt < 2; attempt++) {
      const existing = await this.prisma.diary.findUnique({
        where: { userId_date: { userId, date } },
      });

      if (existing && !existing.deletedAt) {
        return this.appendToExisting(existing.id, text, dto.capturedAt);
      }

      try {
        return await this.createFromFragment({
          userId,
          date,
          text,
          capturedAt: dto.capturedAt,
          visibility,
          groupId,
          trashedId: existing?.id,
        });
      } catch (error) {
        if (this.isUniqueViolation(error) && attempt === 0) continue;
        throw error;
      }
    }

    throw new ConflictException('diary.errors.append_conflict');
  }

  /**
   * 일기 목록 조회 (기간·그룹·검색 필터)
   */
  async findAll(userId: string, query: DiaryQueryDto) {
    const userGroupIds = await this.getUserGroupIds(userId);

    const andConditions: Prisma.DiaryWhereInput[] = [
      { deletedAt: null },
      { OR: this.getAccessCondition(userId, userGroupIds) },
      ...(query.visibility ? [{ visibility: query.visibility }] : []),
      ...(query.groupId ? [{ groupId: query.groupId }] : []),
      ...(query.from
        ? [{ date: { gte: this.parseDateParam(query.from) } }]
        : []),
      ...(query.to ? [{ date: { lte: this.parseDateParam(query.to) } }] : []),
      ...(query.search
        ? [
            {
              OR: [
                { title: { contains: query.search } },
                { plainText: { contains: query.search, not: null } },
              ],
            },
          ]
        : []),
    ];

    const where: Prisma.DiaryWhereInput = { AND: andConditions };

    const [diaries, total] = await Promise.all([
      this.prisma.diary.findMany({
        where,
        include: DIARY_INCLUDE,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.diary.count({ where }),
    ]);

    return {
      data: diaries.map(toDiaryResponse),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 월별 작성 현황 조회 (캘린더뷰용 — 본문 없음)
   */
  async findCalendar(userId: string, query: DiaryCalendarQueryDto) {
    const monthStart = new Date(
      Date.UTC(query.year, query.month - 1, 1, 0, 0, 0),
    );
    const nextMonthStart = new Date(Date.UTC(query.year, query.month, 1, 0, 0));

    if (query.groupId) {
      await this.validateGroupMembership(userId, query.groupId);
    }

    const diaries = await this.prisma.diary.findMany({
      where: {
        deletedAt: null,
        date: { gte: monthStart, lt: nextMonthStart },
        ...(query.groupId
          ? { groupId: query.groupId, visibility: DiaryVisibility.GROUP }
          : { userId }),
      },
      select: {
        id: true,
        date: true,
        mood: true,
        userId: true,
        user: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      days: diaries.map((diary) => ({
        date: formatDateOnly(diary.date),
        diaryId: diary.id,
        userId: diary.userId,
        authorName: diary.user.name,
        mood: diary.mood,
        hasMedia: false,
      })),
    };
  }

  /**
   * 특정 날짜의 내 일기 조회 (없으면 404)
   */
  async findByDate(userId: string, dateStr: string) {
    const diary = await this.prisma.diary.findFirst({
      where: { userId, date: this.parseDateParam(dateStr), deletedAt: null },
      include: DIARY_INCLUDE,
    });

    if (!diary) {
      throw new NotFoundException('diary.errors.diary_not_found');
    }

    return toDiaryResponse(diary);
  }

  /**
   * 연속 작성일수 + 이번달 작성일수 (하루 경계 = 새벽 4시)
   */
  async getStreak(userId: string) {
    const today = diaryDateInKst();

    const diaries = await this.prisma.diary.findMany({
      where: { userId, deletedAt: null },
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    const dateStrings = diaries.map((diary) => formatDateOnly(diary.date));
    const written = new Set(dateStrings);

    const monthPrefix = formatDateOnly(today).slice(0, 7);
    const thisMonthCount = dateStrings.filter((date) =>
      date.startsWith(monthPrefix),
    ).length;

    // 오늘 아직 안 썼으면 어제부터 역산 — 하루가 지나기 전에 0으로 보이면 안 된다
    let cursor = dayjs(formatDateOnly(today));
    if (!written.has(cursor.format('YYYY-MM-DD'))) {
      cursor = cursor.subtract(1, 'day');
    }

    let currentStreak = 0;
    while (written.has(cursor.format('YYYY-MM-DD'))) {
      currentStreak++;
      cursor = cursor.subtract(1, 'day');
    }

    let longestStreak = 0;
    let run = 0;
    let previous: dayjs.Dayjs | null = null;
    for (const date of dateStrings) {
      const current = dayjs(date);
      run = previous && current.diff(previous, 'day') === 1 ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
      previous = current;
    }

    return { currentStreak, thisMonthCount, longestStreak };
  }

  /**
   * 회고 — 1·3·6개월 / n년 전 오늘 중 가장 오래된 일기 1건
   */
  async getFlashback(userId: string) {
    const today = dayjs(formatDateOnly(diaryDateInKst()));

    const oldest = await this.prisma.diary.findFirst({
      where: { userId, deletedAt: null },
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    if (!oldest) return { items: [] };

    const yearsBack = today.diff(dayjs(formatDateOnly(oldest.date)), 'year');
    const candidates = [
      { label: '1개월 전 오늘', date: today.subtract(1, 'month') },
      { label: '3개월 전 오늘', date: today.subtract(3, 'month') },
      { label: '6개월 전 오늘', date: today.subtract(6, 'month') },
      ...Array.from({ length: Math.max(yearsBack, 0) }, (_, index) => ({
        label: `${index + 1}년 전 오늘`,
        date: today.subtract(index + 1, 'year'),
      })),
    ];

    const labelByDate = new Map(
      candidates.map((candidate) => [
        candidate.date.format('YYYY-MM-DD'),
        candidate.label,
      ]),
    );

    // 여러 개가 걸리면 가장 오래된 것 하나만 — 오래될수록 반가움이 크다
    const diary = await this.prisma.diary.findFirst({
      where: {
        userId,
        deletedAt: null,
        date: {
          in: [...labelByDate.keys()].map((date) => parseDateOnly(date)),
        },
      },
      orderBy: { date: 'asc' },
    });

    if (!diary) return { items: [] };

    const date = formatDateOnly(diary.date);

    return {
      items: [
        {
          id: diary.id,
          date,
          label: labelByDate.get(date) ?? '',
          title: diary.title,
          excerpt: diary.plainText?.slice(0, FLASHBACK_EXCERPT_LENGTH) ?? null,
          mood: diary.mood,
        },
      ],
    };
  }

  /**
   * 일기 상세 조회
   */
  async findOne(userId: string, id: string) {
    const diary = await this.prisma.diary.findFirst({
      where: { id, deletedAt: null },
      include: DIARY_INCLUDE,
    });

    if (!diary) {
      throw new NotFoundException('diary.errors.diary_not_found');
    }

    await this.validateReadAccess(userId, diary);

    return toDiaryResponse(diary);
  }

  /**
   * 일기 수정 (작성자 본인만)
   */
  async update(userId: string, id: string, dto: UpdateDiaryDto) {
    const diary = await this.findEditableDiary(userId, id);

    if (dto.visibility === DiaryVisibility.GROUP) {
      const groupId = dto.groupId || diary.groupId;
      if (!groupId) {
        throw new BadRequestException('diary.errors.group_id_required');
      }
      await this.validateGroupMembership(userId, groupId);
    }

    const updated = await this.prisma.diary.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content && {
          content: dto.content,
          plainText: deltaToPlainText(dto.content),
        }),
        ...(dto.format && { format: dto.format }),
        ...(dto.visibility && { visibility: dto.visibility }),
        ...(dto.visibility === DiaryVisibility.GROUP &&
          dto.groupId && { groupId: dto.groupId }),
        ...(dto.visibility === DiaryVisibility.PRIVATE && { groupId: null }),
        ...(dto.mood !== undefined && { mood: dto.mood }),
        ...(dto.weather !== undefined && { weather: dto.weather }),
      },
      include: DIARY_INCLUDE,
    });

    return toDiaryResponse(updated);
  }

  /**
   * 일기 삭제 (soft delete — 30일 내 복구 가능)
   */
  async remove(userId: string, id: string) {
    await this.findEditableDiary(
      userId,
      id,
      'diary.errors.own_diary_only_delete',
    );

    await this.prisma.diary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: this.i18n.t('diary.success.diary_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  /**
   * 삭제한 일기 복구 (30일 이내, 같은 날짜에 활성 일기가 있으면 409)
   */
  async restore(userId: string, id: string) {
    const diary = await this.prisma.diary.findUnique({ where: { id } });

    if (!diary || !diary.deletedAt) {
      throw new NotFoundException('diary.errors.diary_not_found');
    }

    await this.validateEditAccess(
      userId,
      diary,
      'diary.errors.own_diary_only_update',
    );

    const expiresAt = dayjs(diary.deletedAt).add(RESTORE_WINDOW_DAYS, 'day');
    if (dayjs().isAfter(expiresAt)) {
      throw new NotFoundException('diary.errors.restore_expired');
    }

    const active = await this.prisma.diary.findFirst({
      where: { userId: diary.userId, date: diary.date, deletedAt: null },
    });

    if (active) {
      throw new ConflictException('diary.errors.restore_conflict');
    }

    const restored = await this.prisma.diary.update({
      where: { id },
      data: { deletedAt: null },
      include: DIARY_INCLUDE,
    });

    return toDiaryResponse(restored);
  }

  /**
   * 삭제 후 30일이 지난 일기를 완전 삭제 (스케줄러용)
   */
  async purgeExpired(now: Date = new Date()) {
    const threshold = dayjs(now).subtract(RESTORE_WINDOW_DAYS, 'day').toDate();

    const { count } = await this.prisma.diary.deleteMany({
      where: { deletedAt: { lt: threshold } },
    });

    return count;
  }

  /** 기존 일기에 조각 append — 행을 잠가 동시 요청에도 조각이 유실되지 않게 한다 */
  private async appendToExisting(
    diaryId: string,
    text: string,
    capturedAt?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ content: string }[]>`
        SELECT content FROM diaries WHERE id = ${diaryId} FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new ConflictException('diary.errors.append_conflict');
      }

      const content = appendTextToDelta(locked[0].content, text, capturedAt);

      const updated = await tx.diary.update({
        where: { id: diaryId },
        data: { content, plainText: deltaToPlainText(content) },
      });

      return this.toAppendResult(updated, text, capturedAt, false);
    });
  }

  /** 그날 일기가 없을 때 조각 하나로 새 일기를 만든다 */
  private async createFromFragment(params: {
    userId: string;
    date: Date;
    text: string;
    capturedAt?: string;
    visibility: DiaryVisibility;
    groupId: string | null;
    trashedId?: string;
  }) {
    const content = appendTextToDelta(null, params.text, params.capturedAt);

    const created = await this.prisma.$transaction(async (tx) => {
      // 같은 날짜의 휴지통 일기는 완전 삭제하고 새로 쓴다 (유니크 제약 회피)
      if (params.trashedId) {
        await tx.diary.delete({ where: { id: params.trashedId } });
      }

      return tx.diary.create({
        data: {
          userId: params.userId,
          groupId: params.groupId,
          date: params.date,
          content,
          plainText: deltaToPlainText(content),
          visibility: params.visibility,
        },
      });
    });

    return this.toAppendResult(created, params.text, params.capturedAt, true);
  }

  private toAppendResult(
    diary: { id: string; date: Date; updatedAt: Date },
    text: string,
    capturedAt: string | undefined,
    created: boolean,
  ) {
    return {
      id: diary.id,
      date: formatDateOnly(diary.date),
      created,
      appended: { text, capturedAt: capturedAt ?? null },
      updatedAt: diary.updatedAt,
    };
  }

  /** 경로 파라미터로 받은 'YYYY-MM-DD'를 검증해 순수 날짜로 변환한다 (DTO 검증이 없는 자리) */
  private parseDateParam(dateStr: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('diary.errors.invalid_date');
    }

    const date = parseDateOnly(dateStr);
    // 2026-02-30처럼 존재하지 않는 날짜는 Date가 다음 달로 넘겨버리므로 왕복 비교로 걸러낸다
    if (Number.isNaN(date.getTime()) || formatDateOnly(date) !== dateStr) {
      throw new BadRequestException('diary.errors.invalid_date');
    }

    return date;
  }

  /** 'YYYY-MM-DD' 또는 생략(오늘)을 순수 날짜로 변환하고 미래 날짜를 거부한다 */
  private resolveTargetDate(dateStr?: string): Date {
    const today = diaryDateInKst();
    if (!dateStr) return today;

    const date = this.parseDateParam(dateStr);
    if (date.getTime() > today.getTime()) {
      throw new BadRequestException('diary.errors.future_date');
    }

    return date;
  }

  /** 공개 범위에 따른 groupId 확정 (GROUP이면 멤버십 검증) */
  private async resolveGroupId(
    userId: string,
    visibility: DiaryVisibility | undefined,
    groupId: string | undefined,
  ): Promise<string | null> {
    if (visibility !== DiaryVisibility.GROUP) return null;

    if (!groupId) {
      throw new BadRequestException('diary.errors.group_id_required');
    }
    await this.validateGroupMembership(userId, groupId);

    return groupId;
  }

  /** 수정·삭제·복구 권한 — 그룹 일기는 그룹원 전원, 개인 일기는 작성자만 (메모와 동일) */
  private async findEditableDiary(
    userId: string,
    id: string,
    forbiddenKey = 'diary.errors.own_diary_only_update',
  ) {
    const diary = await this.prisma.diary.findFirst({
      where: { id, deletedAt: null },
    });

    if (!diary) {
      throw new NotFoundException('diary.errors.diary_not_found');
    }

    await this.validateEditAccess(userId, diary, forbiddenKey);

    return diary;
  }

  /** 그룹 일기면 멤버십만 확인하고, 개인 일기면 작성자 본인인지 확인한다 */
  private async validateEditAccess(
    userId: string,
    diary: { userId: string; groupId: string | null },
    forbiddenKey: string,
  ) {
    if (diary.groupId) {
      await this.validateGroupMembership(userId, diary.groupId);
      return;
    }

    if (diary.userId !== userId) {
      throw new ForbiddenException(forbiddenKey);
    }
  }

  private getAccessCondition(
    userId: string,
    userGroupIds: string[],
  ): Prisma.DiaryWhereInput[] {
    return [
      { userId },
      ...(userGroupIds.length > 0
        ? [{ groupId: { in: userGroupIds }, visibility: DiaryVisibility.GROUP }]
        : []),
    ];
  }

  private async validateReadAccess(
    userId: string,
    diary: {
      visibility: DiaryVisibility;
      userId: string;
      groupId: string | null;
    },
  ) {
    if (diary.userId === userId) return;

    if (diary.visibility === DiaryVisibility.GROUP && diary.groupId) {
      await this.validateGroupMembership(userId, diary.groupId);
      return;
    }

    throw new ForbiddenException('diary.errors.no_access');
  }

  private async validateGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('diary.errors.no_group_access');
    }
  }

  private async getUserGroupIds(userId: string): Promise<string[]> {
    const cacheKey = `user:group-ids:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);
    await this.redis.set(cacheKey, groupIds, GROUP_IDS_CACHE_TTL);
    return groupIds;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
