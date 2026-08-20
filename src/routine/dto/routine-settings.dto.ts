import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum RoutineDailyGoalMode {
  ALL = 'ALL',
  COUNT = 'COUNT',
}

export class UpdateRoutineSettingsDto {
  @ApiProperty({
    description:
      '일일 목표 모드. ALL=그날 대상 습관 전부, COUNT=dailyGoalCount 개수만 채우면 달성',
    enum: RoutineDailyGoalMode,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoutineDailyGoalMode)
  dailyGoalMode?: RoutineDailyGoalMode;

  @ApiProperty({
    description:
      'dailyGoalMode=COUNT일 때의 목표 개수 (1 이상). ALL로 바꿀 때 생략하면 기존 값 유지',
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyGoalCount?: number;
}

export class RoutineSettingsResponseDto {
  @ApiProperty({ description: '일일 목표 모드', enum: RoutineDailyGoalMode })
  dailyGoalMode: string;

  @ApiProperty({
    description: 'COUNT 모드일 때 목표 개수 (ALL이면 null)',
    nullable: true,
  })
  dailyGoalCount: number | null;
}
