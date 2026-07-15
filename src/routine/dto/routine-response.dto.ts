import { ApiProperty } from '@nestjs/swagger';
import { RoutineFrequencyType } from '@/routine/enums';
import { UserRoutineBadgeDto } from './routine-badge-response.dto';

export class RoutineDto {
  @ApiProperty({ description: '루틴 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '루틴 제목', example: '아침 스트레칭' })
  title: string;

  @ApiProperty({ description: '이모지', nullable: true })
  emoji: string | null;

  @ApiProperty({ description: '색상', nullable: true })
  color: string | null;

  @ApiProperty({ description: '반복 타입', enum: RoutineFrequencyType })
  frequencyType: RoutineFrequencyType;

  @ApiProperty({ description: '주 목표 횟수', nullable: true })
  targetCount: number | null;

  @ApiProperty({ description: '시작일' })
  startDate: Date;

  @ApiProperty({ description: '종료일', nullable: true })
  endDate: Date | null;

  @ApiProperty({ description: '활성 여부' })
  isActive: boolean;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder: number;

  @ApiProperty({ description: '오늘 체크 여부' })
  checkedToday: boolean;

  @ApiProperty({ description: '소속 루틴 그룹 ID', nullable: true })
  routineGroupId: string | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class RoutineLogDto {
  @ApiProperty({ description: '로그 ID' })
  id: string;

  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '체크한 날짜' })
  checkedDate: Date;

  @ApiProperty({ description: '메모', nullable: true })
  note: string | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({
    description: '이번 체크로 새로 획득한 배지 목록',
    type: [UserRoutineBadgeDto],
  })
  newlyEarnedBadges: UserRoutineBadgeDto[];
}

export class RoutineShareDto {
  @ApiProperty({ description: '공유 ID' })
  id: string;

  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '그룹 ID' })
  groupId: string;

  @ApiProperty({ description: '그룹 이름' })
  groupName: string;

  @ApiProperty({ description: '공유 생성일' })
  createdAt: Date;
}

export class RoutineMemberSummaryDto {
  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 이름' })
  userName: string;

  @ApiProperty({ description: '공유된 루틴 목록', type: [RoutineDto] })
  routines: RoutineDto[];
}
