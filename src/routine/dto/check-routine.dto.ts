import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
