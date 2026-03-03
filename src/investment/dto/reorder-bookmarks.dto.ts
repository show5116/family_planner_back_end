import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderBookmarksDto {
  @ApiProperty({
    description: '즐겨찾기 symbol 배열 (순서대로)',
    example: ['KOSPI', 'BTC', 'GOLD_USD'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  symbols: string[];
}
