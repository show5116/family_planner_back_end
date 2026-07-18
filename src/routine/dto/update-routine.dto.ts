import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateRoutineDto } from './create-routine.dto';

export class UpdateRoutineDto extends PartialType(CreateRoutineDto) {
  @ApiProperty({
    description: '소속시킬 루틴 그룹 ID (null 전달 시 그룹 소속 해제)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  routineGroupId?: string | null;

  @ApiProperty({
    description:
      '전체 카테고리 목록을 이 배열로 교체 (빈 배열 [] 전달 시 전체 해제). 미전달 시 기존 연결 유지',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
}
