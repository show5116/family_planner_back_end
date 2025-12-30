import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType, TaskPriority } from '@/task/enums';

export class QueryTasksDto {
  @ApiPropertyOptional({
    description: '뷰 타입',
    enum: ['calendar', 'todo'],
    example: 'calendar',
  })
  @IsEnum(['calendar', 'todo'])
  @IsOptional()
  view?: 'calendar' | 'todo';

  @ApiPropertyOptional({ description: '그룹 ID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ description: '카테고리 ID', example: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Task 타입',
    enum: TaskType,
  })
  @IsEnum(TaskType)
  @IsOptional()
  type?: TaskType;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: TaskPriority,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '완료 여부', type: Boolean })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: '시작 날짜', example: '2025-12-01' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료 날짜', example: '2025-12-31' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '페이지', example: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', example: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}
