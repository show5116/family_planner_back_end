import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { MemoQueryDto, MemoTagListQueryDto } from './dto/memo-query.dto';
import { CreateMemoTagDto } from './dto/create-memo-tag.dto';
import { CreateMemoAttachmentDto } from './dto/create-memo-attachment.dto';
import { MemoVisibility } from './enums/memo-visibility.enum';
import { deltaToPlainText } from './utils/delta-to-plain-text.util';

const MEMO_INCLUDE = {
  user: { select: { id: true, name: true } },
  tags: true,
  attachments: true,
} as const;

type MemoWithRelations = Prisma.MemoGetPayload<{
  include: typeof MEMO_INCLUDE;
}>;

function toMemoResponse(memo: MemoWithRelations) {
  return {
    ...memo,
    checklistMeta: {
      total: memo.totalCount,
      checked: memo.checkedCount,
    },
  };
}

const GROUP_IDS_CACHE_TTL = 60;

@Injectable()
export class MemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, dto: CreateMemoDto) {
    if (!dto.content?.trim()) {
      throw new BadRequestException('memo.errors.body_required');
    }

    if (dto.visibility === MemoVisibility.GROUP) {
      if (!dto.groupId) {
        throw new BadRequestException('memo.errors.group_id_required');
      }
      await this.validateGroupMembership(userId, dto.groupId);
    }

    const memo = await this.prisma.memo.create({
      data: {
        userId,
        groupId: dto.visibility === MemoVisibility.GROUP ? dto.groupId : null,
        title: dto.title,
        content: dto.content,
        plainText: deltaToPlainText(dto.content),
        format: dto.format,
        visibility: dto.visibility,
        checkedCount: dto.checklistMeta?.checked ?? 0,
        totalCount: dto.checklistMeta?.total ?? 0,
        tags: dto.tags?.length
          ? { create: dto.tags.map((tag) => ({ name: tag.name })) }
          : undefined,
      },
      include: MEMO_INCLUDE,
    });

    return toMemoResponse(memo);
  }

  async findAll(userId: string, query: MemoQueryDto) {
    const userGroupIds = await this.getUserGroupIds(userId);

    const andConditions: Prisma.MemoWhereInput[] = [
      { deletedAt: null },
      { OR: this.getAccessCondition(userId, userGroupIds) },
      ...(query.visibility ? [{ visibility: query.visibility }] : []),
      ...(query.groupId ? [{ groupId: query.groupId }] : []),
      ...(query.tag ? [{ tags: { some: { name: query.tag } } }] : []),
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

    const where: Prisma.MemoWhereInput = { AND: andConditions };

    const [memos, total] = await Promise.all([
      this.prisma.memo.findMany({
        where,
        include: MEMO_INCLUDE,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.memo.count({ where }),
    ]);

    return {
      data: memos.map(toMemoResponse),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id, deletedAt: null },
      include: MEMO_INCLUDE,
    });

    if (!memo) {
      throw new NotFoundException('memo.errors.memo_not_found');
    }

    await this.validateReadAccess(userId, memo);

    return toMemoResponse(memo);
  }

  async update(userId: string, id: string, dto: UpdateMemoDto) {
    const memo = await this.prisma.memo.findFirst({
      where: { id, deletedAt: null },
    });

    if (!memo) {
      throw new NotFoundException('memo.errors.memo_not_found');
    }

    await this.validateReadAccess(userId, memo);
    await this.verifyLockOwnership(userId, id);

    if (dto.visibility === MemoVisibility.GROUP) {
      const groupId = dto.groupId || memo.groupId;
      if (!groupId) {
        throw new BadRequestException('memo.errors.group_id_required');
      }
      await this.validateGroupMembership(userId, groupId);
    }

    const updated = await this.prisma.memo.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && {
          content: dto.content,
          plainText: deltaToPlainText(dto.content),
        }),
        ...(dto.format && { format: dto.format }),
        ...(dto.visibility && { visibility: dto.visibility }),
        ...(dto.visibility === MemoVisibility.GROUP &&
          dto.groupId && { groupId: dto.groupId }),
        ...(dto.visibility === MemoVisibility.PRIVATE && { groupId: null }),
        ...(dto.tags && {
          tags: {
            deleteMany: {},
            create: dto.tags.map((tag) => ({ name: tag.name })),
          },
        }),
        ...(dto.checklistMeta !== undefined && {
          checkedCount: dto.checklistMeta?.checked ?? 0,
          totalCount: dto.checklistMeta?.total ?? 0,
        }),
      },
      include: MEMO_INCLUDE,
    });

    return toMemoResponse(updated);
  }

  async remove(userId: string, id: string) {
    await this.findOwnMemo(userId, id);

    await this.prisma.memo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      message: this.i18n.t('memo.success.memo_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  async togglePin(userId: string, id: string) {
    const memo = await this.findMemoWithAccess(userId, id);

    const updated = await this.prisma.memo.update({
      where: { id },
      data: { isPinned: !memo.isPinned },
      include: MEMO_INCLUDE,
    });

    return toMemoResponse(updated);
  }

  async findPinned(userId: string, groupId?: string) {
    const userGroupIds = await this.getUserGroupIds(userId);

    const groupFilter = groupId
      ? userGroupIds.includes(groupId)
        ? [{ groupId, visibility: MemoVisibility.GROUP }]
        : []
      : userGroupIds.length > 0
        ? [{ groupId: { in: userGroupIds }, visibility: MemoVisibility.GROUP }]
        : [];

    const memos = await this.prisma.memo.findMany({
      where: {
        deletedAt: null,
        isPinned: true,
        OR: [
          ...(groupId ? [] : [{ userId, visibility: MemoVisibility.PRIVATE }]),
          ...groupFilter,
        ],
      },
      include: MEMO_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });

    return memos.map(toMemoResponse);
  }

  async findTagNames(userId: string, query: MemoTagListQueryDto) {
    let memoWhere: Prisma.MemoWhereInput = { deletedAt: null };

    if (query.groupId) {
      await this.validateGroupMembership(userId, query.groupId);
      memoWhere = {
        ...memoWhere,
        groupId: query.groupId,
        visibility: MemoVisibility.GROUP,
      };
    } else if (query.personal) {
      memoWhere = {
        ...memoWhere,
        userId,
        visibility: MemoVisibility.PRIVATE,
      };
    } else {
      const userGroupIds = await this.getUserGroupIds(userId);
      memoWhere = {
        ...memoWhere,
        OR: this.getAccessCondition(userId, userGroupIds),
      };
    }

    const tags = await this.prisma.memoTag.findMany({
      where: { memo: memoWhere },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });

    return { tags: tags.map((t) => t.name) };
  }

  async addTag(userId: string, memoId: string, dto: CreateMemoTagDto) {
    const memo = await this.findMemoWithAccess(userId, memoId);

    return this.prisma.memoTag.create({
      data: { memoId: memo.id, name: dto.name },
    });
  }

  async removeTag(userId: string, memoId: string, tagId: string) {
    await this.findMemoWithAccess(userId, memoId);

    const tag = await this.prisma.memoTag.findFirst({
      where: { id: tagId, memoId },
    });

    if (!tag) {
      throw new NotFoundException('memo.errors.tag_not_found');
    }

    await this.prisma.memoTag.delete({ where: { id: tagId } });

    return {
      message: this.i18n.t('memo.success.tag_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  async addAttachment(
    userId: string,
    memoId: string,
    dto: CreateMemoAttachmentDto,
  ) {
    await this.findMemoWithAccess(userId, memoId);

    return this.prisma.memoAttachment.create({
      data: {
        memoId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
      },
    });
  }

  async removeAttachment(userId: string, memoId: string, attachmentId: string) {
    await this.findMemoWithAccess(userId, memoId);

    const attachment = await this.prisma.memoAttachment.findFirst({
      where: { id: attachmentId, memoId },
    });

    if (!attachment) {
      throw new NotFoundException('memo.errors.attachment_not_found');
    }

    await this.prisma.memoAttachment.delete({ where: { id: attachmentId } });

    return {
      message: this.i18n.t('memo.success.attachment_deleted', {
        lang: I18nContext.current()?.lang ?? 'ko',
      }),
    };
  }

  private async findMemoWithAccess(userId: string, memoId: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id: memoId, deletedAt: null },
    });

    if (!memo) {
      throw new NotFoundException('memo.errors.memo_not_found');
    }

    await this.validateReadAccess(userId, memo);

    return memo;
  }

  private async findOwnMemo(userId: string, memoId: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id: memoId, deletedAt: null },
    });

    if (!memo) {
      throw new NotFoundException('memo.errors.memo_not_found');
    }

    if (memo.userId !== userId) {
      throw new ForbiddenException('memo.errors.own_memo_only_delete');
    }

    return memo;
  }

  private async verifyLockOwnership(userId: string, memoId: string) {
    const lockedBy = await this.redis.getMemoLock(memoId);
    if (lockedBy && lockedBy !== userId) {
      throw new ConflictException('memo.errors.locked_by_other_user');
    }
  }

  private getAccessCondition(
    userId: string,
    userGroupIds: string[],
  ): Prisma.MemoWhereInput[] {
    return [
      { userId, visibility: MemoVisibility.PRIVATE },
      ...(userGroupIds.length > 0
        ? [{ groupId: { in: userGroupIds }, visibility: MemoVisibility.GROUP }]
        : []),
    ];
  }

  private async validateReadAccess(
    userId: string,
    memo: {
      visibility: MemoVisibility;
      userId: string;
      groupId: string | null;
    },
  ) {
    if (memo.visibility === MemoVisibility.PRIVATE && memo.userId !== userId) {
      throw new ForbiddenException('memo.errors.no_access');
    }

    if (memo.visibility === MemoVisibility.GROUP && memo.groupId) {
      await this.validateGroupMembership(userId, memo.groupId);
    }
  }

  private async validateGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('memo.errors.no_group_access');
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

  /**
   * 편집 잠금 획득
   * 이미 다른 사용자가 편집 중이면 409 반환
   */
  async acquireLock(userId: string, memoId: string) {
    await this.findMemoWithAccess(userId, memoId);

    const acquired = await this.redis.acquireMemoLock(memoId, userId);
    if (!acquired) {
      const lockedBy = await this.redis.getMemoLock(memoId);
      if (lockedBy === userId) {
        // 본인이 이미 잠금 중이면 TTL만 갱신
        await this.redis.renewMemoLock(memoId, userId);
        return { locked: true, lockedByMe: true };
      }
      throw new ConflictException('memo.errors.already_locked');
    }

    return { locked: true, lockedByMe: true };
  }

  /**
   * 편집 잠금 해제
   */
  async releaseLock(userId: string, memoId: string) {
    await this.redis.releaseMemoLock(memoId, userId);
    return { locked: false };
  }

  /**
   * heartbeat — TTL 갱신 (30초마다 호출)
   * 잠금이 만료되었거나 다른 사용자 잠금이면 409
   */
  async heartbeat(userId: string, memoId: string) {
    const renewed = await this.redis.renewMemoLock(memoId, userId);
    if (!renewed) {
      throw new ConflictException('memo.errors.lock_expired');
    }
    return { locked: true };
  }
}
