import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsDateString, IsOptional } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.premium })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({
    description: '구독 만료일 (ISO 8601)',
    example: '2026-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: '인앱 결제 토큰 (Apple receipt / Google purchase token)',
    example: 'AEuhp4...',
    required: false,
  })
  @IsOptional()
  @IsString()
  purchaseToken?: string;
}
