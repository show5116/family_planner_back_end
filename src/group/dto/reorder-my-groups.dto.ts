import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class ReorderMyGroupsDto {
  @ApiProperty({
    description: '원하는 순서대로 정렬한 그룹 ID 배열 (본인이 속한 그룹 전체)',
    example: ['uuid1', 'uuid2', 'uuid3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  groupIds: string[];
}
