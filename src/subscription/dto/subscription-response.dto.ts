import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class SubscriptionStatusDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.free })
  tier: SubscriptionTier;

  @ApiProperty({ description: '구독 만료일', nullable: true, example: null })
  expiresAt: Date | null;

  @ApiProperty({ description: '구독 활성 여부', example: false })
  isActive: boolean;
}
