import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ReorderAccountHoldingsDto {
  @ApiProperty({
    description: '정렬 순서대로 나열한 holding ID 목록',
    type: [String],
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
  })
  @IsArray()
  @IsString({ each: true })
  holdingIds: string[];
}
