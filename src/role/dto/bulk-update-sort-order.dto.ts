import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RoleSortOrderItem {
  @ApiProperty({
    description: '역할 ID',
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

export class BulkUpdateRoleSortOrderDto {
  @ApiProperty({
    description: '역할 ID와 정렬 순서 배열',
    type: [RoleSortOrderItem],
    example: [
      { id: 'role-1', sortOrder: 0 },
      { id: 'role-2', sortOrder: 1 },
      { id: 'role-3', sortOrder: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleSortOrderItem)
  items: RoleSortOrderItem[];
}
