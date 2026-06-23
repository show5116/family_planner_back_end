import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateAnniversaryDto,
  MilestoneConfigDto,
} from './dto/create-anniversary.dto';
import { UpdateAnniversaryDto } from './dto/update-anniversary.dto';
import { AnniversaryOffsetType } from './enums';

interface MilestoneSpec {
  offsetDays: number;
  offsetType: AnniversaryOffsetType;
  title: string;
  scheduledAt: Date;
}

@Injectable()
export class AnniversaryService {
  /** 즉시 생성할 미래 범위 (2년) */
  private readonly PREGENERATE_DAYS = 365 * 2;

  constructor(private prisma: PrismaService) {}

  /**
   * 그룹 기념일 목록 조회 (경과일 포함)
   */
  async getAnniversaries(userId: string, groupId: string) {
    await this.assertGroupMember(userId, groupId);

    const anniversaries = await this.prisma.anniversary.findMany({
      where: { groupId },
      orderBy: { date: 'asc' },
    });

    const today = this.todayUtc();
    return anniversaries.map((a) => this.withDaysSince(a, today));
  }

  /**
   * 기념일 단건 조회 (경과일 포함)
   */
  async getAnniversaryById(userId: string, anniversaryId: string) {
    const anniversary = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });
    if (!anniversary) throw new NotFoundException('기념일을 찾을 수 없습니다');

    await this.assertGroupMember(userId, anniversary.groupId);

    return this.withDaysSince(anniversary, this.todayUtc());
  }

  /**
   * 기념일 생성
   * - D-Day Task는 milestoneConfig 없어도 항상 생성
   * - milestoneConfig 있으면 2년치 milestone Task 추가 생성
   */
  async createAnniversary(userId: string, dto: CreateAnniversaryDto) {
    await this.assertGroupMember(userId, dto.groupId);

    const baseDate = new Date(dto.date);
    const config = dto.milestoneConfig ?? null;

    const anniversary = await this.prisma.anniversary.create({
      data: {
        groupId: dto.groupId,
        title: dto.title,
        date: baseDate,
        emoji: dto.emoji ?? null,
        milestoneConfig: config ? (config as object) : undefined,
      },
    });

    await this.generateMilestoneTasks(
      anniversary.id,
      dto.groupId,
      userId,
      dto.title,
      baseDate,
      config,
    );

    return this.withDaysSince(anniversary, this.todayUtc());
  }

  /**
   * 기념일 수정
   * - 날짜 변경 시 연동 Task scheduledAt 재계산
   * - milestoneConfig 변경 시 미래 milestone Task 재생성
   */
  async updateAnniversary(
    userId: string,
    anniversaryId: string,
    dto: UpdateAnniversaryDto,
  ) {
    const anniversary = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });
    if (!anniversary) throw new NotFoundException('기념일을 찾을 수 없습니다');

    await this.assertGroupMember(userId, anniversary.groupId);

    const newDate = dto.date ? new Date(dto.date) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.anniversary.update({
        where: { id: anniversaryId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(newDate && { date: newDate }),
          ...(dto.emoji !== undefined && { emoji: dto.emoji }),
          ...(dto.milestoneConfig !== undefined && {
            milestoneConfig: dto.milestoneConfig
              ? (dto.milestoneConfig as object)
              : null,
          }),
        },
      });

      // 날짜 변경 시 연동 Task scheduledAt 재계산
      if (newDate) {
        await this.recalculateLinkedTasks(tx, anniversaryId, newDate);
      }

      return result;
    });

    // milestoneConfig 변경 시 미래 milestone Task 재생성
    if (dto.milestoneConfig !== undefined) {
      const effectiveDate = newDate ?? anniversary.date;
      const effectiveTitle = dto.title ?? anniversary.title;
      await this.deleteFutureMilestoneTasks(anniversaryId);
      await this.generateMilestoneTasks(
        anniversaryId,
        anniversary.groupId,
        userId,
        effectiveTitle,
        effectiveDate,
        dto.milestoneConfig ?? null,
      );
    }

    return this.withDaysSince(updated, this.todayUtc());
  }

  /**
   * 기념일 삭제
   * deleteWithTasks=true: 연동 Task 함께 삭제 (Cascade)
   * deleteWithTasks=false: Task 유지, anniversaryId만 null 처리
   */
  async deleteAnniversary(
    userId: string,
    anniversaryId: string,
    deleteWithTasks: boolean,
  ) {
    const anniversary = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });
    if (!anniversary) throw new NotFoundException('기념일을 찾을 수 없습니다');

    await this.assertGroupMember(userId, anniversary.groupId);

    if (!deleteWithTasks) {
      await this.prisma.task.updateMany({
        where: { anniversaryId, deletedAt: null },
        data: { anniversaryId: null, offsetDays: null, offsetType: null },
      });
    }

    await this.prisma.anniversary.delete({ where: { id: anniversaryId } });
    return { message: '기념일이 삭제되었습니다' };
  }

  /**
   * 스케줄러용: milestone Task 2년 범위 연장
   */
  async extendMilestoneTasks(anniversaryId: string) {
    const anniversary = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });
    if (!anniversary) return;

    // 스케줄러는 userId가 없으므로 그룹의 첫 번째 멤버 사용
    const member = await this.prisma.groupMember.findFirst({
      where: { groupId: anniversary.groupId },
      select: { userId: true },
    });
    if (!member) return;

    const config = anniversary.milestoneConfig as MilestoneConfigDto | null;
    await this.generateMilestoneTasks(
      anniversaryId,
      anniversary.groupId,
      member.userId,
      anniversary.title,
      anniversary.date,
      config,
    );
  }

  /**
   * Task 생성/수정 시 anniversaryId + offsetDays → scheduledAt 계산
   */
  async resolveScheduledAt(
    anniversaryId: string,
    offsetDays: number,
    offsetType: AnniversaryOffsetType,
  ): Promise<Date> {
    const anniversary = await this.prisma.anniversary.findUnique({
      where: { id: anniversaryId },
    });
    if (!anniversary) throw new NotFoundException('기념일을 찾을 수 없습니다');

    return this.calcScheduledAt(anniversary.date, offsetDays, offsetType);
  }

  // ==================== Private ====================

  /**
   * milestone Task 일괄 생성 (중복 방지 포함)
   * - config 없어도 D-Day Task(D+0)는 항상 생성
   * - 기념일 당일부터 오늘+2년까지 (과거 포함)
   */
  private async generateMilestoneTasks(
    anniversaryId: string,
    groupId: string,
    userId: string,
    anniversaryTitle: string,
    baseDate: Date,
    config: MilestoneConfigDto | null,
  ) {
    const today = this.todayUtc();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + this.PREGENERATE_DAYS);

    const specs = this.buildMilestoneSpecs(
      anniversaryTitle,
      baseDate,
      config,
      baseDate,
      cutoff,
    );
    if (specs.length === 0) return;

    // 이미 존재하는 (offsetDays, offsetType) 조합 조회 (중복 방지)
    const existing = await this.prisma.task.findMany({
      where: { anniversaryId, deletedAt: null },
      select: { offsetDays: true, offsetType: true },
    });
    const existingSet = new Set(
      existing
        .filter((t) => t.offsetDays != null && t.offsetType != null)
        .map((t) => `${t.offsetDays}:${t.offsetType}`),
    );

    const toCreate = specs.filter(
      (s) => !existingSet.has(`${s.offsetDays}:${s.offsetType}`),
    );
    if (toCreate.length === 0) return;

    await this.prisma.task.createMany({
      data: toCreate.map((s) => ({
        userId,
        groupId,
        anniversaryId,
        offsetDays: s.offsetDays,
        offsetType: s.offsetType,
        title: s.title,
        type: 'CALENDAR_ONLY' as const,
        priority: 'MEDIUM' as const,
        scheduledAt: s.scheduledAt,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * milestone 목록 계산
   * - D+0 (D-Day)는 항상 포함
   * - config.every100Days: D+100, D+200, ...
   * - config.everyYear: 1주년, 2주년, ...
   */
  private buildMilestoneSpecs(
    title: string,
    baseDate: Date,
    config: MilestoneConfigDto | null,
    from: Date,
    to: Date,
  ): MilestoneSpec[] {
    const specs: MilestoneSpec[] = [];

    // D-Day는 항상 생성
    const dDayDate = this.calcScheduledAt(
      baseDate,
      0,
      AnniversaryOffsetType.DAYS,
    );
    if (dDayDate >= from && dDayDate <= to) {
      specs.push({
        offsetDays: 0,
        offsetType: AnniversaryOffsetType.DAYS,
        title: `${title} D-Day`,
        scheduledAt: dDayDate,
      });
    }

    if (!config) return specs;

    // 100일 단위 (D+100부터)
    if (config.every100Days) {
      let n = 100;
      while (true) {
        const scheduledAt = this.calcScheduledAt(
          baseDate,
          n,
          AnniversaryOffsetType.DAYS,
        );
        if (scheduledAt > to) break;
        if (scheduledAt >= from) {
          specs.push({
            offsetDays: n,
            offsetType: AnniversaryOffsetType.DAYS,
            title: `${title} D+${n}`,
            scheduledAt,
          });
        }
        n += 100;
      }
    }

    // 매년 주년
    if (config.everyYear) {
      let n = 1;
      while (true) {
        const scheduledAt = this.calcScheduledAt(
          baseDate,
          n,
          AnniversaryOffsetType.YEARS,
        );
        if (scheduledAt > to) break;
        if (scheduledAt >= from) {
          specs.push({
            offsetDays: n,
            offsetType: AnniversaryOffsetType.YEARS,
            title: `${title} ${n}주년`,
            scheduledAt,
          });
        }
        n++;
      }
    }

    return specs;
  }

  /**
   * 미래 milestone Task 소프트 삭제 (milestoneConfig 변경 시)
   */
  private async deleteFutureMilestoneTasks(anniversaryId: string) {
    const today = this.todayUtc();
    await this.prisma.task.updateMany({
      where: {
        anniversaryId,
        deletedAt: null,
        scheduledAt: { gte: today },
        offsetDays: { not: null },
      },
      data: { deletedAt: today },
    });
  }

  /**
   * 기념일 기준 scheduledAt 계산
   */
  calcScheduledAt(
    baseDate: Date,
    offset: number,
    offsetType: AnniversaryOffsetType,
  ): Date {
    const d = new Date(baseDate);
    if (offsetType === AnniversaryOffsetType.DAYS) {
      d.setUTCDate(d.getUTCDate() + offset);
    } else {
      d.setUTCFullYear(d.getUTCFullYear() + offset);
    }
    return d;
  }

  /**
   * 날짜 변경 시 연동 Task scheduledAt 재계산
   */
  private async recalculateLinkedTasks(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    anniversaryId: string,
    newBase: Date,
  ) {
    const linkedTasks = await tx.task.findMany({
      where: { anniversaryId, deletedAt: null, offsetDays: { not: null } },
      select: { id: true, offsetDays: true, offsetType: true },
    });

    for (const task of linkedTasks) {
      if (task.offsetDays == null || task.offsetType == null) continue;
      const scheduledAt = this.calcScheduledAt(
        newBase,
        task.offsetDays,
        task.offsetType as AnniversaryOffsetType,
      );
      await tx.task.update({
        where: { id: task.id },
        data: { scheduledAt },
      });
    }
  }

  /**
   * 경과일 계산 (기념일로부터 D+N, 미래면 음수)
   */
  private withDaysSince<T extends { date: Date }>(
    anniversary: T,
    today: Date,
  ): T & { daysSince: number } {
    const diffMs = today.getTime() - anniversary.date.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return { ...anniversary, daysSince };
  }

  private todayUtc(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private async assertGroupMember(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('그룹 멤버만 접근할 수 있습니다');
  }
}
