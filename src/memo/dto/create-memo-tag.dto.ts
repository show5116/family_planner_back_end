import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateMemoTagDto {
  @ApiProperty({ description: '태그 이름', example: '중요' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
