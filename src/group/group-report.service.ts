import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WebhookService } from '@/webhook/webhook.service';
import { RedisService } from '@/redis/redis.service';
import { ReportMemberDto } from '@/group/dto/report-member.dto';
import { ResolveReportDto } from '@/group/dto/resolve-report.dto';
import { ReportStatus } from '@prisma/client';

const REPORT_RATE_LIMIT = 5;
const REPORT_RATE_WINDOW_SEC = 60 * 60 * 24; // 24시간

@Injectable()
export class GroupReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 그룹 내 멤버 신고
   */
  async reportMember(
    userId: string,
    groupId: string,
    targetUserId: string,
    dto: ReportMemberDto,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException('자기 자신을 신고할 수 없습니다');
    }

    await this.checkRateLimit(userId);

    const [group, reporterMember, reportedMember] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId } }),
      this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
        include: { user: { select: { name: true } } },
      }),
      this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: targetUserId } },
        include: { user: { select: { name: true } } },
      }),
    ]);

    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다');
    if (!reporterMember) throw new NotFoundException('그룹 멤버가 아닙니다');
    if (!reportedMember)
      throw new NotFoundException('신고 대상이 그룹 멤버가 아닙니다');

    const existing = await this.prisma.memberReport.findUnique({
      where: {
        groupId_reporterId_reportedId: {
          groupId,
          reporterId: userId,
          reportedId: targetUserId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('이미 해당 멤버를 신고했습니다');
    }

    const report = await this.prisma.memberReport.create({
      data: {
        groupId,
        reporterId: userId,
        reportedId: targetUserId,
        reason: dto.reason,
        detail: dto.detail ?? null,
      },
    });

    await this.incrementRateLimit(userId);

    this.webhookService
      .sendMemberReportToDiscord({
        id: report.id,
        groupId,
        groupName: group.name,
        reporterName: reporterMember.user.name,
        reportedName: reportedMember.user.name,
        reason: dto.reason,
        detail: dto.detail,
      })
      .catch(() => {});

    return report;
  }

  /**
   * 내가 신고한 목록 조회
   */
  async getMyReports(userId: string) {
    const reports = await this.prisma.memberReport.findMany({
      where: { reporterId: userId },
      include: {
        group: { select: { id: true, name: true } },
        reported: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      groupName: r.group.name,
      reportedId: r.reportedId,
      reportedName: r.reported.name,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  /**
   * 어드민 — 신고 목록 조회 (status 필터 가능)
   */
  async adminGetReports(status?: ReportStatus) {
    const reports = await this.prisma.memberReport.findMany({
      where: status ? { status } : undefined,
      include: {
        group: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        reported: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => ({
      id: r.id,
      groupId: r.groupId,
      groupName: r.group.name,
      reporterName: r.reporter.name,
      reportedName: r.reported.name,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      resolveNote: r.resolveNote,
      resolvedAt: r.resolvedAt,
      resolvedByName: r.resolvedBy?.name ?? null,
      createdAt: r.createdAt,
    }));
  }

  /**
   * 어드민 — 신고 처리 (상태 변경)
   */
  async adminResolveReport(
    adminId: string,
    reportId: string,
    dto: ResolveReportDto,
  ) {
    const report = await this.prisma.memberReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다');
    if (
      report.status === ReportStatus.RESOLVED ||
      report.status === ReportStatus.DISMISSED
    ) {
      throw new ConflictException('이미 처리 완료된 신고입니다');
    }

    const isTerminal =
      dto.status === ReportStatus.RESOLVED ||
      dto.status === ReportStatus.DISMISSED;

    return this.prisma.memberReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        resolveNote: dto.resolveNote ?? null,
        resolvedById: isTerminal ? adminId : null,
        resolvedAt: isTerminal ? new Date() : null,
      },
    });
  }

  /**
   * Rate Limit 확인 — 24시간 내 5건 초과 시 차단
   */
  private async checkRateLimit(userId: string) {
    const key = `report:ratelimit:${userId}`;
    const count = await this.redis.get<number>(key);
    if (count !== null && count >= REPORT_RATE_LIMIT) {
      throw new BadRequestException(
        '하루 신고 한도(5건)를 초과했습니다. 24시간 후 다시 시도해 주세요',
      );
    }
  }

  /**
   * Rate Limit 카운트 증가
   */
  private async incrementRateLimit(userId: string) {
    const key = `report:ratelimit:${userId}`;
    const count = await this.redis.get<number>(key);
    if (count === null) {
      await this.redis.set(key, 1, REPORT_RATE_WINDOW_SEC);
    } else {
      await this.redis.set(key, count + 1, REPORT_RATE_WINDOW_SEC);
    }
  }
}
