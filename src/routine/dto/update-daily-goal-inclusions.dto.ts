import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

class DailyGoalInclusionItemDto {
  @ApiProperty({ description: '루틴 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '일일 목표 집계 포함 여부' })
  @IsBoolean()
  includeInDailyGoal: boolean;
}

export class UpdateDailyGoalInclusionsDto {
  @ApiProperty({
    description: '루틴별 일일 목표 포함 여부 목록',
    type: [DailyGoalInclusionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyGoalInclusionItemDto)
  items: DailyGoalInclusionItemDto[];
}
