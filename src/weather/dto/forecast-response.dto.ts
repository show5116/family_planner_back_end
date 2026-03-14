import { ApiProperty } from '@nestjs/swagger';

export class ForecastItemDto {
  @ApiProperty({ description: '예보 날짜 (YYYYMMDD)', example: '20260314' })
  fcstDate: string;

  @ApiProperty({ description: '예보 시각 (HHmm)', example: '1500' })
  fcstTime: string;

  @ApiProperty({ description: '기온 (°C)', example: 22.0 })
  temperature: number;

  @ApiProperty({ description: '최저 기온 (°C)', example: 15.0, nullable: true })
  minTemperature: number | null;

  @ApiProperty({ description: '최고 기온 (°C)', example: 25.0, nullable: true })
  maxTemperature: number | null;

  @ApiProperty({ description: '강수 확률 (%)', example: 30 })
  precipitationProbability: number;

  @ApiProperty({ description: '강수량 (mm)', example: 0 })
  precipitation: number;

  @ApiProperty({ description: '습도 (%)', example: 60 })
  humidity: number;

  @ApiProperty({ description: '풍속 (m/s)', example: 3.2 })
  windSpeed: number;

  @ApiProperty({
    description: '하늘상태 코드 (1=맑음, 3=구름많음, 4=흐림)',
    example: 1,
  })
  sky: number;

  @ApiProperty({
    description: '강수형태 코드 (0=없음, 1=비, 2=진눈깨비, 3=눈, 4=소나기)',
    example: 0,
  })
  precipitationType: number;

  @ApiProperty({ description: '날씨 설명', example: '맑음' })
  weatherDescription: string;
}

export class ForecastResponseDto {
  @ApiProperty({ description: '기준 날짜 (YYYYMMDD)', example: '20260314' })
  baseDate: string;

  @ApiProperty({ description: '기준 시각 (HHmm)', example: '0500' })
  baseTime: string;

  @ApiProperty({ type: [ForecastItemDto], description: '시간별 예보 목록' })
  forecasts: ForecastItemDto[];
}
