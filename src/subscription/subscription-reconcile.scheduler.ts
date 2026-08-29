import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionPlatform, SubscriptionStatus } from '@prisma/client';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionService } from './subscription.service';
import {
  ANDROID_SUBSCRIPTION_VERIFIER,
  IOS_SUBSCRIPTION_VERIFIER,
  SubscriptionVerifier,
} from './verifiers/subscription-verifier.interface';

/** 상태 변화를 놓치면 안 되는 구독 (유예·보류는 결제 재성공 시 복구되어야 한다) */
const RECONCILE_TARGET_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.active,
  SubscriptionStatus.grace_period,
  SubscriptionStatus.canceled,
  SubscriptionStatus.on_hold,
  SubscriptionStatus.paused,
];

/**
 * 웹훅 유실에 대비한 안전망. 매일 새벽 만료 임박·만료된 구독을 스토어에서 재검증한다.
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
    if (!isSchedulerEnabled('subscription')) return;

    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const targets = await this.prisma.subscription.findMany({
      where: {
        status: { in: RECONCILE_TARGET_STATUSES },
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

    let failed = 0;

    for (const target of targets) {
      const verifier =
        target.platform === SubscriptionPlatform.ANDROID
          ? this.androidVerifier
          : this.iosVerifier;

      try {
        const verified = await verifier.verifyByOriginalTransactionId(
          target.originalTransactionId,
        );
        await this.subscriptionService.applyVerifiedPurchase(
          target.userId,
          verified,
          { eventType: 'RECONCILE', rawPayload: {} },
        );
      } catch (error) {
        failed++;
        this.logger.warn(
          `구독 재검증 실패 (userId=${target.userId}): ${error.message}`,
        );
      }
    }

    this.logger.log(
      `구독 재검증 완료 (성공 ${targets.length - failed}건, 실패 ${failed}건)`,
    );
  }
}
