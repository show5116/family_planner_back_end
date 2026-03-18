import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CastBallotDto {
  @ApiProperty({
    description:
      '선택한 선택지 ID 목록 (단일 선택 시 1개, 복수 선택 시 여러 개)',
    example: ['option-uuid-1'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  optionIds: string[];
}
