import { Injectable } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionStatusDto } from './dto/subscription-response.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<SubscriptionStatusDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        inAppPurchaseToken: true,
      },
    });

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

  async updateSubscription(
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionStatusDto> {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: dto.tier,
        subscriptionExpiresAt: expiresAt,
        ...(dto.purchaseToken && { inAppPurchaseToken: dto.purchaseToken }),
      },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        inAppPurchaseToken: true,
      },
    });

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

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      isActive,
      isTrial:
        user.subscriptionTier === SubscriptionTier.ad_free &&
        !user.inAppPurchaseToken,
      daysLeft: this.calcDaysLeft(user.subscriptionExpiresAt),
    };
  }

  async applyStoreSubscription(params: {
    userId: string;
    tier: SubscriptionTier;
    expiresAt: Date | null;
    purchaseToken: string;
  }): Promise<void> {
    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        subscriptionTier: params.tier,
        subscriptionExpiresAt: params.expiresAt,
        inAppPurchaseToken: params.purchaseToken,
      },
    });
  }

  async expireSubscription(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: SubscriptionTier.free,
        subscriptionExpiresAt: null,
      },
    });
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
