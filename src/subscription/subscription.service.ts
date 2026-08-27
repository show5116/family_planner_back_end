import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { VerifyPurchaseDto } from './dto/verify-purchase.dto';
import { SubscriptionStatusDto } from './dto/subscription-response.dto';
import { PurchaseVerificationFailedException } from './verifiers/verification-error';
import {
  ANDROID_SUBSCRIPTION_VERIFIER,
  IOS_SUBSCRIPTION_VERIFIER,
  SubscriptionVerifier,
  VerifiedPurchase,
} from './verifiers/subscription-verifier.interface';

/** 혜택(tier)을 유지하는 상태. 취소는 만료일까지 유지된다. */
const ENTITLED_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.active,
  SubscriptionStatus.grace_period,
  SubscriptionStatus.canceled,
]);

/** subscription_events.eventType 컬럼 길이 */
const EVENT_TYPE_MAX_LENGTH = 50;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ANDROID_SUBSCRIPTION_VERIFIER)
    private readonly androidVerifier: SubscriptionVerifier,
    @Inject(IOS_SUBSCRIPTION_VERIFIER)
    private readonly iosVerifier: SubscriptionVerifier,
  ) {}

  /**
   * 구독 상태 조회
   */
  async getStatus(userId: string): Promise<SubscriptionStatusDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        inAppPurchaseToken: true,
      },
    });

    return this.toStatusDto(user);
  }

  /**
   * 인앱 구매 검증 후 구독 반영
   */
  async verifyPurchase(
    userId: string,
    dto: VerifyPurchaseDto,
  ): Promise<SubscriptionStatusDto> {
    const isAndroid = dto.platform === SubscriptionPlatform.ANDROID;
    const token = isAndroid ? dto.purchaseToken : dto.signedTransaction;

    if (!token) {
      throw new BadRequestException(
        'subscription.errors.missing_purchase_token',
      );
    }

    const verified = await this.getVerifier(dto.platform).verify(token);

    // 다른 계정이 이미 사용한 영수증이면 혜택을 옮겨주지 않는다
    const ownerId = await this.findUserIdByOriginalTransactionId(
      verified.originalTransactionId,
    );
    if (ownerId && ownerId !== userId) {
      this.logger.warn(
        `이미 사용된 영수증 (userId=${userId}, ownerId=${ownerId})`,
      );
      throw new PurchaseVerificationFailedException(
        'subscription.errors.already_used',
      );
    }

    await this.applyVerifiedPurchase(userId, verified, {
      eventType: 'VERIFY_PURCHASE',
      rawPayload: { platform: dto.platform },
    });

    return this.getStatus(userId);
  }

  /**
   * 구독 복원 (스토어 최신 상태로 재검증, 실패 시 로컬 만료 기준 처리)
   */
  async restoreSubscription(userId: string): Promise<SubscriptionStatusDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { platform: true, originalTransactionId: true },
    });

    if (subscription) {
      try {
        const verified = await this.getVerifier(
          subscription.platform,
        ).verifyByOriginalTransactionId(subscription.originalTransactionId);

        await this.applyVerifiedPurchase(userId, verified, {
          eventType: 'RESTORE',
          rawPayload: { platform: subscription.platform },
        });

        return this.getStatus(userId);
      } catch (error) {
        // 스토어 조회 실패로 구독을 잃지 않도록 로컬 상태로 응답한다
        this.logger.warn(
          `구독 복원 중 스토어 재검증 실패 (userId=${userId}): ${error.message}`,
        );
      }
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        inAppPurchaseToken: true,
      },
    });

    const isActive = this.checkActive(
      user.subscriptionTier,
      user.subscriptionExpiresAt,
    );

    if (!isActive && user.subscriptionTier !== SubscriptionTier.free) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: SubscriptionTier.free,
          subscriptionExpiresAt: null,
        },
      });
    }

    return this.toStatusDto(user);
  }

  /**
   * 웹훅·재검증 스케줄러에서 호출. 검증된 구매 정보를 Subscription/User에 반영한다.
   * 이벤트 발생 시각(occurredAt)이 마지막 반영 시각보다 과거이면 무시한다 (웹훅 순서 역전 방지).
   */
  async applyVerifiedPurchase(
    userId: string,
    verified: VerifiedPurchase,
    event: { eventType: string; rawPayload: unknown; occurredAt?: Date },
  ): Promise<void> {
    const occurredAt = event.occurredAt ?? new Date();
    const isEntitled = ENTITLED_STATUSES.has(verified.status);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { userId },
        select: { lastVerifiedAt: true },
      });

      if (existing?.lastVerifiedAt && existing.lastVerifiedAt > occurredAt) {
        this.logger.log(
          `이전 시점의 구독 이벤트 무시 (userId=${userId}, eventType=${event.eventType})`,
        );
        return;
      }

      const subscriptionData = {
        platform: verified.platform,
        productId: verified.productId,
        originalTransactionId: verified.originalTransactionId,
        latestTransactionId: verified.latestTransactionId,
        tier: verified.tier,
        status: verified.status,
        expiresAt: verified.expiresAt,
        autoRenewing: verified.autoRenewing,
        lastVerifiedAt: occurredAt,
      };

      await tx.subscription.upsert({
        where: { userId },
        create: { userId, ...subscriptionData },
        update: subscriptionData,
      });

      await tx.subscriptionEvent.create({
        data: {
          userId,
          platform: verified.platform,
          eventType: event.eventType.slice(0, EVENT_TYPE_MAX_LENGTH),
          originalTransactionId: verified.originalTransactionId,
          rawPayload: event.rawPayload as any,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: isEntitled ? verified.tier : SubscriptionTier.free,
          subscriptionExpiresAt: isEntitled ? verified.expiresAt : null,
          inAppPurchaseToken: verified.originalTransactionId,
        },
      });
    });

    this.logger.log(
      `구독 반영 완료 (userId=${userId}, eventType=${event.eventType}, status=${verified.status}, tier=${isEntitled ? verified.tier : SubscriptionTier.free})`,
    );
  }

  /**
   * 스토어 거래 ID로 구독 소유자 조회
   */
  async findUserIdByOriginalTransactionId(
    originalTransactionId: string,
  ): Promise<string | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { originalTransactionId },
      select: { userId: true },
    });
    return subscription?.userId ?? null;
  }

  /**
   * 구독 즉시 회수 (환불·만료 확정 시)
   */
  async expireSubscription(
    userId: string,
    status: SubscriptionStatus = SubscriptionStatus.expired,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.subscription.updateMany({
        where: { userId },
        data: { status },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: SubscriptionTier.free,
          subscriptionExpiresAt: null,
        },
      }),
    ]);

    this.logger.log(`구독 회수 완료 (userId=${userId}, status=${status})`);
  }

  private getVerifier(platform: SubscriptionPlatform): SubscriptionVerifier {
    return platform === SubscriptionPlatform.ANDROID
      ? this.androidVerifier
      : this.iosVerifier;
  }

  /**
   * 만료된 구독은 free로 응답한다 (프론트가 tier를 그대로 신뢰하도록)
   */
  private toStatusDto(user: {
    subscriptionTier: SubscriptionTier;
    subscriptionExpiresAt: Date | null;
    inAppPurchaseToken: string | null;
  }): SubscriptionStatusDto {
    const isActive = this.checkActive(
      user.subscriptionTier,
      user.subscriptionExpiresAt,
    );

    if (!isActive) {
      return {
        tier: SubscriptionTier.free,
        expiresAt: null,
        isActive: false,
        isTrial: false,
        daysLeft: 0,
      };
    }

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      isActive: true,
      isTrial:
        user.subscriptionTier === SubscriptionTier.ad_free &&
        !user.inAppPurchaseToken,
      daysLeft: this.calcDaysLeft(user.subscriptionExpiresAt),
    };
  }

  private checkActive(tier: SubscriptionTier, expiresAt: Date | null): boolean {
    if (tier === SubscriptionTier.free) return false;
    if (!expiresAt) return true;
    return expiresAt > new Date();
  }

  private calcDaysLeft(expiresAt: Date | null): number {
    if (!expiresAt) return 0;
    const diff = expiresAt.getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }
}
