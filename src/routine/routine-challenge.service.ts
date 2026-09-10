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
import { RoutineChallenge, RoutineChallengeParticipant } from '@prisma/client';
import { RoutineChallengeStatus } from './dto/routine-challenge-response.dto';
import {
  MyChallengeQueryDto,
  MyChallengeStatusFilter,
} from './dto/routine-challenge-query.dto';
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

    return this.buildChallengeList(userId, challenges);
  }

  /** 내가 속한 모든 그룹의 챌린지를 마감 임박순으로 조회 (ENDED 제외) */
  async findMyChallenges(userId: string, query: MyChallengeQueryDto) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true, group: { select: { name: true } } },
    });
    if (memberships.length === 0) return [];

    const groupNameMap = new Map(
      memberships.map((m) => [m.groupId, m.group.name]),
    );
    const today = todayInKst();

    const challenges = await this.prisma.routineChallenge.findMany({
      where: {
        groupId: { in: [...groupNameMap.keys()] },
        ...this.buildStatusDateFilter(query.status, today),
      },
      orderBy: [{ endDate: 'asc' }, { startDate: 'asc' }],
    });

    const challengeGroupMap = new Map(challenges.map((c) => [c.id, c.groupId]));
    const items = await this.buildChallengeList(userId, challenges);

    return items.map((item) => {
      const groupId = challengeGroupMap.get(item.id) ?? '';
      return {
        ...item,
        groupId,
        groupName: groupNameMap.get(groupId) ?? '',
      };
    });
  }

  /** 상태 필터를 startDate/endDate 조건으로 변환 (생략 시 ENDED만 제외) */
  private buildStatusDateFilter(
    status: MyChallengeStatusFilter | undefined,
    today: Date,
  ) {
    if (status === MyChallengeStatusFilter.ONGOING) {
      return { startDate: { lte: today }, endDate: { gte: today } };
    }
    if (status === MyChallengeStatusFilter.UPCOMING) {
      return { startDate: { gt: today } };
    }
    return { endDate: { gte: today } };
  }

  /** 챌린지 목록에 내 참가 정보·참가자 수·내 체크 횟수를 붙여 응답 형태로 변환 */
  private async buildChallengeList(
    userId: string,
    challenges: RoutineChallenge[],
  ) {
    if (challenges.length === 0) return [];

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

    const myCheckedCounts = await this.countMyChecks(
      challenges,
      myParticipationMap,
    );

    const today = todayInKst();

    return challenges.map((challenge) => {
      const joined = myParticipationMap.has(challenge.id);
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

  /**
   * 참가 중인 챌린지별 내 체크 횟수를 쿼리 1회로 집계.
   * 챌린지마다 기간이 달라 groupBy로는 나눌 수 없어, 전체 기간 로그를 한 번에 받아 메모리에서 센다.
   */
  private async countMyChecks(
    challenges: RoutineChallenge[],
    myParticipationMap: Map<string, RoutineChallengeParticipant>,
  ): Promise<Map<string, number>> {
    const joined = challenges.flatMap((challenge) => {
      const participation = myParticipationMap.get(challenge.id);
      return participation ? [{ challenge, participation }] : [];
    });
    if (joined.length === 0) return new Map();

    const routineIds = [
      ...new Set(joined.map(({ participation }) => participation.routineId)),
    ];
    const startTimes = joined.map(({ challenge }) =>
      challenge.startDate.getTime(),
    );
    const endTimes = joined.map(({ challenge }) => challenge.endDate.getTime());

    const logs = await this.prisma.routineLog.findMany({
      where: {
        routineId: { in: routineIds },
        checkedDate: {
          gte: new Date(Math.min(...startTimes)),
          lte: new Date(Math.max(...endTimes)),
        },
      },
      select: { routineId: true, checkedDate: true },
    });

    const checkedTimesByRoutine = new Map<string, number[]>();
    for (const log of logs) {
      const times = checkedTimesByRoutine.get(log.routineId) ?? [];
      times.push(log.checkedDate.getTime());
      checkedTimesByRoutine.set(log.routineId, times);
    }

    const counts = new Map<string, number>();
    for (const { challenge, participation } of joined) {
      const times = checkedTimesByRoutine.get(participation.routineId) ?? [];
      const start = challenge.startDate.getTime();
      const end = challenge.endDate.getTime();
      counts.set(
        challenge.id,
        times.filter((t) => t >= start && t <= end).length,
      );
    }
    return counts;
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
    const challenge = await this.findChallengeWithAccess(userId, challengeId);

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

    const [participantCount, myParticipation] = await Promise.all([
      this.prisma.routineChallengeParticipant.count({
        where: { challengeId },
      }),
      this.prisma.routineChallengeParticipant.findUnique({
        where: { challengeId_userId: { challengeId, userId } },
      }),
    ]);

    // 수정 후 기간 기준으로 내 체크 횟수를 다시 집계 (startDate/endDate가 바뀌었을 수 있음)
    const myCheckedCount = myParticipation
      ? await this.prisma.routineLog.count({
          where: {
            routineId: myParticipation.routineId,
            checkedDate: {
              gte: updated.startDate,
              lte: updated.endDate,
            },
          },
        })
      : null;

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
      joined: !!myParticipation,
      myCheckedCount,
      myAchieved: myParticipation
        ? computeAchieved(myCheckedCount ?? 0, updated.targetCount)
        : false,
      createdBy: updated.createdBy,
      isMine: true,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /** 챌린지 삭제 (만든 사람만, 참가 기록은 FK cascade로 함께 삭제) */
  async remove(userId: string, challengeId: string) {
    await this.findChallengeWithAccess(userId, challengeId);

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
