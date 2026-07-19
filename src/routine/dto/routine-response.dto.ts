import { ApiProperty } from '@nestjs/swagger';
import {
  RoutineFrequencyType,
  RoutineWeeklyMode,
  RoutineImportance,
  RoutineTimeFilter,
  RoutineRecordType,
  RoutineStatus,
} from '@/routine/enums';
import { UserRoutineBadgeDto } from './routine-badge-response.dto';

export class RoutineCheckedLogDto {
  @ApiProperty({ description: '메모', nullable: true })
  note: string | null;

  @ApiProperty({ description: '텍스트 기록 값', nullable: true })
  textValue: string | null;

  @ApiProperty({ description: '수치 기록 값', nullable: true })
  numericValue: number | null;

  @ApiProperty({ description: '시각 기록 값 (HH:mm)', nullable: true })
  timeValue: string | null;
}

export class RoutineDto {
  @ApiProperty({ description: '루틴 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '루틴 제목', example: '아침 스트레칭' })
  title: string;

  @ApiProperty({ description: '이모지', nullable: true })
  emoji: string | null;

  @ApiProperty({ description: '색상', nullable: true })
  color: string | null;

  @ApiProperty({ description: '루틴 메모', nullable: true })
  memo: string | null;

  @ApiProperty({ description: '중요도', enum: RoutineImportance })
  importance: RoutineImportance;

  @ApiProperty({
    description: '시간대 분류',
    enum: RoutineTimeFilter,
    nullable: true,
  })
  timeFilter: RoutineTimeFilter | null;

  @ApiProperty({ description: '소속 루틴 카테고리 ID 목록', type: [String] })
  categoryIds: string[];

  @ApiProperty({ description: '기록 방식', enum: RoutineRecordType })
  recordType: RoutineRecordType;

  @ApiProperty({ description: '상태', enum: RoutineStatus })
  status: RoutineStatus;

  @ApiProperty({ description: '반복 타입', enum: RoutineFrequencyType })
  frequencyType: RoutineFrequencyType;

  @ApiProperty({
    description: '주 반복 세부 방식',
    enum: RoutineWeeklyMode,
    nullable: true,
  })
  weeklyMode: RoutineWeeklyMode | null;

  @ApiProperty({ description: '목표 횟수 (주/월)', nullable: true })
  targetCount: number | null;

  @ApiProperty({
    description: '반복 요일 목록 (0=일요일~6=토요일, FIXED_DAYS만 사용)',
    type: [Number],
    nullable: true,
  })
  targetDays: number[] | null;

  @ApiProperty({ description: '시작일' })
  startDate: Date;

  @ApiProperty({ description: '종료일', nullable: true })
  endDate: Date | null;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder: number;

  @ApiProperty({
    description: '조회 기준 날짜(쿼리 date, 미지정 시 오늘) 체크 여부',
  })
  checkedToday: boolean;

  @ApiProperty({
    description:
      '조회 기준 날짜의 실제 기록값 (체크 안 했으면 null, BOOLEAN 루틴은 값이 전부 null인 객체)',
    type: RoutineCheckedLogDto,
    nullable: true,
  })
  checkedLog: RoutineCheckedLogDto | null;

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

  @ApiProperty({ description: '텍스트 기록 값', nullable: true })
  textValue: string | null;

  @ApiProperty({ description: '수치 기록 값', nullable: true })
  numericValue: number | null;

  @ApiProperty({ description: '시각 기록 값 (HH:mm)', nullable: true })
  timeValue: string | null;

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

export class RoutineCategoryLinkDto {
  @ApiProperty({ description: '연결 ID' })
  id: string;

  @ApiProperty({ description: '루틴 ID' })
  routineId: string;

  @ApiProperty({ description: '카테고리 ID' })
  categoryId: string;

  @ApiProperty({ description: '카테고리 제목' })
  categoryTitle: string;

  @ApiProperty({ description: '연결 생성일' })
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
