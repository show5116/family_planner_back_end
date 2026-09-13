import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MediaQuotaPlan } from '@/config/diary-media.config';
import {
  sumStoredMediaBytes,
  sumStoredMediaBytesForAll,
} from '@/common/utils/media-usage.util';
import {
  AdminUpdateSubscriptionDto,
  AdminUserQueryDto,
  AdminUserDto,
  AdminUserPageDto,
  AdminStorageBucketDto,
  AdminStorageStatsDto,
  AdminTierStorageDto,
  UserDeleteStatus,
} from './dto/admin-subscription.dto';

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** 저장량 분포 구간 (상한 없는 마지막 칸은 maxBytes: null) */
const STORAGE_BUCKETS: { label: string; maxBytes: number | null }[] = [
  { label: '~100MB', maxBytes: 100 * MB },
  { label: '~500MB', maxBytes: 500 * MB },
  { label: '~2GB', maxBytes: 2 * GB },
  { label: '~5GB', maxBytes: 5 * GB },
  { label: '~20GB', maxBytes: 20 * GB },
  { label: '~40GB', maxBytes: 40 * GB },
  { label: '40GB+', maxBytes: null },
];

/** 한도의 몇 %부터 "임박"으로 볼지 — 상위 등급 수요 신호 */
const NEAR_LIMIT_RATIO = 0.8;

@Injectable()
export class SubscriptionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getUsers(query: AdminUserQueryDto): Promise<AdminUserPageDto> {
    const {
      page = 1,
      limit = 20,
      search,
      tier,
      deleteStatus = UserDeleteStatus.ALL,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(tier && { subscriptionTier: tier }),
      ...(search && {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }),
    };

    if (deleteStatus === UserDeleteStatus.ACTIVE) {
      where.deletedAt = null;
    } else if (deleteStatus === UserDeleteStatus.PENDING_DELETE) {
      where.deletedAt = { not: null };
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          provider: true,
          subscriptionTier: true,
          subscriptionExpiresAt: true,
          createdAt: true,
          lastLoginAt: true,
          deletedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // 페이지에 실린 사용자만 집계한다 (쿼리 1회 추가)
    const usage = await sumStoredMediaBytes(
      this.prisma,
      users.map((u) => u.id),
    );

    return {
      items: users.map((u) => this.toDto(u, usage.get(u.id) ?? 0)),
      total,
      page,
      limit,
    };
  }

  async getUser(userId: string): Promise<AdminUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        provider: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
      },
    });

    if (!user)
      throw new NotFoundException('subscription.errors.user_not_found');

    const usage = await sumStoredMediaBytes(this.prisma, [user.id]);

    return this.toDto(user, usage.get(user.id) ?? 0);
  }

  async updateUserSubscription(
    userId: string,
    dto: AdminUpdateSubscriptionDto,
  ): Promise<AdminUserDto> {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists)
      throw new NotFoundException('subscription.errors.user_not_found');

    const expiresAt =
      dto.expiresAt === null
        ? null
        : dto.expiresAt
          ? new Date(dto.expiresAt)
          : undefined;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: dto.tier,
        ...(expiresAt !== undefined && { subscriptionExpiresAt: expiresAt }),
        // free로 내리면 체험 이월분도 함께 정리한다
        ...(dto.tier === SubscriptionTier.free && { trialCarryoverDays: 0 }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        provider: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
      },
    });

    const usage = await sumStoredMediaBytes(this.prisma, [user.id]);

    return this.toDto(user, usage.get(user.id) ?? 0);
  }

  /**
   * 저장 사용량 분포 (ADMIN)
   *
   * "상위 등급을 만들 시점인가"를 감이 아니라 숫자로 판단하기 위한 것이다.
   * `nearLimitCount`(한도 80% 이상)와 `overLimitCount`가 그 신호다.
   *
   * 집계 대상을 **미디어가 있는 사용자**로 좁혀 전체 사용자 수와 무관하게 결과가
   * 실제 사용자 수만큼만 커지도록 한다. 등급별 전체 인원은 별도 count로 받는다.
   */
  async getStorageStats(): Promise<AdminStorageStatsDto> {
    const usage = await sumStoredMediaBytesForAll(this.prisma);
    const userIds = [...usage.keys()];

    const [tierTotals, mediaUsers] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['subscriptionTier'],
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, subscriptionTier: true },
      }),
    ]);

    const userCountByTier = new Map(
      tierTotals.map((row) => [row.subscriptionTier, row._count._all]),
    );

    // 등급별로 바이트를 모은다 (사용자가 사라진 고아 집계는 자연히 빠진다)
    const bytesByTier = new Map<SubscriptionTier, number[]>();
    for (const user of mediaUsers) {
      const bytes = usage.get(user.id) ?? 0;
      const bucket = bytesByTier.get(user.subscriptionTier) ?? [];
      bucket.push(bytes);
      bytesByTier.set(user.subscriptionTier, bucket);
    }

    const plans =
      this.config.get<Record<string, MediaQuotaPlan>>('diaryMedia.plans');

    const tiers = Object.values(SubscriptionTier).map<AdminTierStorageDto>(
      (tier) => {
        const values = (bytesByTier.get(tier) ?? []).sort((a, b) => a - b);
        const limitBytes = plans[tier].totalBytes;
        const nearLimitBytes = limitBytes * NEAR_LIMIT_RATIO;

        return {
          tier,
          userCount: userCountByTier.get(tier) ?? 0,
          usersWithMedia: values.length,
          totalBytes: values.reduce((sum, v) => sum + v, 0),
          medianBytes: this.median(values),
          maxBytes: values.length > 0 ? values[values.length - 1] : 0,
          limitBytes,
          nearLimitCount: values.filter(
            (v) => v >= nearLimitBytes && v < limitBytes,
          ).length,
          overLimitCount: values.filter((v) => v >= limitBytes).length,
        };
      },
    );

    const allBytes = [...usage.values()];

    return {
      totalStoredBytes: allBytes.reduce((sum, v) => sum + v, 0),
      usersWithMedia: allBytes.length,
      tiers,
      buckets: this.toBuckets(allBytes),
    };
  }

  /** 정렬된 배열의 중앙값 (비어 있으면 0) */
  private median(sorted: number[]): number {
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  private toBuckets(allBytes: number[]): AdminStorageBucketDto[] {
    return STORAGE_BUCKETS.map((bucket, index) => {
      const lower =
        index === 0 ? 0 : (STORAGE_BUCKETS[index - 1].maxBytes ?? 0);

      return {
        label: bucket.label,
        maxBytes: bucket.maxBytes,
        userCount: allBytes.filter(
          (bytes) =>
            bytes > lower &&
            (bucket.maxBytes === null || bytes <= bucket.maxBytes),
        ).length,
      };
    });
  }

  private toDto(
    user: {
      id: string;
      name: string;
      email: string | null;
      isAdmin: boolean;
      provider: string;
      subscriptionTier: SubscriptionTier;
      subscriptionExpiresAt: Date | null;
      createdAt: Date;
      lastLoginAt: Date | null;
      deletedAt: Date | null;
    },
    storageUsedBytes: number,
  ): AdminUserDto {
    const isActive =
      user.subscriptionTier !== SubscriptionTier.free &&
      (user.subscriptionExpiresAt === null ||
        user.subscriptionExpiresAt > new Date());

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      provider: user.provider,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isSubscriptionActive: isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt,
      storageUsedBytes,
    };
  }
}
