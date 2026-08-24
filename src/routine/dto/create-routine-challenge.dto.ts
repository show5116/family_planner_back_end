import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateRoutineChallengeDto {
  @ApiProperty({
    description: '챌린지 제목',
    example: '이번 주 운동하기',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  title: string;

  @ApiProperty({
    description: '챌린지 설명',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ description: '시작일 (YYYY-MM-DD)', example: '2026-08-24' })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '종료일 (YYYY-MM-DD, startDate 이상)',
    example: '2026-08-30',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: '기간 내 목표 체크 횟수 (1 이상)', example: 3 })
  @IsInt()
  @Min(1)
  targetCount: number;

  @ApiProperty({
    description: '내기·벌칙 문구 (자유 텍스트)',
    example: '진 사람이 치킨 쏘기',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reward?: string;
}
