import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckRoutineDto {
  @ApiProperty({
    description: '체크할 날짜 (YYYY-MM-DD, 미지정 시 오늘)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: '메모', required: false, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiProperty({
    description: '텍스트 기록 값 (recordType=TEXT인 루틴만 사용)',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  textValue?: string;

  @ApiProperty({
    description: '수치 기록 값 (recordType=NUMERIC인 루틴만 사용)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  numericValue?: number;

  @ApiProperty({
    description: '시각 기록 값 "HH:mm" (recordType=TIME인 루틴만 사용)',
    example: '07:30',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeValue must be in HH:mm format',
  })
  timeValue?: string;
}
