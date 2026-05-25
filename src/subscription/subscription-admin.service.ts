import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AdminUpdateSubscriptionDto,
  AdminUserQueryDto,
  AdminUserDto,
  AdminUserPageDto,
  UserDeleteStatus,
} from './dto/admin-subscription.dto';

@Injectable()
export class SubscriptionAdminService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      items: users.map((u) => this.toDto(u)),
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

    return this.toDto(user);
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

    return this.toDto(user);
  }

  private toDto(user: {
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
  }): AdminUserDto {
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
    };
  }
}
