import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRoutineShareDto {
  @ApiProperty({ description: '공유할 그룹 ID' })
  @IsString()
  groupId: string;
}
