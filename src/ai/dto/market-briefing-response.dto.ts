import { ApiProperty } from '@nestjs/swagger';

export class MarketBriefingDto {
  @ApiProperty({
    description: '브리핑 제목',
    example: '매크로 동향 현황 업데이트',
  })
  title: string;

  @ApiProperty({ description: '브리핑 내용' })
  content: string;

  @ApiProperty({
    description: '마지막 업데이트 시각 (ISO 8601)',
    example: '2026-03-30T07:00:00.000Z',
  })
  updated_at: string;
}

export class MarketBriefingResponseDto {
  @ApiProperty({ type: MarketBriefingDto, nullable: true })
  macro: MarketBriefingDto | null;

  @ApiProperty({ type: MarketBriefingDto, nullable: true })
  domestic_market: MarketBriefingDto | null;

  @ApiProperty({ type: MarketBriefingDto, nullable: true })
  global_market: MarketBriefingDto | null;
}
