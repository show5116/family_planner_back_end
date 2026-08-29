import { ApiProperty } from '@nestjs/swagger';
import { RoutineDto } from './routine-response.dto';

export class RoutineGroupProgressDto {
  @ApiProperty({ description: '오늘 체크 완료 개수' })
  checked: number;

  @ApiProperty({ description: '오늘 기준 활성 습관 총 개수' })
  total: number;
}

export class RoutineGroupDto {
  @ApiProperty({ description: '그룹 ID' })
  id: string;

  @ApiProperty({ description: '그룹 제목', example: '아침 루틴' })
  title: string;

  @ApiProperty({ description: '이모지', nullable: true })
  emoji: string | null;

  @ApiProperty({ description: '색상', nullable: true })
  color: string | null;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder: number;

  @ApiProperty({ description: '오늘 진행 상황', type: RoutineGroupProgressDto })
  todayProgress: RoutineGroupProgressDto;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class RoutineGroupDetailDto extends RoutineGroupDto {
  @ApiProperty({ description: '소속 습관 목록', type: [RoutineDto] })
  routines: RoutineDto[];
}
