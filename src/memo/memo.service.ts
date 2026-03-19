import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateMemoDto } from './dto/create-memo.dto';
import { UpdateMemoDto } from './dto/update-memo.dto';
import { MemoQueryDto } from './dto/memo-query.dto';
import { CreateMemoTagDto } from './dto/create-memo-tag.dto';
import { CreateMemoAttachmentDto } from './dto/create-memo-attachment.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { MemoVisibility } from './enums/memo-visibility.enum';
import { MemoType } from './enums/memo-type.enum';

@Injectable()
export class MemoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 메모 생성
   */
  async create(userId: string, dto: CreateMemoDto) {
    if (dto.visibility === MemoVisibility.GROUP) {
      if (!dto.groupId) {
        throw new BadRequestException('그룹 메모는 그룹 ID가 필요합니다');
      }
      await this.validateGroupMembership(userId, dto.groupId);
    }

    return this.prisma.memo.create({
      data: {
        userId,
        groupId: dto.visibility === MemoVisibility.GROUP ? dto.groupId : null,
        title: dto.title,
        content: dto.content,
        format: dto.format,
        type: dto.type,
        visibility: dto.visibility,
        tags: dto.tags?.length
          ? {
              create: dto.tags.map((tag) => ({ name: tag.name })),
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, name: true } },
        tags: true,
        attachments: true,
        checklistItems: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * 메모 목록 조회 (본인 개인 메모 + 소속 그룹 메모)
   */
  async findAll(userId: string, query: MemoQueryDto) {
    const userGroupIds = await this.getUserGroupIds(userId);

    const where: any = {
      deletedAt: null,
      OR: [
        { userId, visibility: MemoVisibility.PRIVATE },
        ...(userGroupIds.length > 0
          ? [
              {
                groupId: { in: userGroupIds },
                visibility: MemoVisibility.GROUP,
              },
            ]
          : []),
      ],
      ...(query.visibility && { visibility: query.visibility }),
      ...(query.groupId && { groupId: query.groupId }),
      ...(query.tag && {
        tags: { some: { name: query.tag } },
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search } },
          { content: { contains: query.search } },
        ],
      }),
    };

    // search 필터가 있으면 기본 OR 조건과 결합
    if (query.search) {
      const accessCondition = [
        { userId, visibility: MemoVisibility.PRIVATE },
        ...(userGroupIds.length > 0
          ? [
              {
                groupId: { in: userGroupIds },
                visibility: MemoVisibility.GROUP,
              },
            ]
          : []),
      ];
      delete where.OR;
      where.AND = [
        { OR: accessCondition },
        {
          OR: [
            { title: { contains: query.search } },
            { content: { contains: query.search } },
          ],
        },
      ];
    }

    const [memos, total] = await Promise.all([
      this.prisma.memo.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          tags: true,
          attachments: true,
          checklistItems: { orderBy: { order: 'asc' } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.memo.count({ where }),
    ]);

    return {
      data: memos,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 메모 상세 조회
   */
  async findOne(userId: string, id: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, name: true } },
        tags: true,
        attachments: true,
        checklistItems: { orderBy: { order: 'asc' } },
      },
    });

    if (!memo) {
      throw new NotFoundException('메모를 찾을 수 없습니다');
    }

    await this.validateReadAccess(userId, memo);

    return memo;
  }

  /**
   * 메모 수정
   */
  async update(userId: string, id: string, dto: UpdateMemoDto) {
    const memo = await this.prisma.memo.findFirst({
      where: { id, deletedAt: null },
    });

    if (!memo) {
      throw new NotFoundException('메모를 찾을 수 없습니다');
    }

    if (memo.userId !== userId) {
      throw new ForbiddenException('본인의 메모만 수정할 수 있습니다');
    }

    if (dto.visibility === MemoVisibility.GROUP) {
      const groupId = dto.groupId || memo.groupId;
      if (!groupId) {
        throw new BadRequestException('그룹 메모는 그룹 ID가 필요합니다');
      }
      await this.validateGroupMembership(userId, groupId);
    }

    return this.prisma.memo.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
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
      },
      include: {
        user: { select: { id: true, name: true } },
        tags: true,
        attachments: true,
        checklistItems: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * 메모 삭제 (Soft Delete)
   */
  async remove(userId: string, id: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id, deletedAt: null },
    });

    if (!memo) {
      throw new NotFoundException('메모를 찾을 수 없습니다');
    }

    if (memo.userId !== userId) {
      throw new ForbiddenException('본인의 메모만 삭제할 수 있습니다');
    }

    await this.prisma.memo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '메모가 삭제되었습니다' };
  }

  /**
   * 핀 토글 (핀 ↔ 핀 해제)
   */
  async togglePin(userId: string, id: string) {
    const memo = await this.findOwnMemo(userId, id);

    return this.prisma.memo.update({
      where: { id },
      data: { isPinned: !memo.isPinned },
      include: {
        user: { select: { id: true, name: true } },
        tags: true,
        attachments: true,
        checklistItems: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * 핀된 메모 목록 조회 (대시보드 위젯용)
   */
  async findPinned(userId: string) {
    const userGroupIds = await this.getUserGroupIds(userId);

    return this.prisma.memo.findMany({
      where: {
        deletedAt: null,
        isPinned: true,
        OR: [
          { userId, visibility: MemoVisibility.PRIVATE },
          ...(userGroupIds.length > 0
            ? [
                {
                  groupId: { in: userGroupIds },
                  visibility: MemoVisibility.GROUP,
                },
              ]
            : []),
        ],
      },
      include: {
        user: { select: { id: true, name: true } },
        tags: true,
        attachments: true,
        checklistItems: { orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 태그 추가
   */
  async addTag(userId: string, memoId: string, dto: CreateMemoTagDto) {
    const memo = await this.findOwnMemo(userId, memoId);

    return this.prisma.memoTag.create({
      data: {
        memoId: memo.id,
        name: dto.name,
      },
    });
  }

  /**
   * 태그 삭제
   */
  async removeTag(userId: string, memoId: string, tagId: string) {
    await this.findOwnMemo(userId, memoId);

    const tag = await this.prisma.memoTag.findFirst({
      where: { id: tagId, memoId },
    });

    if (!tag) {
      throw new NotFoundException('태그를 찾을 수 없습니다');
    }

    await this.prisma.memoTag.delete({ where: { id: tagId } });

    return { message: '태그가 삭제되었습니다' };
  }

  /**
   * 첨부파일 추가
   */
  async addAttachment(
    userId: string,
    memoId: string,
    dto: CreateMemoAttachmentDto,
  ) {
    await this.findOwnMemo(userId, memoId);

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

  /**
   * 첨부파일 삭제
   */
  async removeAttachment(userId: string, memoId: string, attachmentId: string) {
    await this.findOwnMemo(userId, memoId);

    const attachment = await this.prisma.memoAttachment.findFirst({
      where: { id: attachmentId, memoId },
    });

    if (!attachment) {
      throw new NotFoundException('첨부파일을 찾을 수 없습니다');
    }

    await this.prisma.memoAttachment.delete({ where: { id: attachmentId } });

    return { message: '첨부파일이 삭제되었습니다' };
  }

  /**
   * 체크리스트 항목 추가
   */
  async addChecklistItem(
    userId: string,
    memoId: string,
    dto: CreateChecklistItemDto,
  ) {
    const memo = await this.findOwnMemo(userId, memoId);

    if ((memo.type as MemoType) !== MemoType.CHECKLIST) {
      throw new BadRequestException(
        '체크리스트 타입의 메모에만 항목을 추가할 수 있습니다',
      );
    }

    const order =
      dto.order ??
      (await this.prisma.checklistItem.count({ where: { memoId } }));

    return this.prisma.checklistItem.create({
      data: { memoId, content: dto.content, order },
    });
  }

  /**
   * 체크리스트 항목 수정 (내용/순서)
   */
  async updateChecklistItem(
    userId: string,
    memoId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
  ) {
    await this.findOwnMemo(userId, memoId);
    const item = await this.findChecklistItem(itemId, memoId);

    return this.prisma.checklistItem.update({
      where: { id: item.id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  /**
   * 체크리스트 항목 삭제
   */
  async removeChecklistItem(userId: string, memoId: string, itemId: string) {
    await this.findOwnMemo(userId, memoId);
    await this.findChecklistItem(itemId, memoId);

    await this.prisma.checklistItem.delete({ where: { id: itemId } });

    return { message: '항목이 삭제되었습니다' };
  }

  /**
   * 체크리스트 항목 체크/해제 토글
   */
  async toggleChecklistItem(userId: string, memoId: string, itemId: string) {
    await this.findOwnMemo(userId, memoId);
    const item = await this.findChecklistItem(itemId, memoId);

    return this.prisma.checklistItem.update({
      where: { id: item.id },
      data: { isChecked: !item.isChecked },
    });
  }

  /**
   * 체크리스트 전체 체크 해제
   */
  async resetChecklist(userId: string, memoId: string) {
    await this.findOwnMemo(userId, memoId);

    await this.prisma.checklistItem.updateMany({
      where: { memoId },
      data: { isChecked: false },
    });

    return { message: '전체 체크가 해제되었습니다' };
  }

  /**
   * 체크리스트 항목 조회 (존재 확인)
   */
  private async findChecklistItem(itemId: string, memoId: string) {
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, memoId },
    });

    if (!item) {
      throw new NotFoundException('항목을 찾을 수 없습니다');
    }

    return item;
  }

  /**
   * 본인 메모 확인 (수정/삭제 권한 검증)
   */
  private async findOwnMemo(userId: string, memoId: string) {
    const memo = await this.prisma.memo.findFirst({
      where: { id: memoId, deletedAt: null },
    });

    if (!memo) {
      throw new NotFoundException('메모를 찾을 수 없습니다');
    }

    if (memo.userId !== userId) {
      throw new ForbiddenException('본인의 메모만 수정할 수 있습니다');
    }

    return memo;
  }

  /**
   * 읽기 권한 검증
   */
  private async validateReadAccess(userId: string, memo: any) {
    if (memo.visibility === MemoVisibility.PRIVATE && memo.userId !== userId) {
      throw new ForbiddenException('이 메모에 접근할 권한이 없습니다');
    }

    if (memo.visibility === MemoVisibility.GROUP && memo.groupId) {
      await this.validateGroupMembership(userId, memo.groupId);
    }
  }

  /**
   * 그룹 멤버십 검증
   */
  private async validateGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }
  }

  /**
   * 사용자가 속한 그룹 ID 목록 조회
   */
  private async getUserGroupIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    return memberships.map((m) => m.groupId);
  }
}
