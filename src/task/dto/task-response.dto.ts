import { ApiProperty } from '@nestjs/swagger';
import { TaskType, TaskPriority, TaskHistoryAction } from '@/task/enums';
import { CategoryDto } from './category-response.dto';
import { PaginationMetaDto } from './common-response.dto';
import { TaskParticipantDto } from './participant-response.dto';

export class RecurringDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '반복 타입', example: 'WEEKLY' })
  ruleType: string;

  @ApiProperty({ description: '반복 설정', example: { daysOfWeek: [1, 3, 5] } })
  ruleConfig: Record<string, any>;

  @ApiProperty({ description: '생성 방식', example: 'AUTO_SCHEDULER' })
  generationType: string;

  @ApiProperty({ description: '활성화 여부', example: true })
  isActive: boolean;
}

export class TaskReminderResponseDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '알림 타입', example: 'BEFORE_START' })
  reminderType: string;

  @ApiProperty({ description: '오프셋 (분)', example: -60 })
  offsetMinutes: number;

  @ApiProperty({ description: '발송 시간', nullable: true })
  sentAt: Date | null;
}

export class TaskHistoryDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({ description: '변경 유형', enum: TaskHistoryAction })
  action: TaskHistoryAction;

  @ApiProperty({ description: '변경 내용', nullable: true })
  changes: any | null;

  @ApiProperty({ description: '변경 시간' })
  createdAt: Date;
}

export class TaskDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  userId: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid', nullable: true })
  groupId: string | null;

  @ApiProperty({ description: '제목', example: '회의 참석' })
  title: string;

  @ApiProperty({
    description: '설명',
    example: '분기 결산 회의',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '장소', nullable: true })
  location: string | null;

  @ApiProperty({ description: 'Task 타입', enum: TaskType })
  type: TaskType;

  @ApiProperty({ description: '우선순위', enum: TaskPriority })
  priority: TaskPriority;

  @ApiProperty({ description: '카테고리', type: CategoryDto })
  category: CategoryDto;

  @ApiProperty({ description: '수행 시작 날짜', nullable: true })
  scheduledAt: Date | null;

  @ApiProperty({ description: '마감 날짜', nullable: true })
  dueAt: Date | null;

  @ApiProperty({
    description: 'D-Day (남은 일수)',
    example: 3,
    nullable: true,
  })
  daysUntilDue: number | null;

  @ApiProperty({ description: '완료 여부', example: false })
  isCompleted: boolean;

  @ApiProperty({ description: '완료 시간', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ description: '반복 정보', type: RecurringDto, nullable: true })
  recurring: RecurringDto | null;

  @ApiProperty({
    description: '참여자 목록',
    type: [TaskParticipantDto],
    required: false,
  })
  participants?: TaskParticipantDto[];

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class TaskDetailDto extends TaskDto {
  @ApiProperty({
    description: '알림 목록',
    type: [TaskReminderResponseDto],
  })
  reminders: TaskReminderResponseDto[];

  @ApiProperty({ description: '변경 이력', type: [TaskHistoryDto] })
  histories: TaskHistoryDto[];
}

export class PaginatedTaskDto {
  @ApiProperty({ type: [TaskDto] })
  data: TaskDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class TaskSkipDto {
  @ApiProperty({ description: 'ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '반복 규칙 ID', example: 'uuid' })
  recurringId: string;

  @ApiProperty({ description: '건너뛸 날짜', example: '2025-12-30' })
  skipDate: Date;

  @ApiProperty({ description: '건너뛰는 이유', nullable: true })
  reason: string | null;

  @ApiProperty({ description: '생성자 ID', example: 'uuid' })
  createdBy: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}
