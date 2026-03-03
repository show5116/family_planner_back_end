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

  @ApiProperty({
    description:
      'GOLD_KRW 전용: 국내 현물가 대비 이격률 (%). 양수 = 환산가가 현물가보다 높음',
    example: '1.23',
    nullable: true,
  })
  spread: string | null;
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

export class HistoricalInitResultDto {
  @ApiProperty({ description: '저장된 Yahoo 시세 건수', example: 5400 })
  yahoo: number;

  @ApiProperty({ description: '저장된 BTC/KRW 건수', example: 365 })
  crypto: number;

  @ApiProperty({ description: '저장된 한국채 건수', example: 250 })
  bond: number;

  @ApiProperty({ description: '저장된 국내 금값 건수', example: 360 })
  goldKrw: number;
}
