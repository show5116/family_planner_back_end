import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateMemoTagDto {
  @ApiProperty({ description: '태그 이름', example: '중요' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: '태그 색상',
    example: '#FF5733',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}
