import { ApiProperty } from '@nestjs/swagger';

export class HolidayDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)', example: '2025-01-01' })
  date: string;

  @ApiProperty({ description: '공휴일 명칭', example: '신정' })
  name: string;

  @ApiProperty({ description: '대체공휴일 여부', example: false })
  isSubstitute: boolean;
}

export class SpecialDayDto {
  @ApiProperty({ description: '날짜 (YYYY-MM-DD)', example: '2025-05-08' })
  date: string;

  @ApiProperty({ description: '특별한 날 명칭', example: '어버이날' })
  name: string;
}

export class HolidayListDto {
  @ApiProperty({ description: '연도', example: 2025 })
  year: number;

  @ApiProperty({ description: '월', example: 5 })
  month: number;

  @ApiProperty({ description: '공휴일 목록 (휴일 O)', type: [HolidayDto] })
  holidays: HolidayDto[];

  @ApiProperty({
    description: '특별한 날 목록 (휴일 X — 기념일/이벤트성 날)',
    type: [SpecialDayDto],
  })
  specialDays: SpecialDayDto[];
}
