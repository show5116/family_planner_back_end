import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class RoutineGroupSortOrderItemDto {
  @ApiProperty({ description: '그룹 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '정렬 순서', example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderRoutineGroupDto {
  @ApiProperty({
    description: '그룹 순서 목록',
    type: [RoutineGroupSortOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineGroupSortOrderItemDto)
  items: RoutineGroupSortOrderItemDto[];
}
