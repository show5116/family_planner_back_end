import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CastBallotDto } from './dto/cast-ballot.dto';
import { VoteQueryDto, VoteStatusFilter } from './dto/vote-query.dto';
import {
  VoteDto,
  VoteOptionDto,
  PaginatedVoteDto,
} from './dto/vote-response.dto';

@Injectable()
export class VoteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 그룹 내 투표 목록 조회
   */
  async findAll(
    userId: string,
    groupId: string,
    query: VoteQueryDto,
  ): Promise<PaginatedVoteDto> {
    await this.assertGroupMember(userId, groupId);

    const { page = 1, limit = 20, status = VoteStatusFilter.ALL } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = { groupId };
    if (status === VoteStatusFilter.ONGOING) {
      where.OR = [{ endsAt: null }, { endsAt: { gt: now } }];
    } else if (status === VoteStatusFilter.CLOSED) {
      where.endsAt = { lte: now };
    }

    const [votes, total] = await Promise.all([
      this.prisma.vote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { name: true } },
          options: {
            include: {
              ballots: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
      }),
      this.prisma.vote.count({ where }),
    ]);

    const items = votes.map((v) => this.toDto(v, userId));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 투표 상세 조회
   */
  async findOne(
    userId: string,
    groupId: string,
    voteId: string,
  ): Promise<VoteDto> {
    await this.assertGroupMember(userId, groupId);

    const vote = await this.prisma.vote.findUnique({
      where: { id: voteId },
      include: {
        creator: { select: { name: true } },
        options: {
          include: {
            ballots: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!vote || vote.groupId !== groupId) {
      throw new NotFoundException('투표를 찾을 수 없습니다');
    }

    return this.toDto(vote, userId);
  }

  /**
   * 투표 생성
   */
  async create(
    userId: string,
    groupId: string,
    dto: CreateVoteDto,
  ): Promise<VoteDto> {
    await this.assertGroupMember(userId, groupId);

    const vote = await this.prisma.vote.create({
      data: {
        groupId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        isMultiple: dto.isMultiple ?? false,
        isAnonymous: dto.isAnonymous ?? false,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        options: {
          create: dto.options.map((label) => ({ label })),
        },
      },
      include: {
        creator: { select: { name: true } },
        options: {
          include: {
            ballots: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    return this.toDto(vote, userId);
  }

  /**
   * 투표 삭제 (작성자 또는 그룹 OWNER만 가능)
   */
  async remove(
    userId: string,
    groupId: string,
    voteId: string,
  ): Promise<{ message: string }> {
    await this.assertGroupMember(userId, groupId);

    const vote = await this.prisma.vote.findUnique({ where: { id: voteId } });
    if (!vote || vote.groupId !== groupId) {
      throw new NotFoundException('투표를 찾을 수 없습니다');
    }

    const isCreator = vote.createdBy === userId;
    if (!isCreator) {
      // 그룹 OWNER 여부 확인
      const member = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
        include: { role: true },
      });
      const isOwner = member?.role?.name === 'OWNER';
      if (!isOwner) {
        throw new ForbiddenException(
          '투표 작성자 또는 그룹 관리자만 삭제할 수 있습니다',
        );
      }
    }

    await this.prisma.vote.delete({ where: { id: voteId } });
    return { message: '투표가 삭제되었습니다' };
  }

  /**
   * 투표 참여 (투표하기 / 취소)
   */
  async castBallot(
    userId: string,
    groupId: string,
    voteId: string,
    dto: CastBallotDto,
  ): Promise<VoteDto> {
    await this.assertGroupMember(userId, groupId);

    const vote = await this.prisma.vote.findUnique({
      where: { id: voteId },
      include: { options: true },
    });

    if (!vote || vote.groupId !== groupId) {
      throw new NotFoundException('투표를 찾을 수 없습니다');
    }

    if (vote.endsAt && vote.endsAt <= new Date()) {
      throw new BadRequestException('마감된 투표입니다');
    }

    // 선택지 검증
    const validOptionIds = vote.options.map((o) => o.id);
    const invalid = dto.optionIds.filter((id) => !validOptionIds.includes(id));
    if (invalid.length > 0) {
      throw new BadRequestException('유효하지 않은 선택지입니다');
    }

    if (!vote.isMultiple && dto.optionIds.length > 1) {
      throw new BadRequestException('단일 선택 투표입니다');
    }

    // 기존 투표 삭제 후 새로 등록 (전체 교체)
    await this.prisma.$transaction(async (tx) => {
      // 이 투표의 모든 선택지에서 해당 유저의 기존 ballot 삭제
      await tx.voteBallot.deleteMany({
        where: {
          userId,
          option: { voteId },
        },
      });

      // 새 ballot 생성
      await tx.voteBallot.createMany({
        data: dto.optionIds.map((optionId) => ({ optionId, userId })),
      });
    });

    return this.findOne(userId, groupId, voteId);
  }

  /**
   * 투표 취소
   */
  async cancelBallot(
    userId: string,
    groupId: string,
    voteId: string,
  ): Promise<VoteDto> {
    await this.assertGroupMember(userId, groupId);

    const vote = await this.prisma.vote.findUnique({
      where: { id: voteId },
      include: { options: true },
    });

    if (!vote || vote.groupId !== groupId) {
      throw new NotFoundException('투표를 찾을 수 없습니다');
    }

    if (vote.endsAt && vote.endsAt <= new Date()) {
      throw new BadRequestException('마감된 투표는 취소할 수 없습니다');
    }

    await this.prisma.voteBallot.deleteMany({
      where: {
        userId,
        option: { voteId },
      },
    });

    return this.findOne(userId, groupId, voteId);
  }

  /**
   * 그룹 멤버 검증
   */
  private async assertGroupMember(
    userId: string,
    groupId: string,
  ): Promise<void> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('그룹 멤버만 접근할 수 있습니다');
    }
  }

  /**
   * Prisma Vote 엔티티 → VoteDto 변환
   */
  private toDto(vote: any, userId: string): VoteDto {
    const now = new Date();
    const isOngoing = !vote.endsAt || vote.endsAt > now;

    const voterSet = new Set<string>();
    vote.options.forEach((opt: any) => {
      opt.ballots.forEach((b: any) => voterSet.add(b.userId));
    });

    const hasVoted = vote.options.some((opt: any) =>
      opt.ballots.some((b: any) => b.userId === userId),
    );

    const options: VoteOptionDto[] = vote.options.map((opt: any) => ({
      id: opt.id,
      label: opt.label,
      count: opt.ballots.length,
      isSelected: opt.ballots.some((b: any) => b.userId === userId),
      voters: vote.isAnonymous ? [] : opt.ballots.map((b: any) => b.user.name),
    }));

    return {
      id: vote.id,
      groupId: vote.groupId,
      title: vote.title,
      description: vote.description,
      isMultiple: vote.isMultiple,
      isAnonymous: vote.isAnonymous,
      endsAt: vote.endsAt,
      isOngoing,
      totalVoters: voterSet.size,
      hasVoted,
      creatorName: vote.creator.name,
      createdAt: vote.createdAt,
      options,
    };
  }
}
