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

export enum UserDeleteStatus {
  ALL = 'all',
  ACTIVE = 'active',
  PENDING_DELETE = 'pending_delete',
}

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

  @ApiProperty({
    required: false,
    enum: UserDeleteStatus,
    description:
      '삭제 상태 필터 (all: 전체, active: 정상, pending_delete: 삭제 유예 중)',
    default: UserDeleteStatus.ALL,
  })
  @IsOptional()
  @IsEnum(UserDeleteStatus)
  deleteStatus?: UserDeleteStatus = UserDeleteStatus.ALL;
}

export class AdminUserDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ description: '운영자 여부', example: false })
  isAdmin: boolean;

  @ApiProperty({ description: '소셜 로그인 제공자', example: 'LOCAL' })
  provider: string;

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

  @ApiProperty({
    description: '삭제 예약 일시 (null이면 정상 계정)',
    nullable: true,
    example: '2024-01-08T00:00:00.000Z',
  })
  deletedAt: Date | null;
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
