import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class RoutineCategorySortOrderItemDto {
  @ApiProperty({ description: '카테고리 ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: '정렬 순서', example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderRoutineCategoryDto {
  @ApiProperty({
    description: '카테고리 순서 목록',
    type: [RoutineCategorySortOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineCategorySortOrderItemDto)
  items: RoutineCategorySortOrderItemDto[];
}
