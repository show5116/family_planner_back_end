import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRoutineDto } from './create-routine.dto';

export class UpdateRoutineDto extends PartialType(CreateRoutineDto) {
  @ApiProperty({ description: '활성 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
