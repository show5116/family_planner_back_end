import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { GroupQuotaDto } from '@/group/dto/group-quota-response.dto';
import { GroupQuotaExceededException } from '@/group/group-quota-exceeded.exception';

/** 한도 초과가 요청자 본인일 때 */
const SELF_LIMIT_KEY = 'group.errors.group_limit_exceeded';
/** 한도 초과가 요청자가 아니라 상대방일 때 (가입 요청 승인) */
const MEMBER_LIMIT_KEY = 'group.errors.member_group_limit_exceeded';

@Injectable()
export class GroupQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly subscription: SubscriptionService,
  ) {}

  /** 등급별 한도 (환경변수 오버라이드 가능한 서버 설정에서 읽는다) */
  getLimit(tier: SubscriptionTier): number {
    const limits = this.config.get<Record<string, number>>(
      'groupQuota.maxGroups',
    );
    return limits[tier] ?? limits[SubscriptionTier.free];
  }

  getAllLimits(): Record<string, number> {
    return this.config.get<Record<string, number>>('groupQuota.maxGroups');
  }

  /** 만료된 구독은 free로 취급된다 (구독 상태 판정을 한 곳에서만 하도록 재사용) */
  private async resolveTier(userId: string): Promise<SubscriptionTier> {
    const status = await this.subscription.getStatus(userId);
    return status.tier;
  }

  /**
   * 그룹 수 한도 상태
   *
   * 집계 기준은 "소속 그룹 수"(GroupMember)다. 만든 그룹만 세면 초대로 들어간 그룹이 빠져
   * 한도를 우회할 수 있다.
   */
  async getQuota(userId: string): Promise<GroupQuotaDto> {
    const tier = await this.resolveTier(userId);
    const limit = this.getLimit(tier);
    const used = await this.prisma.groupMember.count({ where: { userId } });

    return { tier, used, limit, remaining: Math.max(0, limit - used) };
  }

  /**
   * 그룹 합류(생성·참여·승인) 직전 한도 검사
   *
   * ★ 기존 소속은 절대 건드리지 않는다. 한도를 내리거나 구독이 만료돼도 이미 속한 그룹에서
   *   빼지 않고 **신규 합류만** 막는다. 그룹은 공유 자산이라 한 명을 빼면 다른 구성원의
   *   데이터까지 함께 잃는다. 다이어리 미디어의 다운그레이드 정책과 같은 원칙이다.
   *   (`used >= limit` 비교라 이미 초과한 사용자는 자연스럽게 신규만 차단된다.)
   *
   * ⚠️ 완전한 직렬화는 아니다. 동시 요청 둘이 각각 검사를 통과해 한도+1이 될 수 있다.
   *   트랜잭션 안으로 옮겨도 MySQL의 REPEATABLE READ에서는 다른 트랜잭션의 삽입이 보이지 않아
   *   결과가 같고, 개수 제한은 유니크 제약으로 막을 수도 없다. 용량 한도와 달리 초과해도
   *   돈이 나가지 않고 최악이 1→2이므로 Redis 락까지 걸지 않는다. 이 비대칭은 의도적이다.
   */
  async assertCanJoin(userId: string): Promise<void> {
    await this.assert(userId, SELF_LIMIT_KEY);
  }

  /**
   * 남을 그룹에 넣기 직전 한도 검사 (가입 요청 승인)
   *
   * 호출자는 그룹 관리자인데 한도 주인은 신청자다. 같은 메시지를 주면 관리자가 "내가 왜?"가
   * 되므로 상대방 기준 메시지로 구분한다. 애초에 신청 시점에서 막으므로 여기까지 오는 경우는
   * "신청한 뒤 다른 그룹에 들어간" 드문 상황이다.
   */
  async assertMemberCanJoin(userId: string): Promise<void> {
    await this.assert(userId, MEMBER_LIMIT_KEY);
  }

  private async assert(userId: string, messageKey: string): Promise<void> {
    const quota = await this.getQuota(userId);

    if (quota.used >= quota.limit) {
      throw new GroupQuotaExceededException(messageKey, quota);
    }
  }
}
