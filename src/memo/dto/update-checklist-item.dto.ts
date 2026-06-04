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
    description: '섹션 제목 (null 전달 시 섹션 해제)',
    example: '부모 물건',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sectionTitle?: string | null;

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
