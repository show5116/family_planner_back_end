import { ApiProperty } from '@nestjs/swagger';
import { RoutineDto } from './routine-response.dto';

export class RoutineCategoryDto {
  @ApiProperty({ description: '카테고리 ID' })
  id: string;

  @ApiProperty({ description: '카테고리 제목', example: '규칙적인 삶' })
  title: string;

  @ApiProperty({ description: '이모지', nullable: true })
  emoji: string | null;

  @ApiProperty({ description: '색상', nullable: true })
  color: string | null;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder: number;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class RoutineCategoryDetailDto extends RoutineCategoryDto {
  @ApiProperty({ description: '소속 습관 목록', type: [RoutineDto] })
  routines: RoutineDto[];
}
