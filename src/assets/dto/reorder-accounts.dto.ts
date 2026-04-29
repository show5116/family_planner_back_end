import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ReorderAccountsDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({
    description: '순서대로 정렬된 계좌 ID 목록',
    example: ['uuid-a', 'uuid-b', 'uuid-c'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  accountIds: string[];
}
