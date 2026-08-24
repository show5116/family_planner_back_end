import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoutineChallengeDto } from './dto/create-routine-challenge.dto';
import { UpdateRoutineChallengeDto } from './dto/update-routine-challenge.dto';
import { JoinRoutineChallengeDto } from './dto/join-routine-challenge.dto';
import { RoutineChallengeStatus } from './dto/routine-challenge-response.dto';
import {
  computeChallengeStatus,
  computeAchieved,
} from './utils/routine-challenge.util';
import { parseDateOnly, todayInKst } from '@/common/utils/date-kst.util';

@Injectable()
export class RoutineChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private t(key: string) {
    return this.i18n.t(`routine.${key}`, {
      lang: I18nContext.current()?.lang ?? 'ko',
    });
  }

  private async validateGroupMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException(this.t('errors.no_group_access'));
  }

  /** challengeId로 챌린지를 찾고 그룹 멤버십을 검증 */
  private async findChallengeWithAccess(userId: string, challengeId: string) {
    const challenge = await this.prisma.routineChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException(this.t('errors.challenge_not_found'));
    }
    await this.validateGroupMembership(userId, challenge.groupId);
    return challenge;
  }

  /** 챌린지를 만든 사람인지까지 검증 */
  private async findOwnChallenge(userId: string, challengeId: string) {
    const challenge = await this.findChallengeWithAccess(userId, challengeId);
    if (challenge.createdBy !== userId) {
      throw new ForbiddenException(this.t('errors.own_challenge_only_update'));
    }
    return challenge;
  }

  private validateDateRange(startDate: Date, endDate: Date) {
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        this.t('errors.challenge_invalid_date_range'),
      );
    }
  }

  /** 그룹의 챌린지 목록 조회 */
  async findGroupChallenges(userId: string, groupId: string) {
    await this.validateGroupMembership(userId, groupId);

    const challenges = await this.prisma.routineChallenge.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
    const challengeIds = challenges.map((c) => c.id);

    const [myParticipations, participantCounts] = await Promise.all([
      this.prisma.routineChallengeParticipant.findMany({
        where: { challengeId: { in: challengeIds }, userId },
      }),
      this.prisma.routineChallengeParticipant.groupBy({
        by: ['challengeId'],
        where: { challengeId: { in: challengeIds } },
        _count: { _all: true },
      }),
    ]);

    const myParticipationMap = new Map(
      myParticipations.map((p) => [p.challengeId, p]),
    );
    const participantCountMap = new Map(
      participantCounts.map((c) => [c.challengeId, c._count._all]),
    );

    const myCheckedCounts = new Map<string, number>();
    await Promise.all(
      challenges.map(async (challenge) => {
        const participation = myParticipationMap.get(challenge.id);
        if (!participation) return;
        const count = await this.prisma.routineLog.count({
          where: {
            routineId: participation.routineId,
            checkedDate: { gte: challenge.startDate, lte: challenge.endDate },
          },
        });
        myCheckedCounts.set(challenge.id, count);
      }),
    );

    const today = todayInKst();

    return challenges.map((challenge) => {
      const participation = myParticipationMap.get(challenge.id);
      const joined = !!participation;
      const myCheckedCount = joined
        ? (myCheckedCounts.get(challenge.id) ?? 0)
        : null;

      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        targetCount: challenge.targetCount,
        reward: challenge.reward,
        status: computeChallengeStatus(
          challenge.startDate,
          challenge.endDate,
          today,
        ),
        participantCount: participantCountMap.get(challenge.id) ?? 0,
        joined,
        myCheckedCount,
        myAchieved: joined
          ? computeAchieved(myCheckedCount ?? 0, challenge.targetCount)
          : false,
        createdBy: challenge.createdBy,
        isMine: challenge.createdBy === userId,
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
      };
    });
  }

  /** 챌린지 생성 (만든 사람이 자동 참가되지는 않음) */
  async create(
    userId: string,
    groupId: string,
    dto: CreateRoutineChallengeDto,
  ) {
    await this.validateGroupMembership(userId, groupId);

    const startDate = parseDateOnly(dto.startDate);
    const endDate = parseDateOnly(dto.endDate);
    this.validateDateRange(startDate, endDate);

    const challenge = await this.prisma.routineChallenge.create({
      data: {
        groupId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        startDate,
        endDate,
        targetCount: dto.targetCount,
        reward: dto.reward,
      },
    });

    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      targetCount: challenge.targetCount,
      reward: challenge.reward,
      status: computeChallengeStatus(
        challenge.startDate,
        challenge.endDate,
        todayInKst(),
      ),
      participantCount: 0,
      joined: false,
      myCheckedCount: null,
      myAchieved: false,
      createdBy: challenge.createdBy,
      isMine: true,
      createdAt: challenge.createdAt,
      updatedAt: challenge.updatedAt,
    };
  }

  /** 챌린지 상세 조회 (참가자별 진행률 포함) */
  async findOne(userId: string, challengeId: string) {
    const challenge = await this.findChallengeWithAccess(userId, challengeId);

    const rows = await this.prisma.routineChallengeParticipant.findMany({
      where: { challengeId },
      include: {
        user: { select: { id: true, name: true } },
        routine: { select: { id: true, title: true, emoji: true } },
      },
    });

    const routineIds = rows.map((r) => r.routineId);
    const grouped =
      routineIds.length > 0
        ? await this.prisma.routineLog.groupBy({
            by: ['routineId'],
            where: {
              routineId: { in: routineIds },
              checkedDate: { gte: challenge.startDate, lte: challenge.endDate },
            },
            _count: { _all: true },
          })
        : [];
    const checkedCountMap = new Map(
      grouped.map((g) => [g.routineId, g._count._all]),
    );

    const participants = rows.map((row) => {
      const checkedCount = checkedCountMap.get(row.routineId) ?? 0;
      return {
        userId: row.user.id,
        userName: row.user.name,
        routineId: row.routine.id,
        routineTitle: row.routine.title,
        routineEmoji: row.routine.emoji,
        checkedCount,
        achieved: computeAchieved(checkedCount, challenge.targetCount),
      };
    });

    const myParticipant = participants.find((p) => p.userId === userId);
    const joined = !!myParticipant;

    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      targetCount: challenge.targetCount,
      reward: challenge.reward,
      status: computeChallengeStatus(
        challenge.startDate,
        challenge.endDate,
        todayInKst(),
      ),
      participantCount: participants.length,
      joined,
      myCheckedCount: myParticipant?.checkedCount ?? null,
      myAchieved: myParticipant?.achieved ?? false,
      createdBy: challenge.createdBy,
      isMine: challenge.createdBy === userId,
      createdAt: challenge.createdAt,
      updatedAt: challenge.updatedAt,
      participants,
    };
  }

  /** 챌린지 수정 (만든 사람만) */
  async update(
    userId: string,
    challengeId: string,
    dto: UpdateRoutineChallengeDto,
  ) {
    const challenge = await this.findOwnChallenge(userId, challengeId);

    const startDate =
      dto.startDate !== undefined
        ? parseDateOnly(dto.startDate)
        : challenge.startDate;
    const endDate =
      dto.endDate !== undefined
        ? parseDateOnly(dto.endDate)
        : challenge.endDate;
    this.validateDateRange(startDate, endDate);

    const updated = await this.prisma.routineChallenge.update({
      where: { id: challengeId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.startDate !== undefined && { startDate }),
        ...(dto.endDate !== undefined && { endDate }),
        ...(dto.targetCount !== undefined && {
          targetCount: dto.targetCount,
        }),
        ...(dto.reward !== undefined && { reward: dto.reward }),
      },
    });

    const participantCount =
      await this.prisma.routineChallengeParticipant.count({
        where: { challengeId },
      });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      startDate: updated.startDate,
      endDate: updated.endDate,
      targetCount: updated.targetCount,
      reward: updated.reward,
      status: computeChallengeStatus(
        updated.startDate,
        updated.endDate,
        todayInKst(),
      ),
      participantCount,
      joined: false,
      myCheckedCount: null,
      myAchieved: false,
      createdBy: updated.createdBy,
      isMine: true,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /** 챌린지 삭제 (만든 사람만, 참가 기록은 FK cascade로 함께 삭제) */
  async remove(userId: string, challengeId: string) {
    await this.findOwnChallenge(userId, challengeId);

    await this.prisma.routineChallenge.delete({ where: { id: challengeId } });

    return { message: this.t('success.challenge_deleted') };
  }

  /** 챌린지 참가 (자유 참가, 이미 참가 중이면 연결 습관 교체) */
  async join(
    userId: string,
    challengeId: string,
    dto: JoinRoutineChallengeDto,
  ) {
    const challenge = await this.findChallengeWithAccess(userId, challengeId);

    const status = computeChallengeStatus(
      challenge.startDate,
      challenge.endDate,
      todayInKst(),
    );
    if (status === RoutineChallengeStatus.ENDED) {
      throw new BadRequestException(this.t('errors.challenge_already_ended'));
    }

    const routine = await this.prisma.routine.findFirst({
      where: { id: dto.routineId, deletedAt: null },
    });
    if (!routine) {
      throw new NotFoundException(this.t('errors.routine_not_found'));
    }
    if (routine.userId !== userId) {
      throw new ForbiddenException(this.t('errors.own_routine_only_join'));
    }
    if (routine.isPrivate) {
      throw new BadRequestException(
        this.t('errors.private_routine_not_joinable'),
      );
    }

    await this.prisma.routineChallengeParticipant.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      create: { challengeId, userId, routineId: dto.routineId },
      update: { routineId: dto.routineId },
    });

    return this.findOne(userId, challengeId);
  }

  /** 챌린지 참가 취소 */
  async leave(userId: string, challengeId: string) {
    await this.findChallengeWithAccess(userId, challengeId);

    const participant =
      await this.prisma.routineChallengeParticipant.findUnique({
        where: { challengeId_userId: { challengeId, userId } },
      });
    if (!participant) {
      throw new NotFoundException(
        this.t('errors.challenge_participation_not_found'),
      );
    }

    await this.prisma.routineChallengeParticipant.delete({
      where: { id: participant.id },
    });

    return { message: this.t('success.challenge_left') };
  }
}
