import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class ReorderDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: '순서대로 정렬된 ID 배열', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
