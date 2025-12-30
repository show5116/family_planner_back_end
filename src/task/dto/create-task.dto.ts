import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  ValidateNested,
  IsArray,
  MinLength,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TaskType,
  TaskPriority,
  RecurringRuleType,
  RecurringGenerationType,
  TaskReminderType,
} from '@/task/enums';

export class RecurringRuleDto {
  @ApiProperty({
    description: '반복 타입',
    enum: RecurringRuleType,
    example: RecurringRuleType.WEEKLY,
  })
  @IsEnum(RecurringRuleType)
  ruleType: RecurringRuleType;

  @ApiProperty({
    description: '반복 설정',
    example: { daysOfWeek: [1, 3, 5] },
  })
  ruleConfig: Record<string, any>;

  @ApiProperty({
    description: '생성 방식',
    enum: RecurringGenerationType,
    example: RecurringGenerationType.AUTO_SCHEDULER,
  })
  @IsEnum(RecurringGenerationType)
  generationType: RecurringGenerationType;
}

export class TaskReminderDto {
  @ApiProperty({
    description: '알림 타입',
    enum: TaskReminderType,
    example: TaskReminderType.BEFORE_START,
  })
  @IsEnum(TaskReminderType)
  reminderType: TaskReminderType;

  @ApiProperty({ description: '오프셋 (분, 음수 가능)', example: -60 })
  @IsInt()
  offsetMinutes: number;
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Task 제목', example: '회의 참석' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: '상세 설명',
    example: '분기 결산 회의',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '장소',
    example: '본사 2층 회의실',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Task 타입',
    enum: TaskType,
    example: TaskType.TODO_LINKED,
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ description: '카테고리 ID', example: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: '그룹 ID (그룹 Task 생성 시)',
    example: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({
    description: '수행 시작 날짜',
    example: '2025-12-30T09:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: '마감 날짜',
    example: '2025-12-30T18:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @ApiPropertyOptional({
    description: '반복 규칙',
    type: RecurringRuleDto,
  })
  @ValidateNested()
  @Type(() => RecurringRuleDto)
  @IsOptional()
  recurring?: RecurringRuleDto;

  @ApiPropertyOptional({
    description: '알림 목록',
    type: [TaskReminderDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskReminderDto)
  @IsOptional()
  reminders?: TaskReminderDto[];
}
