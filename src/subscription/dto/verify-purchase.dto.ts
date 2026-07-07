import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { SubscriptionPlatform } from '@prisma/client';

export class VerifyPurchaseDto {
  @ApiProperty({
    enum: SubscriptionPlatform,
    example: SubscriptionPlatform.ANDROID,
  })
  @IsEnum(SubscriptionPlatform)
  platform: SubscriptionPlatform;

  @ApiProperty({
    description: 'Google Play 구매 토큰 (platform=ANDROID일 때 필수)',
    required: false,
  })
  @IsOptional()
  @IsString()
  purchaseToken?: string;

  @ApiProperty({
    description: 'App Store signedTransaction (JWS, platform=IOS일 때 필수)',
    required: false,
  })
  @IsOptional()
  @IsString()
  signedTransaction?: string;
}
