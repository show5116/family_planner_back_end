import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionPlatform } from '@prisma/client';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionService } from './subscription.service';
import {
  ANDROID_SUBSCRIPTION_VERIFIER,
  IOS_SUBSCRIPTION_VERIFIER,
  SubscriptionVerifier,
} from './verifiers/subscription-verifier.interface';

/**
 * 웹훅 유실에 대비한 안전망. 매일 새벽 만료 임박/만료된 활성 구독을 재검증한다.
 */
@Injectable()
export class SubscriptionReconcileScheduler {
  private readonly logger = new Logger(SubscriptionReconcileScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(ANDROID_SUBSCRIPTION_VERIFIER)
    private readonly androidVerifier: SubscriptionVerifier,
    @Inject(IOS_SUBSCRIPTION_VERIFIER)
    private readonly iosVerifier: SubscriptionVerifier,
  ) {}

  @Cron('0 3 * * *')
  async reconcileExpiringSubscriptions() {
    if (!isSchedulerEnabled('')) return;

    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const targets = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'grace_period'] },
        OR: [{ expiresAt: null }, { expiresAt: { lte: threshold } }],
      },
      select: {
        userId: true,
        platform: true,
        originalTransactionId: true,
      },
    });

    if (targets.length === 0) return;

    this.logger.log(`구독 재검증 대상 ${targets.length}건`);

    for (const target of targets) {
      const verifier =
        target.platform === SubscriptionPlatform.ANDROID
          ? this.androidVerifier
          : this.iosVerifier;

      try {
        const verified = await verifier.verify(target.originalTransactionId);
        await this.subscriptionService.applyVerifiedPurchase(
          target.userId,
          verified,
          { eventType: 'RECONCILE', rawPayload: {} },
        );
      } catch (error) {
        this.logger.warn(
          `구독 재검증 실패 (userId=${target.userId}): ${error.message}`,
        );
      }
    }
  }
}
