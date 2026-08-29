import { PartialType } from '@nestjs/swagger';
import { CreateRoutineCategoryDto } from './create-routine-category.dto';

export class UpdateRoutineCategoryDto extends PartialType(
  CreateRoutineCategoryDto,
) {}
