import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RoutineFrequencyType,
  RoutineWeeklyMode,
  RoutineImportance,
  RoutineTimeFilter,
  RoutineRecordType,
} from '@/routine/enums';

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
    description: '루틴 메모 (체크별 note와 별개로, 루틴 자체에 대한 설명)',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @ApiProperty({
    description: '중요도',
    enum: RoutineImportance,
    default: RoutineImportance.MEDIUM,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoutineImportance)
  importance?: RoutineImportance = RoutineImportance.MEDIUM;

  @ApiProperty({
    description: '시간대 분류 (오전/오후/저녁, 알림과는 무관한 분류용)',
    enum: RoutineTimeFilter,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(RoutineTimeFilter)
  timeFilter?: RoutineTimeFilter;

  @ApiProperty({
    description: '소속시킬 루틴 카테고리 ID (없으면 미분류)',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description:
      '기록 방식 (BOOLEAN=단순 체크, TEXT=텍스트, TIME=시각(HH:mm), NUMERIC=수치). 루틴 생성 시 고정되며 체크마다 바꿀 수 없음',
    enum: RoutineRecordType,
    default: RoutineRecordType.BOOLEAN,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoutineRecordType)
  recordType?: RoutineRecordType = RoutineRecordType.BOOLEAN;

  @ApiProperty({
    description: '반복 타입',
    enum: RoutineFrequencyType,
    default: RoutineFrequencyType.WEEKLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoutineFrequencyType)
  frequencyType?: RoutineFrequencyType = RoutineFrequencyType.WEEKLY;

  @ApiProperty({
    description:
      '주 반복 세부 방식 (frequencyType=WEEKLY일 때 필수). COUNT_ONLY=요일 무관 주 N회, FIXED_DAYS=특정 요일 지정',
    enum: RoutineWeeklyMode,
    required: false,
  })
  @ValidateIf((o) => o.frequencyType === RoutineFrequencyType.WEEKLY)
  @IsEnum(RoutineWeeklyMode)
  weeklyMode?: RoutineWeeklyMode;

  @ApiProperty({
    description:
      '목표 횟수. WEEKLY+COUNT_ONLY=주 목표 횟수(1~7), MONTHLY=월 목표 횟수(1~31)',
    example: 3,
    required: false,
  })
  @ValidateIf(
    (o) =>
      (o.frequencyType === RoutineFrequencyType.WEEKLY &&
        o.weeklyMode === RoutineWeeklyMode.COUNT_ONLY) ||
      o.frequencyType === RoutineFrequencyType.MONTHLY,
  )
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  targetCount?: number;

  @ApiProperty({
    description:
      '반복 요일 목록 (frequencyType=WEEKLY, weeklyMode=FIXED_DAYS일 때 필수, 0=일요일~6=토요일)',
    example: [1, 3, 5],
    type: [Number],
    required: false,
  })
  @ValidateIf(
    (o) =>
      o.frequencyType === RoutineFrequencyType.WEEKLY &&
      o.weeklyMode === RoutineWeeklyMode.FIXED_DAYS,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  targetDays?: number[];

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

  @ApiProperty({
    description: '소속시킬 루틴 그룹 ID (없으면 독립 습관)',
    required: false,
  })
  @IsOptional()
  @IsString()
  routineGroupId?: string;
}
