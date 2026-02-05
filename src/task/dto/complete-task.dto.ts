import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TaskStatus } from '@/task/enums';

export class UpdateTaskStatusDto {
  @ApiProperty({
    description: 'Task 상태',
    enum: TaskStatus,
    example: 'COMPLETED',
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
