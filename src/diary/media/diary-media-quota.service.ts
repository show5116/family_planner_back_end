import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaStatus, Prisma, SubscriptionTier } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '@/prisma/prisma.service';
import {
  diaryMonthStartInKst,
  nextDiaryMonthStartInKst,
} from '@/common/utils/date-kst.util';
import { MediaQuotaPlan } from '@/config/diary-media.config';
import { MediaQuotaDto } from './dto/diary-media-response.dto';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class DiaryMediaQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** 등급별 한도 (환경변수 오버라이드 가능한 서버 설정에서 읽는다) */
  getPlan(tier: SubscriptionTier): MediaQuotaPlan {
    const plans =
      this.config.get<Record<string, MediaQuotaPlan>>('diaryMedia.plans');
    return plans[tier] ?? plans[SubscriptionTier.free];
  }

  getAllPlans(): Record<string, MediaQuotaPlan> {
    return this.config.get<Record<string, MediaQuotaPlan>>('diaryMedia.plans');
  }

  /** 월간 집계 기준 시각 (이번 달 1일 04:00 KST) */
  monthStart(now: Date = new Date()): Date {
    return diaryMonthStartInKst(now);
  }

  /** PENDING 예약이 유효한 최소 시각 (이보다 오래된 예약은 정리 대상이라 집계에서 뺀다) */
  pendingCutoff(now: Date = new Date()): Date {
    const minutes = this.config.get<number>('diaryMedia.reservationTtlMinutes');
    return dayjs(now).subtract(minutes, 'minute').toDate();
  }

  /**
   * 사용자의 현재 한도 상태
   *
   * - 월간: uploadedAt이 이번 달(04:00 KST 경계)인 미디어의 fileSize 합
   *   ★ 삭제된 것도 포함한다 — 지웠다 올렸다로 월간 한도를 무한히 되돌릴 수 없게.
   * - 누적: deletedAt IS NULL인 미디어의 fileSize 합 (삭제 시 즉시 회복)
   * - 양쪽 모두 유효한 PENDING 예약분(declaredSize)을 더해, 업로드 중인 파일도 게이지에 잡힌다.
   */
  async getQuota(
    userId: string,
    tier: SubscriptionTier,
    db: Db = this.prisma,
    now: Date = new Date(),
  ): Promise<MediaQuotaDto> {
    const plan = this.getPlan(tier);
    const monthStart = diaryMonthStartInKst(now);
    const cutoff = this.pendingCutoff(now);

    const [monthlyConfirmed, totalConfirmed, pending] = await Promise.all([
      db.diaryMedia.aggregate({
        _sum: { fileSize: true },
        where: {
          userId,
          status: MediaStatus.CONFIRMED,
          uploadedAt: { gte: monthStart },
        },
      }),
      db.diaryMedia.aggregate({
        _sum: { fileSize: true },
        where: {
          userId,
          status: MediaStatus.CONFIRMED,
          deletedAt: null,
        },
      }),
      db.diaryMedia.aggregate({
        _sum: { declaredSize: true },
        where: {
          userId,
          status: MediaStatus.PENDING,
          deletedAt: null,
          reservedAt: { gte: cutoff },
        },
      }),
    ]);

    const reserved = pending._sum.declaredSize ?? 0;
    const monthlyUsed = (monthlyConfirmed._sum.fileSize ?? 0) + reserved;
    const totalUsed = (totalConfirmed._sum.fileSize ?? 0) + reserved;

    return {
      tier,
      monthly: {
        usedBytes: monthlyUsed,
        limitBytes: plan.monthlyBytes,
        remainingBytes: Math.max(0, plan.monthlyBytes - monthlyUsed),
        resetsAt: nextDiaryMonthStartInKst(now),
      },
      total: {
        usedBytes: totalUsed,
        limitBytes: plan.totalBytes,
        remainingBytes: Math.max(0, plan.totalBytes - totalUsed),
      },
      perFileLimitBytes: plan.perFileBytes,
      videoAllowed: plan.videoAllowed,
      maxVideoDurationMs: plan.maxVideoDurationMs,
    };
  }

  /**
   * 크기 하나가 더 들어갈 자리가 있는지
   *
   * 다운그레이드로 이미 누적 한도를 넘긴 상태여도 "신규 업로드만" 막는다 —
   * 조회·삭제는 그대로 되어야 한다(데이터를 인질로 잡지 않는다).
   */
  hasRoomFor(quota: MediaQuotaDto, bytes: number): boolean {
    return (
      quota.monthly.remainingBytes >= bytes &&
      quota.total.remainingBytes >= bytes
    );
  }
}
