import { ApiProperty } from '@nestjs/swagger';

export class WeatherResponseDto {
  @ApiProperty({ description: '기온 (°C)', example: 22.5 })
  temperature: number;

  @ApiProperty({ description: '상대 습도 (%)', example: 60 })
  humidity: number;

  @ApiProperty({ description: '풍속 (m/s)', example: 3.2 })
  windSpeed: number;

  @ApiProperty({ description: '1시간 강수량 (mm)', example: 0 })
  precipitation: number;

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

  @ApiProperty({ description: '기준 날짜 (YYYYMMDD)', example: '20260314' })
  baseDate: string;

  @ApiProperty({ description: '기준 시각 (HHmm)', example: '1200' })
  baseTime: string;
}
