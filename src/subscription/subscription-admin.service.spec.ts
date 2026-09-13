import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaStatus, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionAdminService } from './subscription-admin.service';

const MB = 1024 * 1024;
const GB = 1024 * MB;

describe('SubscriptionAdminService', () => {
  let service: SubscriptionAdminService;

  const PLANS = {
    free: { totalBytes: 500 * MB },
    ad_free: { totalBytes: 4 * GB },
    premium: { totalBytes: 40 * GB },
  };

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    diaryMedia: { groupBy: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => PLANS as unknown),
  };

  const userRow = (id: string, tier: SubscriptionTier) => ({
    id,
    name: id,
    email: `${id}@test.com`,
    isAdmin: false,
    provider: 'LOCAL',
    subscriptionTier: tier,
    subscriptionExpiresAt: null,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    deletedAt: null,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(SubscriptionAdminService);

    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(PLANS as unknown);
    mockPrismaService.$transaction.mockImplementation((arg) =>
      typeof arg === 'function' ? arg(mockPrismaService) : Promise.all(arg),
    );
  });

  describe('getUsers', () => {
    it('페이지에 실린 사용자에게 저장 사용량을 붙여야 함', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        userRow('user-1', SubscriptionTier.premium),
        userRow('user-2', SubscriptionTier.free),
      ]);
      mockPrismaService.user.count.mockResolvedValue(2);
      mockPrismaService.diaryMedia.groupBy.mockResolvedValue([
        { userId: 'user-1', _sum: { fileSize: 3 * GB } },
      ]);

      const result = await service.getUsers({});

      expect(result.items[0].storageUsedBytes).toBe(3 * GB);
      // 미디어가 없는 사용자는 0으로 채운다 (undefined가 응답에 나가면 안 된다)
      expect(result.items[1].storageUsedBytes).toBe(0);
    });

    it('집계는 CONFIRMED + 미삭제만, 페이지에 실린 사용자만 대상이어야 함', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        userRow('user-1', SubscriptionTier.free),
      ]);
      mockPrismaService.user.count.mockResolvedValue(1);
      mockPrismaService.diaryMedia.groupBy.mockResolvedValue([]);

      await service.getUsers({});

      expect(mockPrismaService.diaryMedia.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: { in: ['user-1'] },
            status: MediaStatus.CONFIRMED,
            deletedAt: null,
          },
        }),
      );
    });
  });

  describe('getStorageStats', () => {
    /** free 2명(400MB 임박 / 600MB 초과) + premium 1명(1GB) */
    const givenUsage = () => {
      mockPrismaService.diaryMedia.groupBy.mockResolvedValue([
        { userId: 'user-1', _sum: { fileSize: 400 * MB } },
        { userId: 'user-2', _sum: { fileSize: 600 * MB } },
        { userId: 'user-3', _sum: { fileSize: 1 * GB } },
      ]);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { subscriptionTier: SubscriptionTier.free, _count: { _all: 10 } },
        { subscriptionTier: SubscriptionTier.ad_free, _count: { _all: 5 } },
        { subscriptionTier: SubscriptionTier.premium, _count: { _all: 2 } },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', subscriptionTier: SubscriptionTier.free },
        { id: 'user-2', subscriptionTier: SubscriptionTier.free },
        { id: 'user-3', subscriptionTier: SubscriptionTier.premium },
      ]);
    };

    it('등급별 합계·중앙값·최대를 계산해야 함', async () => {
      givenUsage();

      const stats = await service.getStorageStats();
      const free = stats.tiers.find((t) => t.tier === SubscriptionTier.free);

      expect(free).toMatchObject({
        userCount: 10,
        usersWithMedia: 2,
        totalBytes: 400 * MB + 600 * MB,
        medianBytes: 500 * MB,
        maxBytes: 600 * MB,
        limitBytes: 500 * MB,
      });
    });

    it('한도 임박(80% 이상)과 초과를 나눠 세야 함', async () => {
      givenUsage();

      const stats = await service.getStorageStats();
      const free = stats.tiers.find((t) => t.tier === SubscriptionTier.free);

      expect(free.nearLimitCount).toBe(1); // 400MB = 한도 500MB의 80%
      expect(free.overLimitCount).toBe(1); // 600MB
    });

    it('미디어가 없는 등급도 0으로 채워 내려야 함', async () => {
      givenUsage();

      const stats = await service.getStorageStats();
      const adFree = stats.tiers.find(
        (t) => t.tier === SubscriptionTier.ad_free,
      );

      expect(adFree).toMatchObject({
        userCount: 5,
        usersWithMedia: 0,
        totalBytes: 0,
        medianBytes: 0,
        maxBytes: 0,
        nearLimitCount: 0,
        overLimitCount: 0,
      });
    });

    it('구간별 인원을 세야 함', async () => {
      givenUsage();

      const stats = await service.getStorageStats();
      const counts = Object.fromEntries(
        stats.buckets.map((b) => [b.label, b.userCount]),
      );

      expect(counts).toMatchObject({
        '~100MB': 0,
        '~500MB': 1, // 400MB
        '~2GB': 2, // 600MB, 1GB
        '40GB+': 0,
      });
    });

    it('전체 합계와 인원을 내려야 함', async () => {
      givenUsage();

      const stats = await service.getStorageStats();

      expect(stats.totalStoredBytes).toBe(400 * MB + 600 * MB + 1 * GB);
      expect(stats.usersWithMedia).toBe(3);
    });

    it('미디어가 하나도 없으면 빈 통계를 내려야 함', async () => {
      mockPrismaService.diaryMedia.groupBy.mockResolvedValue([]);
      mockPrismaService.user.groupBy.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const stats = await service.getStorageStats();

      expect(stats.totalStoredBytes).toBe(0);
      expect(stats.usersWithMedia).toBe(0);
      expect(stats.tiers).toHaveLength(3);
      expect(stats.buckets.every((b) => b.userCount === 0)).toBe(true);
    });
  });
});
