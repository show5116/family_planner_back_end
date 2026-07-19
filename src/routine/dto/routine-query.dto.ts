import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoutineStatus } from '@/routine/enums';

export class RoutineQueryDto {
  @ApiProperty({
    description:
      '상태 필터 (ACTIVE/PAUSED만 의미 있음, ENDED는 항상 목록에서 제외됨)',
    enum: RoutineStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(RoutineStatus)
  status?: RoutineStatus;

  @ApiProperty({ description: '특정 루틴 그룹 소속만 조회', required: false })
  @IsOptional()
  @IsString()
  routineGroupId?: string;

  @ApiProperty({
    description: '특정 루틴 카테고리 소속만 조회',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: '체크 여부/기록값 조회 기준 날짜 (YYYY-MM-DD, 미지정 시 오늘)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
