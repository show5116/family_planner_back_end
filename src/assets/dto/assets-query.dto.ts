import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StatisticsQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;
}
