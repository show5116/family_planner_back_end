import { PartialType } from '@nestjs/swagger';
import { CreateRoutineGroupDto } from './create-routine-group.dto';

export class UpdateRoutineGroupDto extends PartialType(CreateRoutineGroupDto) {}
