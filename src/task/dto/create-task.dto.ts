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
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TaskType,
  TaskPriority,
  RecurringRuleType,
  RecurringGenerationType,
  TaskReminderType,
} from '@/task/enums';
import { RecurringEndType } from '@/task/interfaces';

/**
 * 반복 규칙 설정 DTO
 */
export class RuleConfigDto {
  @ApiProperty({
    description: '반복 간격 (1 = 매번, 2 = 격주/격월 등)',
    example: 1,
    minimum: 1,
    maximum: 99,
  })
  @IsInt()
  @Min(1)
  @Max(99)
  interval: number;

  @ApiProperty({
    description: '종료 조건',
    enum: RecurringEndType,
    example: RecurringEndType.NEVER,
  })
  @IsEnum(RecurringEndType)
  endType: RecurringEndType;

  @ApiPropertyOptional({
    description: '종료 날짜 (endType이 DATE인 경우 필수)',
    example: '2026-12-31',
  })
  @ValidateIf((o) => o.endType === RecurringEndType.DATE)
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '반복 횟수 (endType이 COUNT인 경우 필수)',
    example: 10,
    minimum: 1,
    maximum: 999,
  })
  @ValidateIf((o) => o.endType === RecurringEndType.COUNT)
  @IsInt()
  @Min(1)
  @Max(999)
  count?: number;

  @ApiPropertyOptional({
    description: '반복할 요일 목록 (WEEKLY인 경우, 0=일요일 ~ 6=토요일)',
    example: [1, 3, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description:
      'MONTHLY 반복 타입 (dayOfMonth: 날짜 기준, weekOfMonth: 요일 기준)',
    example: 'dayOfMonth',
    enum: ['dayOfMonth', 'weekOfMonth'],
  })
  @IsOptional()
  @IsEnum(['dayOfMonth', 'weekOfMonth'])
  monthlyType?: 'dayOfMonth' | 'weekOfMonth';

  @ApiPropertyOptional({
    description: '날짜 (1-31, MONTHLY/YEARLY의 dayOfMonth 타입인 경우)',
    example: 15,
    minimum: 1,
    maximum: 31,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: '주차 (1-5, MONTHLY의 weekOfMonth 타입인 경우, 5는 마지막 주)',
    example: 2,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  weekOfMonth?: number;

  @ApiPropertyOptional({
    description: '요일 (0-6, MONTHLY의 weekOfMonth 타입인 경우)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: '월 (1-12, YEARLY인 경우)',
    example: 3,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

/**
 * 반복 규칙 DTO
 */
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
    type: RuleConfigDto,
    example: {
      interval: 1,
      endType: 'NEVER',
      daysOfWeek: [1, 3, 5],
    },
  })
  @ValidateNested()
  @Type(() => RuleConfigDto)
  ruleConfig: RuleConfigDto;

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
  @IsOptional()
  @Type(() => Date)
  scheduledAt?: Date;

  @ApiPropertyOptional({
    description: '마감 날짜',
    example: '2025-12-30T18:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  dueAt?: Date;

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

  @ApiPropertyOptional({
    description: '참여자 ID 목록 (그룹 Task에서만 사용 가능)',
    example: ['uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  participantIds?: string[];
}
