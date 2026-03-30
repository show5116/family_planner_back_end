import { HttpService } from '@nestjs/axios';
import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import { WeatherQueryDto } from '@/weather/dto/weather-query.dto';
import { WeatherResponseDto } from '@/weather/dto/weather-response.dto';
import {
  ForecastItemDto,
  ForecastResponseDto,
} from '@/weather/dto/forecast-response.dto';
import { RedisService } from '@/redis/redis.service';

// 날씨 캐시 TTL: 1시간 (기상청 초단기실황 발표 주기)
const WEATHER_CACHE_TTL = 60 * 60;
// 단기예보 캐시 TTL: 3시간 (발표 주기 3시간)
const FORECAST_CACHE_TTL = 60 * 60 * 3;
// 미세먼지 캐시 TTL: 1시간 (에어코리아 갱신 주기)
const AIR_CACHE_TTL = 60 * 60;

interface KmaItem {
  category: string;
  obsrValue: string;
}

interface KmaFcstItem {
  fcstDate: string;
  fcstTime: string;
  category: string;
  fcstValue: string;
}

interface KmaResponse<T> {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: T[] };
    };
  };
}

interface AirStationItem {
  stationName: string;
  addr: string;
  tm: number;
}

interface AirMeasureItem {
  pm10Value: string;
  pm25Value: string;
  pm10Grade: string;
  pm25Grade: string;
}

interface AirKoreaResponse<T> {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: T[];
      totalCount: number;
    };
  };
}

// 위경도 → 기상청 격자좌표 변환 파라미터 (Lambert Conformal Conic)
const LCC = {
  Re: 6371.00877,
  grid: 5.0,
  slat1: 30.0,
  slat2: 60.0,
  olon: 126.0,
  olat: 38.0,
  xo: 43,
  yo: 136,
};

function toGrid(lat: number, lon: number): { nx: number; ny: number } {
  const DEGRAD = Math.PI / 180.0;
  const { Re, grid, slat1, slat2, olon, olat, xo, yo } = LCC;

  const re = Re / grid;
  const slat1r = slat1 * DEGRAD;
  const slat2r = slat2 * DEGRAD;
  const olatR = olat * DEGRAD;
  const olonR = olon * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2r * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1r * 0.5);
  sn = Math.log(Math.cos(slat1r) / Math.cos(slat2r)) / Math.log(sn);

  let sf = Math.tan(Math.PI * 0.25 + slat1r * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1r)) / sn;

  let ro = Math.tan(Math.PI * 0.25 + olatR * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  const raVal = (re * sf) / Math.pow(ra, sn);

  let theta = lon * DEGRAD - olonR;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(raVal * Math.sin(theta) + xo + 0.5);
  const ny = Math.floor(ro - raVal * Math.cos(theta) + yo + 0.5);
  return { nx, ny };
}

// 단기예보 base_time 유효값: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
const FCST_BASE_TIMES = [
  '2300',
  '2000',
  '1700',
  '1400',
  '1100',
  '0800',
  '0500',
  '0200',
];

function getForecastBaseTime(now: dayjs.Dayjs): {
  baseDate: string;
  baseTime: string;
} {
  // 발표 후 10분 이후부터 안정적으로 제공
  const target = now.subtract(10, 'minute');
  const currentHHmm = target.format('HHmm');

  for (const t of FCST_BASE_TIMES) {
    if (currentHHmm >= t) {
      return { baseDate: target.format('YYYYMMDD'), baseTime: t };
    }
  }
  // 자정 이전(0200 이전)이면 전날 2300
  return {
    baseDate: target.subtract(1, 'day').format('YYYYMMDD'),
    baseTime: '2300',
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly ncstUrl =
    'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst';
  private readonly fcstUrl =
    'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
  private readonly airStationUrl =
    'http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList';
  private readonly airMeasureUrl =
    'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.serviceKey = this.configService.get<string>('weather.kmaServiceKey');
  }

  async getWeather(query: WeatherQueryDto): Promise<WeatherResponseDto> {
    const { nx, ny } = toGrid(query.lat, query.lon);

    // 기상청 초단기실황: 매시 정각 발표, 약 10분 후 제공 → 안전하게 1시간 전 기준
    const now = dayjs().subtract(1, 'hour');
    const baseDate = now.format('YYYYMMDD');
    const baseTime = now.format('HH00');

    const cacheKey = `weather:${nx}:${ny}:${baseDate}:${baseTime}`;
    const cached = await this.redisService.get<WeatherResponseDto>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<KmaResponse<KmaItem>>(this.ncstUrl, {
          params: {
            serviceKey: this.serviceKey,
            pageNo: 1,
            numOfRows: 10,
            dataType: 'JSON',
            base_date: baseDate,
            base_time: baseTime,
            nx,
            ny,
          },
        }),
      );

      const header = data.response.header;
      if (header.resultCode !== '00') {
        this.logger.error(`기상청 API 오류: ${header.resultMsg}`);
        throw new BadGatewayException('날씨 정보를 가져오는데 실패했습니다');
      }

      const items = data.response.body.items.item;
      const get = (category: string) =>
        items.find((i) => i.category === category)?.obsrValue ?? '0';

      const pty = parseInt(get('PTY'));

      const airData = await this.getAirQuality(query.lat, query.lon);

      const result: WeatherResponseDto = {
        temperature: parseFloat(get('T1H')),
        humidity: parseInt(get('REH')),
        windSpeed: parseFloat(get('WSD')),
        precipitation: parseFloat(get('RN1')),
        precipitationType: pty,
        weatherDescription: this.getPtyDescription(pty),
        baseDate,
        baseTime,
        ...airData,
      };

      await this.redisService.set(cacheKey, result, WEATHER_CACHE_TTL);
      return result;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const detail = error?.response?.data ?? error?.message;
      this.logger.error(
        `날씨 API 호출 실패 [${status}]: ${JSON.stringify(detail)}`,
      );
      throw new BadGatewayException('날씨 정보를 가져오는데 실패했습니다');
    }
  }

  async getForecast(query: WeatherQueryDto): Promise<ForecastResponseDto> {
    const { nx, ny } = toGrid(query.lat, query.lon);
    const { baseDate, baseTime } = getForecastBaseTime(dayjs());

    const cacheKey = `forecast:${nx}:${ny}:${baseDate}:${baseTime}`;
    const cached = await this.redisService.get<ForecastResponseDto>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<KmaResponse<KmaFcstItem>>(this.fcstUrl, {
          params: {
            serviceKey: this.serviceKey,
            pageNo: 1,
            numOfRows: 1000,
            dataType: 'JSON',
            base_date: baseDate,
            base_time: baseTime,
            nx,
            ny,
          },
        }),
      );

      const header = data.response.header;
      if (header.resultCode !== '00') {
        this.logger.error(`기상청 단기예보 API 오류: ${header.resultMsg}`);
        throw new BadGatewayException('날씨 예보를 가져오는데 실패했습니다');
      }

      const items = data.response.body.items.item;
      const forecasts = this.parseForecastItems(items);

      const result: ForecastResponseDto = { baseDate, baseTime, forecasts };
      await this.redisService.set(cacheKey, result, FORECAST_CACHE_TTL);
      return result;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const detail = error?.response?.data ?? error?.message;
      this.logger.error(
        `단기예보 API 호출 실패 [${status}]: ${JSON.stringify(detail)}`,
      );
      throw new BadGatewayException('날씨 예보를 가져오는데 실패했습니다');
    }
  }

  private parseForecastItems(items: KmaFcstItem[]): ForecastItemDto[] {
    // 날짜+시각 기준으로 그룹화
    const grouped = new Map<string, Map<string, string>>();

    for (const item of items) {
      const key = `${item.fcstDate}_${item.fcstTime}`;
      if (!grouped.has(key)) grouped.set(key, new Map());
      grouped.get(key).set(item.category, item.fcstValue);
    }

    // 날짜별 최저/최고 기온 계산
    const dailyTemp = new Map<string, { min: number; max: number }>();
    for (const [key, values] of grouped) {
      const date = key.split('_')[0];
      const tmp = parseFloat(values.get('TMP') ?? '0');
      if (!dailyTemp.has(date)) {
        dailyTemp.set(date, { min: tmp, max: tmp });
      } else {
        const d = dailyTemp.get(date);
        d.min = Math.min(d.min, tmp);
        d.max = Math.max(d.max, tmp);
      }
    }

    const result: ForecastItemDto[] = [];

    for (const [key, values] of grouped) {
      const [fcstDate, fcstTime] = key.split('_');
      const get = (cat: string) => values.get(cat) ?? '0';
      const sky = parseInt(get('SKY'));
      const pty = parseInt(get('PTY'));
      const daily = dailyTemp.get(fcstDate);

      result.push({
        fcstDate,
        fcstTime,
        temperature: parseFloat(get('TMP')),
        minTemperature: daily?.min ?? null,
        maxTemperature: daily?.max ?? null,
        precipitationProbability: parseInt(get('POP')),
        precipitation: parseFloat(get('PCP') === '강수없음' ? '0' : get('PCP')),
        humidity: parseInt(get('REH')),
        windSpeed: parseFloat(get('WSD')),
        sky,
        precipitationType: pty,
        weatherDescription: this.getWeatherDescription(sky, pty),
      });
    }

    // 시간 순 정렬
    return result.sort((a, b) => {
      const aKey = a.fcstDate + a.fcstTime;
      const bKey = b.fcstDate + b.fcstTime;
      return aKey.localeCompare(bKey);
    });
  }

  private async getAirQuality(
    lat: number,
    lon: number,
  ): Promise<{
    pm10: number | null;
    pm25: number | null;
    pm10Grade: number | null;
    pm25Grade: number | null;
  }> {
    if (!this.serviceKey) {
      return { pm10: null, pm25: null, pm10Grade: null, pm25Grade: null };
    }

    const cacheKey = `air:${Math.round(lat * 10) / 10}:${Math.round(lon * 10) / 10}`;
    const cached = await this.redisService.get<{
      pm10: number | null;
      pm25: number | null;
      pm10Grade: number | null;
      pm25Grade: number | null;
    }>(cacheKey);
    if (cached) return cached;

    try {
      // 1단계: 가장 가까운 측정소 조회
      const { data: stationData } = await firstValueFrom(
        this.httpService.get<AirKoreaResponse<AirStationItem>>(
          this.airStationUrl,
          {
            params: {
              serviceKey: this.serviceKey,
              returnType: 'json',
              tmX: lon,
              tmY: lat,
              ver: '1.1',
            },
          },
        ),
      );

      const stations = stationData.response.body.items;
      if (!stations?.length) {
        return { pm10: null, pm25: null, pm10Grade: null, pm25Grade: null };
      }
      const stationName = stations[0].stationName;

      // 2단계: 해당 측정소 실시간 미세먼지 조회
      const { data: measureData } = await firstValueFrom(
        this.httpService.get<AirKoreaResponse<AirMeasureItem>>(
          this.airMeasureUrl,
          {
            params: {
              serviceKey: this.serviceKey,
              returnType: 'json',
              stationName,
              dataTerm: 'DAILY',
              pageNo: 1,
              numOfRows: 1,
              ver: '1.0',
            },
          },
        ),
      );

      const measure = measureData.response.body.items?.[0];
      if (!measure) {
        return { pm10: null, pm25: null, pm10Grade: null, pm25Grade: null };
      }

      const result = {
        pm10: measure.pm10Value !== '-' ? parseInt(measure.pm10Value) : null,
        pm25: measure.pm25Value !== '-' ? parseInt(measure.pm25Value) : null,
        pm10Grade:
          measure.pm10Grade !== '-' ? parseInt(measure.pm10Grade) : null,
        pm25Grade:
          measure.pm25Grade !== '-' ? parseInt(measure.pm25Grade) : null,
      };

      await this.redisService.set(cacheKey, result, AIR_CACHE_TTL);
      return result;
    } catch (error) {
      this.logger.warn(`미세먼지 API 호출 실패: ${error?.message}`);
      return { pm10: null, pm25: null, pm10Grade: null, pm25Grade: null };
    }
  }

  // 초단기실황용 (PTY만 존재)
  private getPtyDescription(pty: number): string {
    if (pty === 1) return '비';
    if (pty === 2) return '진눈깨비';
    if (pty === 3) return '눈';
    if (pty === 4) return '소나기';
    return '맑음';
  }

  // 단기예보용 (SKY + PTY 조합)
  private getWeatherDescription(sky: number, pty: number): string {
    if (pty === 1) return '비';
    if (pty === 2) return '진눈깨비';
    if (pty === 3) return '눈';
    if (pty === 4) return '소나기';
    if (sky === 1) return '맑음';
    if (sky === 3) return '구름많음';
    if (sky === 4) return '흐림';
    return '알 수 없음';
  }
}
