import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class SubscriptionStatusDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.free })
  tier: SubscriptionTier;

  @ApiProperty({ description: '구독 만료일', nullable: true, example: null })
  expiresAt: Date | null;

  @ApiProperty({ description: '구독 활성 여부', example: false })
  isActive: boolean;

  @ApiProperty({
    description: '무료 체험 여부 (결제 없이 부여된 ad_free)',
    example: true,
  })
  isTrial: boolean;

  @ApiProperty({
    description: '구독 남은 일수 (만료됐거나 무료이면 0)',
    example: 14,
  })
  daysLeft: number;
}
