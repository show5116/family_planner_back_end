import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateMinigameResultDto } from './dto/create-minigame-result.dto';
import { MinigameQueryDto } from './dto/minigame-query.dto';

@Injectable()
export class MinigameService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 게임 결과 저장
   */
  async create(userId: string, dto: CreateMinigameResultDto) {
    await this.validateGroupMembership(userId, dto.groupId);

    return this.prisma.minigameResult.create({
      data: {
        groupId: dto.groupId,
        gameType: dto.gameType,
        title: dto.title,
        participants: dto.participants,
        options: dto.options,
        result: dto.result as object,
        createdBy: userId,
      },
    });
  }

  /**
   * 그룹 게임 이력 조회
   */
  async findAll(userId: string, query: MinigameQueryDto) {
    await this.validateGroupMembership(userId, query.groupId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where = {
      groupId: query.groupId,
      ...(query.gameType ? { gameType: query.gameType } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.minigameResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.minigameResult.count({ where }),
    ]);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * 게임 이력 삭제 (본인 또는 그룹 관리자)
   */
  async remove(userId: string, id: string) {
    const result = await this.prisma.minigameResult.findUnique({
      where: { id },
    });

    if (!result) {
      throw new NotFoundException('게임 이력을 찾을 수 없습니다');
    }

    await this.validateGroupMembership(userId, result.groupId);

    const isOwner = result.createdBy === userId;
    if (!isOwner) {
      const isAdmin = await this.isGroupAdmin(userId, result.groupId);
      if (!isAdmin) {
        throw new ForbiddenException(
          '본인 또는 그룹 관리자만 삭제할 수 있습니다',
        );
      }
    }

    await this.prisma.minigameResult.delete({ where: { id } });

    return { message: '작업이 완료되었습니다' };
  }

  /**
   * 그룹 멤버십 검증
   */
  private async validateGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('해당 그룹의 멤버가 아닙니다');
    }
  }

  /**
   * 그룹 관리자 여부 확인 (MANAGE_MEMBER 권한 보유)
   */
  private async isGroupAdmin(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { role: true },
    });

    if (!member) return false;

    const permissions = member.role.permissions as string[];
    return permissions.includes('MANAGE_MEMBER');
  }
}
