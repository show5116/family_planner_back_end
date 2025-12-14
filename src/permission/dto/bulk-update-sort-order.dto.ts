import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PermissionSortOrderItem {
  @ApiProperty({
    description: '권한 ID',
    example: 'uuid',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: '정렬 순서',
    example: 0,
  })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class BulkUpdatePermissionSortOrderDto {
  @ApiProperty({
    description: '권한 ID와 정렬 순서 배열',
    type: [PermissionSortOrderItem],
    example: [
      { id: 'perm-1', sortOrder: 0 },
      { id: 'perm-2', sortOrder: 1 },
      { id: 'perm-3', sortOrder: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionSortOrderItem)
  items: PermissionSortOrderItem[];
}
