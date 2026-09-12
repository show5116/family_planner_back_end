import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class GroupQuotaDto {
  @ApiProperty({ description: '현재 구독 등급', enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty({ description: '현재 속한 그룹 수', example: 1 })
  used: number;

  @ApiProperty({ description: '등급별 그룹 수 한도', example: 1 })
  limit: number;

  @ApiProperty({
    description: '더 만들거나 참여할 수 있는 그룹 수 (한도를 넘긴 상태면 0)',
    example: 0,
  })
  remaining: number;
}
