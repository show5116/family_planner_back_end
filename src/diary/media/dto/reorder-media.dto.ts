import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderMediaDto {
  @ApiProperty({
    description: '표시할 순서대로 나열한 미디어 ID 배열 (한 일기의 전체 첨부)',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mediaIds: string[];
}
