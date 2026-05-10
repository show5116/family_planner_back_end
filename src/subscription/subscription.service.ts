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
      },
    });

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      isActive: this.checkActive(
        user.subscriptionTier,
        user.subscriptionExpiresAt,
      ),
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
      },
    });

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      isActive: this.checkActive(
        user.subscriptionTier,
        user.subscriptionExpiresAt,
      ),
    };
  }

  async restoreSubscription(userId: string): Promise<SubscriptionStatusDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionExpiresAt: true,
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
      return { tier: SubscriptionTier.free, expiresAt: null, isActive: false };
    }

    return {
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionExpiresAt,
      isActive,
    };
  }

  private checkActive(tier: SubscriptionTier, expiresAt: Date | null): boolean {
    if (tier === SubscriptionTier.free) return false;
    if (!expiresAt) return true;
    return expiresAt > new Date();
  }
}
