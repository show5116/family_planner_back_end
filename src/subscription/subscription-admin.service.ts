import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AdminUpdateSubscriptionDto,
  AdminUserQueryDto,
  AdminUserDto,
  AdminUserPageDto,
} from './dto/admin-subscription.dto';

@Injectable()
export class SubscriptionAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(query: AdminUserQueryDto): Promise<AdminUserPageDto> {
    const { page = 1, limit = 20, search, tier } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(tier && { subscriptionTier: tier }),
      ...(search && {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }),
    };

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
          subscriptionTier: true,
          subscriptionExpiresAt: true,
          createdAt: true,
          lastLoginAt: true,
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
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

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

    if (!exists) throw new NotFoundException('사용자를 찾을 수 없습니다.');

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
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return this.toDto(user);
  }

  private toDto(user: {
    id: string;
    name: string;
    email: string | null;
    subscriptionTier: SubscriptionTier;
    subscriptionExpiresAt: Date | null;
    createdAt: Date;
    lastLoginAt: Date | null;
  }): AdminUserDto {
    const isActive =
      user.subscriptionTier !== SubscriptionTier.free &&
      (user.subscriptionExpiresAt === null ||
        user.subscriptionExpiresAt > new Date());

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isSubscriptionActive: isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
