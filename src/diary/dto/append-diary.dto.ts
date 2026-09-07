import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DiaryVisibility } from '@/diary/enums/diary-visibility.enum';

/** 빠른 기록 — 조각 하나를 그날 일기에 append (upsert) */
export class AppendDiaryDto {
  @ApiProperty({
    description: "일기 날짜 ('YYYY-MM-DD', 생략 시 오늘 — 하루 경계 새벽 4시)",
    example: '2026-09-01',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date_format' })
  date?: string;

  @ApiProperty({
    description: '텍스트 조각',
    example: '점심에 본 고양이',
    maxLength: 5000,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  @IsString()
  @MaxLength(5000)
  text: string;

  @ApiProperty({
    description: "조각 시각 마커 ('HH:mm')",
    example: '14:32',
    required: false,
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'validation.time_format' })
  capturedAt?: string;

  @ApiProperty({
    description: '공개 범위 (일기가 새로 생성될 때만 적용, 기본값 PRIVATE)',
    enum: DiaryVisibility,
    required: false,
  })
  @IsOptional()
  @IsEnum(DiaryVisibility)
  visibility?: DiaryVisibility;

  @ApiProperty({
    description: '그룹 ID (일기가 새로 생성되고 GROUP 공개일 때만 적용)',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupId?: string;
}
