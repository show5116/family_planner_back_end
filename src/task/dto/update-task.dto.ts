import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskType, TaskPriority } from '@/task/enums';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task 제목', example: '회의 참석' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

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

  @ApiPropertyOptional({
    description: 'Task 타입',
    enum: TaskType,
    example: TaskType.TODO_LINKED,
  })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

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
}
