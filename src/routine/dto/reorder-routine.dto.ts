import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class RoutineSortOrderItemDto {
  @ApiProperty({ description: '루틴 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '정렬 순서', example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderRoutineDto {
  @ApiProperty({
    description: '루틴 순서 목록',
    type: [RoutineSortOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineSortOrderItemDto)
  items: RoutineSortOrderItemDto[];
}
