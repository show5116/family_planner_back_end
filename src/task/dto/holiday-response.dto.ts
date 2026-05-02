import { ApiProperty } from '@nestjs/swagger';

export class HolidayDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)', example: '2025-01-01' })
  date: string;

  @ApiProperty({ description: '공휴일 명칭', example: '신정' })
  name: string;

  @ApiProperty({ description: '대체공휴일 여부', example: false })
  isSubstitute: boolean;
}

export class HolidayListDto {
  @ApiProperty({ description: '연도', example: 2025 })
  year: number;

  @ApiProperty({ description: '월', example: 5 })
  month: number;

  @ApiProperty({ description: '공휴일 목록', type: [HolidayDto] })
  holidays: HolidayDto[];
}
