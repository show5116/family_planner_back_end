import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRoutineCategoryLinkDto {
  @ApiProperty({ description: '연결할 카테고리 ID' })
  @IsString()
  categoryId: string;
}
