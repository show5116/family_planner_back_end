import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CompleteTaskDto {
  @ApiProperty({ description: '완료 여부', example: true })
  @IsBoolean()
  isCompleted: boolean;
}
