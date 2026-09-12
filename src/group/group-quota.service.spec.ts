import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { GroupQuotaService } from './group-quota.service';
import { GroupQuotaExceededException } from './group-quota-exceeded.exception';

describe('GroupQuotaService', () => {
  let service: GroupQuotaService;

  const LIMITS: Record<string, number> = { free: 1, ad_free: 1, premium: 5 };

  const mockPrismaService = {
    groupMember: { count: jest.fn() },
  };

  const mockConfigService = {
    get: jest.fn((): Record<string, number> => LIMITS),
  };

  const mockSubscriptionService = {
    getStatus: jest.fn(),
  };

  /** tier와 현재 소속 그룹 수를 세팅한다 */
  const given = (tier: SubscriptionTier, used: number) => {
    mockSubscriptionService.getStatus.mockResolvedValue({ tier });
    mockPrismaService.groupMember.count.mockResolvedValue(used);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupQuotaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get<GroupQuotaService>(GroupQuotaService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(LIMITS);
  });

  describe('getLimit', () => {
    it('등급별 한도를 설정에서 읽어야 함', () => {
      expect(service.getLimit(SubscriptionTier.free)).toBe(1);
      expect(service.getLimit(SubscriptionTier.ad_free)).toBe(1);
      expect(service.getLimit(SubscriptionTier.premium)).toBe(5);
    });

    it('설정에 없는 등급은 free로 폴백해야 함', () => {
      mockConfigService.get.mockReturnValue({ free: 1 });
      expect(service.getLimit(SubscriptionTier.premium)).toBe(1);
    });
  });

  describe('getQuota', () => {
    it('사용량과 잔여를 계산해야 함', async () => {
      given(SubscriptionTier.premium, 2);

      await expect(service.getQuota('user-1')).resolves.toEqual({
        tier: SubscriptionTier.premium,
        used: 2,
        limit: 5,
        remaining: 3,
      });
    });

    it('한도를 이미 넘긴 사용자의 remaining은 음수가 아니라 0이어야 함', async () => {
      given(SubscriptionTier.free, 3);

      await expect(service.getQuota('user-1')).resolves.toMatchObject({
        used: 3,
        limit: 1,
        remaining: 0,
      });
    });

    it('만든 그룹이 아니라 소속 그룹 수로 집계해야 함', async () => {
      given(SubscriptionTier.free, 0);
      await service.getQuota('user-1');

      expect(mockPrismaService.groupMember.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('assertCanJoin', () => {
    it('한도에 여유가 있으면 통과해야 함', async () => {
      given(SubscriptionTier.free, 0);
      await expect(service.assertCanJoin('user-1')).resolves.toBeUndefined();
    });

    it('한도에 도달하면 402를 던져야 함', async () => {
      given(SubscriptionTier.free, 1);

      await expect(service.assertCanJoin('user-1')).rejects.toThrow(
        GroupQuotaExceededException,
      );
    });

    it('402에 현재 한도를 실어 보내야 함 (프론트 안내용)', async () => {
      given(SubscriptionTier.free, 1);

      await expect(service.assertCanJoin('user-1')).rejects.toMatchObject({
        response: {
          message: 'group.errors.group_limit_exceeded',
          groupQuota: { tier: SubscriptionTier.free, used: 1, limit: 1 },
        },
      });
    });

    it('이미 한도를 넘긴 사용자도 신규 합류만 막아야 함 (기존 소속은 건드리지 않음)', async () => {
      given(SubscriptionTier.free, 3);

      // 서비스는 예외만 던진다 — 어떤 소속도 제거하지 않는다
      await expect(service.assertCanJoin('user-1')).rejects.toThrow(
        GroupQuotaExceededException,
      );
    });

    it('만료된 구독은 free 한도로 판정해야 함', async () => {
      // getStatus가 만료를 free로 내려주므로 그 값을 그대로 신뢰한다
      given(SubscriptionTier.free, 1);
      await expect(service.assertCanJoin('user-1')).rejects.toThrow(
        GroupQuotaExceededException,
      );
      expect(mockSubscriptionService.getStatus).toHaveBeenCalledWith('user-1');
    });
  });

  describe('assertMemberCanJoin', () => {
    it('호출자가 아니라 상대방 기준 메시지를 써야 함', async () => {
      given(SubscriptionTier.free, 1);

      await expect(
        service.assertMemberCanJoin('applicant-1'),
      ).rejects.toMatchObject({
        response: { message: 'group.errors.member_group_limit_exceeded' },
      });
    });

    it('상대방에게 여유가 있으면 통과해야 함', async () => {
      given(SubscriptionTier.premium, 4);
      await expect(
        service.assertMemberCanJoin('applicant-1'),
      ).resolves.toBeUndefined();
    });
  });
});
