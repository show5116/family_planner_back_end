import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GroupIdQueryDto {
  @ApiProperty({ example: 'uuid-group' })
  @IsUUID()
  groupId: string;
}
