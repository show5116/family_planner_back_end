import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/** 내 챌린지 목록에서 쓸 수 있는 상태 필터 (종료된 챌린지는 항상 제외) */
export enum MyChallengeStatusFilter {
  ONGOING = 'ONGOING',
  UPCOMING = 'UPCOMING',
}

export class MyChallengeQueryDto {
  @ApiProperty({
    description:
      '상태 필터. 생략 시 ONGOING + UPCOMING 모두 조회 (ENDED는 항상 제외)',
    enum: MyChallengeStatusFilter,
    required: false,
  })
  @IsOptional()
  @IsEnum(MyChallengeStatusFilter)
  status?: MyChallengeStatusFilter;
}
