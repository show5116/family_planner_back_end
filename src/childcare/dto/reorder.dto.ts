import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ReorderDto {
  @ApiProperty({
    description: '변경할 순서대로 정렬된 ID 목록',
    example: ['uuid-3', 'uuid-1', 'uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
