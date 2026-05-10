import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionTier } from '@prisma/client';

export class AdminUpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.premium })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({
    description: '구독 만료일 (ISO 8601). null이면 기간 무제한.',
    example: '2026-12-31T23:59:59.000Z',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class AdminUserQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({
    required: false,
    description: '이름 또는 이메일 검색',
    example: '홍길동',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    enum: SubscriptionTier,
    description: '구독 tier 필터',
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;
}

export class AdminUserDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.free })
  subscriptionTier: SubscriptionTier;

  @ApiProperty({ description: '구독 만료일', nullable: true })
  subscriptionExpiresAt: Date | null;

  @ApiProperty({ description: '구독 활성 여부', example: false })
  isSubscriptionActive: boolean;

  @ApiProperty({ description: '가입일' })
  createdAt: Date;

  @ApiProperty({ description: '마지막 로그인', nullable: true })
  lastLoginAt: Date | null;
}

export class AdminUserPageDto {
  @ApiProperty({ type: [AdminUserDto] })
  items: AdminUserDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
