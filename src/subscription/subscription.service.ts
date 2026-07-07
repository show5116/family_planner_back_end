import {
  BadRequestException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  SubscriptionPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { VerifyPurchaseDto } from './dto/verify-purchase.dto';
import { SubscriptionStatusDto } from './dto/subscription-response.dto';
import {
  ANDROID_SUBSCRIPTION_VERIFIER,
  IOS_SUBSCRIPTION_VERIFIER,
  SubscriptionVerifier,
  VerifiedPurchase,
} from './verifiers/subscription-verifier.interface';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ANDROID_SUBSCRIPTION_VERIFIER)
    private readonly androidVerifier: SubscriptionVerifier,
    @Inject(IOS_SUBSCRIPTION_VERIFIER)
    private readonly iosVerifier: SubscriptionVerifier,
  ) {}

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

  async verifyPurchase(
    userId: string,
    dto: VerifyPurchaseDto,
  ): Promise<SubscriptionStatusDto> {
    const verifier =
      dto.platform === SubscriptionPlatform.ANDROID
        ? this.androidVerifier
        : this.iosVerifier;
    const token =
      dto.platform === SubscriptionPlatform.ANDROID
        ? dto.purchaseToken
        : dto.signedTransaction;

    if (!token) {
      throw new BadRequestException(
        'subscription.errors.missing_purchase_token',
      );
    }

    const verified = await verifier.verify(token);

    await this.applyVerifiedPurchase(userId, verified, {
      eventType: 'VERIFY_PURCHASE',
      rawPayload: { platform: dto.platform },
    });

    return this.getStatus(userId);
  }

  async restoreSubscription(userId: string): Promise<SubscriptionStatusDto> {
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
        data: { subscriptionTier: SubscriptionTier.free },
      });
      return {
        tier: SubscriptionTier.free,
        expiresAt: null,
        isActive: false,
        isTrial: false,
        daysLeft: 0,
      };
    }

    return this.toStatusDto(user);
  }

  /**
   * 웹훅/재검증 스케줄러에서 호출. 검증된 구매 정보를 Subscription/User에 반영한다.
   * 이벤트 발생 시각(occurredAt)이 마지막 반영 시각보다 과거이면 무시한다 (웹훅 순서 역전 방지).
   */
  async applyVerifiedPurchase(
    userId: string,
    verified: VerifiedPurchase,
    event: { eventType: string; rawPayload: unknown; occurredAt?: Date },
  ): Promise<void> {
    const occurredAt = event.occurredAt ?? new Date();

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({
        where: { userId },
        select: { lastVerifiedAt: true },
      });

      if (existing?.lastVerifiedAt && existing.lastVerifiedAt > occurredAt) {
        return;
      }

      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          platform: verified.platform,
          productId: verified.productId,
          originalTransactionId: verified.originalTransactionId,
          latestTransactionId: verified.latestTransactionId,
          tier: verified.tier,
          status: verified.status,
          expiresAt: verified.expiresAt,
          autoRenewing: verified.autoRenewing,
          lastVerifiedAt: occurredAt,
        },
        update: {
          platform: verified.platform,
          productId: verified.productId,
          originalTransactionId: verified.originalTransactionId,
          latestTransactionId: verified.latestTransactionId,
          tier: verified.tier,
          status: verified.status,
          expiresAt: verified.expiresAt,
          autoRenewing: verified.autoRenewing,
          lastVerifiedAt: occurredAt,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          userId,
          platform: verified.platform,
          eventType: event.eventType,
          originalTransactionId: verified.originalTransactionId,
          rawPayload: event.rawPayload as any,
        },
      });

      const isEntitled =
        verified.status === SubscriptionStatus.active ||
        verified.status === SubscriptionStatus.grace_period ||
        verified.status === SubscriptionStatus.canceled;

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: isEntitled ? verified.tier : SubscriptionTier.free,
          subscriptionExpiresAt: verified.expiresAt,
          inAppPurchaseToken: verified.originalTransactionId,
        },
      });
    });
  }

  async findUserIdByOriginalTransactionId(
    originalTransactionId: string,
  ): Promise<string | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { originalTransactionId },
      select: { userId: true },
    });
    return subscription?.userId ?? null;
  }

  async expireSubscription(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.subscription.updateMany({
        where: { userId },
        data: { status: SubscriptionStatus.expired },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: SubscriptionTier.free,
          subscriptionExpiresAt: null,
        },
      }),
    ]);
  }

  private toStatusDto(user: {
    subscriptionTier: SubscriptionTier;
    subscriptionExpiresAt: Date | null;
    inAppPurchaseToken: string | null;
  }): SubscriptionStatusDto {
    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      isActive: this.checkActive(
        user.subscriptionTier,
        user.subscriptionExpiresAt,
      ),
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
