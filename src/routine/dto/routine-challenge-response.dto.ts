import { ApiProperty } from '@nestjs/swagger';

export enum RoutineChallengeStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  ENDED = 'ENDED',
}

export class RoutineChallengeParticipantDto {
  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 이름' })
  userName: string;

  @ApiProperty({ description: '연결한 루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '연결한 루틴 제목' })
  routineTitle: string;

  @ApiProperty({ description: '연결한 루틴 이모지', nullable: true })
  routineEmoji: string | null;

  @ApiProperty({ description: '기간 내 체크 횟수' })
  checkedCount: number;

  @ApiProperty({ description: '목표 달성 여부' })
  achieved: boolean;
}

export class RoutineChallengeDto {
  @ApiProperty({ description: '챌린지 ID' })
  id: string;

  @ApiProperty({ description: '챌린지 제목' })
  title: string;

  @ApiProperty({ description: '챌린지 설명', nullable: true })
  description: string | null;

  @ApiProperty({ description: '시작일' })
  startDate: Date;

  @ApiProperty({ description: '종료일' })
  endDate: Date;

  @ApiProperty({ description: '기간 내 목표 체크 횟수' })
  targetCount: number;

  @ApiProperty({ description: '내기·벌칙 문구', nullable: true })
  reward: string | null;

  @ApiProperty({
    description: '상태 (서버가 startDate/endDate와 오늘 날짜로 계산)',
    enum: RoutineChallengeStatus,
  })
  status: RoutineChallengeStatus;

  @ApiProperty({ description: '참가자 수' })
  participantCount: number;

  @ApiProperty({ description: '내가 참가 중인지 여부' })
  joined: boolean;

  @ApiProperty({
    description: '내 기간 내 체크 횟수 (참가 중일 때만 값, 아니면 null)',
    nullable: true,
  })
  myCheckedCount: number | null;

  @ApiProperty({ description: '내 목표 달성 여부' })
  myAchieved: boolean;

  @ApiProperty({ description: '만든 사용자 ID' })
  createdBy: string;

  @ApiProperty({ description: '내가 만든 챌린지인지 여부' })
  isMine: boolean;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class RoutineChallengeDetailDto extends RoutineChallengeDto {
  @ApiProperty({
    description: '참가자별 진행률',
    type: [RoutineChallengeParticipantDto],
  })
  participants: RoutineChallengeParticipantDto[];
}
