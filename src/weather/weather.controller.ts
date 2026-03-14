import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WeatherService } from '@/weather/weather.service';
import { WeatherQueryDto } from '@/weather/dto/weather-query.dto';
import { WeatherResponseDto } from '@/weather/dto/weather-response.dto';
import { ForecastResponseDto } from '@/weather/dto/forecast-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';

@ApiTags('날씨')
@Controller('weather')
@ApiCommonAuthResponses()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @ApiOperation({
    summary: '현재 위치 날씨 조회',
    description: 'GPS 좌표(위도/경도)로 현재 날씨를 조회합니다 (초단기실황)',
  })
  @ApiSuccess(WeatherResponseDto, '날씨 조회 성공')
  getWeather(@Query() query: WeatherQueryDto) {
    return this.weatherService.getWeather(query);
  }

  @Get('forecast')
  @ApiOperation({
    summary: '단기예보 조회',
    description:
      'GPS 좌표(위도/경도)로 향후 3일간 시간별 날씨 예보를 조회합니다',
  })
  @ApiSuccess(ForecastResponseDto, '단기예보 조회 성공')
  getForecast(@Query() query: WeatherQueryDto) {
    return this.weatherService.getForecast(query);
  }
}
