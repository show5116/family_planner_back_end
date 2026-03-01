import { ApiProperty } from '@nestjs/swagger';
import { IndicatorCategory } from '@prisma/client';

export class IndicatorDto {
  @ApiProperty({ description: '심볼', example: 'KOSPI' })
  symbol: string;

  @ApiProperty({ description: '영문명', example: 'KOSPI' })
  name: string;

  @ApiProperty({ description: '한글명', example: '코스피' })
  nameKo: string;

  @ApiProperty({ description: '카테고리', enum: IndicatorCategory })
  category: IndicatorCategory;

  @ApiProperty({ description: '단위', example: 'pt' })
  unit: string;

  @ApiProperty({ description: '현재 시세', example: '2580.34', nullable: true })
  price: string | null;

  @ApiProperty({
    description: '전일 종가',
    example: '2550.12',
    nullable: true,
  })
  prevPrice: string | null;

  @ApiProperty({ description: '변동액', example: '30.22', nullable: true })
  change: string | null;

  @ApiProperty({ description: '변동률 (%)', example: '1.19', nullable: true })
  changeRate: string | null;

  @ApiProperty({ description: '수집 시각', nullable: true })
  recordedAt: Date | null;

  @ApiProperty({ description: '즐겨찾기 여부', example: false })
  isBookmarked: boolean;
}

export class IndicatorPricePointDto {
  @ApiProperty({ description: '시세', example: '2580.34' })
  price: string;

  @ApiProperty({ description: '수집 시각' })
  recordedAt: Date;
}

export class IndicatorHistoryDto {
  @ApiProperty({ description: '심볼', example: 'KOSPI' })
  symbol: string;

  @ApiProperty({ description: '한글명', example: '코스피' })
  nameKo: string;

  @ApiProperty({ description: '시계열 데이터', type: [IndicatorPricePointDto] })
  history: IndicatorPricePointDto[];
}
