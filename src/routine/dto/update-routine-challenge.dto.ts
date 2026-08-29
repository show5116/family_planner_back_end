import { PartialType } from '@nestjs/swagger';
import { CreateRoutineChallengeDto } from './create-routine-challenge.dto';

export class UpdateRoutineChallengeDto extends PartialType(
  CreateRoutineChallengeDto,
) {}
