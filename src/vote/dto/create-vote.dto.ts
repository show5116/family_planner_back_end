import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({ description: '투표 제목', example: '저녁 메뉴 투표' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: '투표 설명',
    example: '오늘 저녁 뭐 먹을까요?',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '복수 선택 허용 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isMultiple?: boolean;

  @ApiProperty({
    description: '익명 투표 여부',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiProperty({
    description: '투표 마감 시각 (ISO 8601)',
    example: '2026-03-25T23:59:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiProperty({
    description: '투표 선택지 (최소 2개)',
    example: ['치킨', '피자', '삼겹살'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  options: string[];
}
