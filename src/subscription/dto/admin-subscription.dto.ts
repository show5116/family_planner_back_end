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
    description:
      '구독 만료일 (ISO 8601). null이면 기간 무제한. 과거 날짜도 허용된다 (만료 상태 데모 계정용).',
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

  @ApiProperty({
    description:
      '다이어리 미디어 저장 사용량 (bytes). R2에 실제 올라간 것만 세므로 앱의 한도 게이지보다 작을 수 있다',
    example: 1073741824,
  })
  storageUsedBytes: number;
}

export class AdminTierStorageDto {
  @ApiProperty({ enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty({ description: '해당 등급 전체 사용자 수', example: 1200 })
  userCount: number;

  @ApiProperty({
    description: '미디어를 1건이라도 올린 사용자 수',
    example: 340,
  })
  usersWithMedia: number;

  @ApiProperty({
    description: '등급 합계 저장량 (bytes)',
    example: 53687091200,
  })
  totalBytes: number;

  @ApiProperty({
    description: '미디어가 있는 사용자 기준 중앙값 (bytes)',
    example: 314572800,
  })
  medianBytes: number;

  @ApiProperty({
    description: '최대 사용자의 저장량 (bytes)',
    example: 39728447488,
  })
  maxBytes: number;

  @ApiProperty({ description: '등급 누적 한도 (bytes)', example: 42949672960 })
  limitBytes: number;

  @ApiProperty({
    description: '한도의 80% 이상 100% 미만 사용자 수 (상위 등급 수요 신호)',
    example: 12,
  })
  nearLimitCount: number;

  @ApiProperty({ description: '한도를 이미 넘긴 사용자 수', example: 3 })
  overLimitCount: number;
}

export class AdminStorageBucketDto {
  @ApiProperty({ description: '구간 이름', example: '~500MB' })
  label: string;

  @ApiProperty({
    description: '구간 상한 (bytes). null이면 상한 없음',
    nullable: true,
    example: 524288000,
  })
  maxBytes: number | null;

  @ApiProperty({ description: '구간에 속한 사용자 수', example: 87 })
  userCount: number;
}

export class AdminStorageStatsDto {
  @ApiProperty({ description: '전체 저장량 합 (bytes)', example: 128849018880 })
  totalStoredBytes: number;

  @ApiProperty({
    description: '미디어를 1건이라도 올린 전체 사용자 수',
    example: 412,
  })
  usersWithMedia: number;

  @ApiProperty({ type: [AdminTierStorageDto], description: '등급별 요약' })
  tiers: AdminTierStorageDto[];

  @ApiProperty({
    type: [AdminStorageBucketDto],
    description: '저장량 구간별 사용자 분포 (미디어가 있는 사용자만)',
  })
  buckets: AdminStorageBucketDto[];
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
