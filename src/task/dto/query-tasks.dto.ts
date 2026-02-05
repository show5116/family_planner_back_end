import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskType, TaskStatus, TaskPriority } from '@/task/enums';

export class QueryTasksDto {
  @ApiPropertyOptional({
    description: '뷰 타입',
    enum: ['calendar', 'todo'],
    example: 'calendar',
  })
  @IsEnum(['calendar', 'todo'])
  @IsOptional()
  view?: 'calendar' | 'todo';

  @ApiPropertyOptional({
    description: '그룹 ID 목록 (콤마로 구분)',
    example: 'uuid1,uuid2',
    type: [String],
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return value.split(',').map((v: string) => v.trim());
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  groupIds?: string[];

  @ApiPropertyOptional({
    description: '개인 일정 포함 여부 (기본값: true)',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  includePersonal?: boolean;

  @ApiPropertyOptional({
    description: '카테고리 ID 목록 (콤마로 구분)',
    example: 'uuid1,uuid2',
    type: [String],
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return value.split(',').map((v: string) => v.trim());
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  categoryIds?: string[];

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

  @ApiPropertyOptional({
    description: 'Task 상태',
    enum: TaskStatus,
    example: 'PENDING',
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

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
