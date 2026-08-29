import { ApiProperty } from '@nestjs/swagger';
import { BadgeCriteriaType } from '@/routine/enums';

export class RoutineBadgeDto {
  @ApiProperty({ description: '배지 ID' })
  id: string;

  @ApiProperty({ description: '배지 코드', example: 'GOAL_STREAK_7' })
  code: string;

  @ApiProperty({ description: '배지 제목', example: '7일 연속 달성' })
  title: string;

  @ApiProperty({ description: '배지 설명', nullable: true })
  description: string | null;

  @ApiProperty({ description: '아이콘 이모지', nullable: true })
  iconEmoji: string | null;

  @ApiProperty({ description: '판정 기준 타입', enum: BadgeCriteriaType })
  criteriaType: BadgeCriteriaType;

  @ApiProperty({ description: '판정 기준값', example: 7 })
  criteriaValue: number;
}

export class UserRoutineBadgeDto {
  @ApiProperty({ description: '획득 기록 ID' })
  id: string;

  @ApiProperty({ description: '배지 ID' })
  badgeId: string;

  @ApiProperty({ description: '배지 정보', type: RoutineBadgeDto })
  badge: RoutineBadgeDto;

  @ApiProperty({ description: '획득 일시' })
  earnedAt: Date;
}
