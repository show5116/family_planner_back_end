import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDiaryDto } from './create-diary.dto';

/** 날짜는 일기의 식별 단위이므로 수정할 수 없다 */
export class UpdateDiaryDto extends PartialType(
  OmitType(CreateDiaryDto, ['date'] as const),
) {}
