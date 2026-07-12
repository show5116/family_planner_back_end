import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoutineFrequencyType } from '@/routine/enums';

export class CreateRoutineDto {
  @ApiProperty({
    description: '루틴 제목',
    example: '아침 스트레칭',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: '이모지', example: '🧘', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @ApiProperty({
    description: '색상 (HEX)',
    example: '#6366F1',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiProperty({
    description: '반복 타입 (1차: WEEKLY_COUNT만 지원)',
    enum: RoutineFrequencyType,
    default: RoutineFrequencyType.WEEKLY_COUNT,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoutineFrequencyType)
  frequencyType?: RoutineFrequencyType = RoutineFrequencyType.WEEKLY_COUNT;

  @ApiProperty({
    description: '주 목표 횟수 (frequencyType=WEEKLY_COUNT일 때 필수)',
    example: 3,
    required: false,
  })
  @ValidateIf((o) => o.frequencyType !== RoutineFrequencyType.DAILY)
  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  targetCount?: number;

  @ApiProperty({ description: '시작일 (YYYY-MM-DD)', example: '2026-07-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '종료일 (YYYY-MM-DD, 없으면 무기한)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
