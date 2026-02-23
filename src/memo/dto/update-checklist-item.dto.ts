import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiProperty({
    description: '항목 내용',
    example: '여권 챙기기',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  content?: string;

  @ApiProperty({ description: '정렬 순서', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
