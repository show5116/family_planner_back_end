import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
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
    description: '소속시킬 루틴 카테고리 ID (null 전달 시 카테고리 소속 해제)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
