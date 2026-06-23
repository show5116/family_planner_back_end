import { HttpService } from '@nestjs/axios';
import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService, I18nContext } from 'nestjs-i18n';
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

export const FORECAST_CACHE_KEY = (sido: string) => `forecast:${sido}`;
export { FORECAST_CACHE_TTL };

interface WeatherRawCache {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationType: number;
  baseDate: string;
  baseTime: string;
  sidoKey: string | null;
  pm10: number | null;
  pm25: number | null;
  pm10Grade: number | null;
  pm25Grade: number | null;
}

interface ForecastRawItemCache {
  fcstDate: string;
  fcstTime: string;
  temperature: number;
  minTemperature: number | null;
  maxTemperature: number | null;
  precipitationProbability: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  sky: number;
  precipitationType: number;
}

export interface ForecastRawCache {
  baseDate: string;
  baseTime: string;
  forecasts: ForecastRawItemCache[];
}

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

// 위경도 범위 기반 시도 키 매핑 (좁은 범위 광역시를 도(道)보다 먼저 체크)
function getSidoKey(lat: number, lon: number): string {
  // 광역시/특별시/특별자치시 (좁은 범위) 먼저
  if (lat >= 37.43 && lat <= 37.7 && lon >= 126.76 && lon <= 127.18)
    return 'seoul';
  if (lat >= 37.15 && lat <= 37.81 && lon >= 126.2 && lon <= 126.78)
    return 'incheon';
  if (lat >= 36.26 && lat <= 36.65 && lon >= 127.18 && lon <= 127.5)
    return 'sejong';
  if (lat >= 36.2 && lat <= 36.5 && lon >= 127.29 && lon <= 127.51)
    return 'daejeon';
  if (lat >= 35.78 && lat <= 36.03 && lon >= 128.4 && lon <= 128.76)
    return 'daegu';
  if (lat >= 35.46 && lat <= 35.78 && lon >= 128.97 && lon <= 129.46)
    return 'ulsan';
  if (lat >= 34.88 && lat <= 35.4 && lon >= 128.74 && lon <= 129.33)
    return 'busan';
  if (lat >= 35.08 && lat <= 35.25 && lon >= 126.72 && lon <= 126.96)
    return 'gwangju';
  // 도(道) (넓은 범위) 나중에
  if (lat >= 36.93 && lat <= 38.3 && lon >= 126.32 && lon <= 127.86)
    return 'gyeonggi';
  if (lat >= 37.0 && lat <= 38.62 && lon >= 127.19 && lon <= 129.37)
    return 'gangwon';
  if (lat >= 36.06 && lat <= 37.18 && lon >= 127.4 && lon <= 128.52)
    return 'chungbuk';
  if (lat >= 35.9 && lat <= 37.07 && lon >= 125.91 && lon <= 127.55)
    return 'chungnam';
  if (lat >= 35.4 && lat <= 36.15 && lon >= 126.35 && lon <= 127.83)
    return 'jeonbuk';
  if (lat >= 34.06 && lat <= 35.52 && lon >= 125.58 && lon <= 127.62)
    return 'jeonnam';
  if (lat >= 35.57 && lat <= 37.22 && lon >= 127.98 && lon <= 129.57)
    return 'gyeongbuk';
  if (lat >= 34.67 && lat <= 35.81 && lon >= 127.55 && lon <= 129.46)
    return 'gyeongnam';
  if (lat >= 33.11 && lat <= 33.56 && lon >= 126.15 && lon <= 126.96)
    return 'jeju';
  return 'seoul'; // fallback
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
  private readonly airMeasureUrl =
    'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService,
  ) {
    this.serviceKey = this.configService.get<string>('weather.kmaServiceKey');
  }

  async getWeather(query: WeatherQueryDto): Promise<WeatherResponseDto> {
    const lang = I18nContext.current()?.lang ?? 'ko';
    const sido = getSidoKey(query.lat, query.lon);

    const cacheKey = `weather:${sido}`;
    const cached = await this.redisService.get<WeatherRawCache>(cacheKey);
    if (cached) return this.translateWeatherCache(cached, lang);

    // 기상청 초단기실황: 매시 정각 발표, 약 10분 후 제공 → 안전하게 1시간 전 기준
    const now = dayjs().subtract(1, 'hour');
    const baseDate = now.format('YYYYMMDD');
    const baseTime = now.format('HH00');
    const { nx, ny } = toGrid(query.lat, query.lon);

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
        throw new BadGatewayException('weather.errors.fetch_failed');
      }

      const items = data.response.body.items.item;
      const get = (category: string) =>
        items.find((i) => i.category === category)?.obsrValue ?? '0';

      const pty = parseInt(get('PTY'));
      const airData = await this.getAirQuality(query.lat, query.lon);

      const raw: WeatherRawCache = {
        temperature: parseFloat(get('T1H')),
        humidity: parseInt(get('REH')),
        windSpeed: parseFloat(get('WSD')),
        precipitation: parseFloat(get('RN1')),
        precipitationType: pty,
        baseDate,
        baseTime,
        ...airData,
        sidoKey: sido,
      };

      await this.redisService.set(cacheKey, raw, WEATHER_CACHE_TTL);
      await this.redisService.set(`weather:stale:${sido}`, raw);
      return this.translateWeatherCache(raw, lang);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const detail = error?.response?.data ?? error?.message;
      this.logger.error(
        `날씨 API 호출 실패 [${status}]: ${JSON.stringify(detail)}`,
      );
      const stale = await this.redisService.get<WeatherRawCache>(
        `weather:stale:${sido}`,
      );
      if (stale) {
        this.logger.warn(`날씨 API 실패 — stale 캐시 반환 (${sido})`);
        return this.translateWeatherCache(stale, lang);
      }
      throw new BadGatewayException('weather.errors.fetch_failed');
    }
  }

  async getForecast(query: WeatherQueryDto): Promise<ForecastResponseDto> {
    const lang = I18nContext.current()?.lang ?? 'ko';
    const sido = getSidoKey(query.lat, query.lon);

    const cacheKey = FORECAST_CACHE_KEY(sido);
    const cached = await this.redisService.get<ForecastRawCache>(cacheKey);
    if (cached) return this.translateForecastCache(cached, lang);

    const { baseDate, baseTime } = getForecastBaseTime(dayjs());
    const { nx, ny } = toGrid(query.lat, query.lon);

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
        throw new BadGatewayException('weather.errors.forecast_failed');
      }

      const items = data.response.body.items.item;
      const raw: ForecastRawCache = {
        baseDate,
        baseTime,
        forecasts: this.parseForecastItemsRaw(items),
      };

      await this.redisService.set(cacheKey, raw, FORECAST_CACHE_TTL);
      await this.redisService.set(`forecast:stale:${sido}`, raw);
      return this.translateForecastCache(raw, lang);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const detail = error?.response?.data ?? error?.message;
      this.logger.error(
        `단기예보 API 호출 실패 [${status}]: ${JSON.stringify(detail)}`,
      );
      const stale = await this.redisService.get<ForecastRawCache>(
        `forecast:stale:${sido}`,
      );
      if (stale) {
        this.logger.warn(`단기예보 API 실패 — stale 캐시 반환 (${sido})`);
        return this.translateForecastCache(stale, lang);
      }
      throw new BadGatewayException('weather.errors.forecast_failed');
    }
  }

  private translateWeatherCache(
    raw: WeatherRawCache,
    lang: string,
  ): WeatherResponseDto {
    return {
      temperature: raw.temperature,
      humidity: raw.humidity,
      windSpeed: raw.windSpeed,
      precipitation: raw.precipitation,
      precipitationType: raw.precipitationType,
      weatherDescription: this.getPtyDescription(raw.precipitationType, lang),
      baseDate: raw.baseDate,
      baseTime: raw.baseTime,
      pm10: raw.pm10,
      pm25: raw.pm25,
      pm10Grade: raw.pm10Grade,
      pm25Grade: raw.pm25Grade,
      sidoName: raw.sidoKey
        ? this.i18n.t(`weather.sido.${raw.sidoKey}`, { lang })
        : null,
    };
  }

  private translateForecastCache(
    raw: ForecastRawCache,
    lang: string,
  ): ForecastResponseDto {
    return {
      baseDate: raw.baseDate,
      baseTime: raw.baseTime,
      forecasts: raw.forecasts.map((item) => ({
        ...item,
        weatherDescription: this.getWeatherDescription(
          item.sky,
          item.precipitationType,
          lang,
        ),
      })),
    };
  }

  private parseForecastItemsRaw(items: KmaFcstItem[]): ForecastRawItemCache[] {
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

    const result: ForecastRawItemCache[] = [];

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
    sidoKey: string | null;
  }> {
    if (!this.serviceKey) {
      return {
        pm10: null,
        pm25: null,
        pm10Grade: null,
        pm25Grade: null,
        sidoKey: null,
      };
    }

    const sidoKey = getSidoKey(lat, lon);
    // 에어코리아 API는 한국어 시도명으로 쿼리해야 함
    const sidoNameKo = this.i18n.t(`weather.sido.${sidoKey}`, { lang: 'ko' });

    const cacheKey = `air:${sidoKey}`;
    const cached = await this.redisService.get<{
      pm10: number | null;
      pm25: number | null;
      pm10Grade: number | null;
      pm25Grade: number | null;
      sidoKey: string | null;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const { data: measureData } = await firstValueFrom(
        this.httpService.get<AirKoreaResponse<AirMeasureItem>>(
          this.airMeasureUrl,
          {
            params: {
              serviceKey: this.serviceKey,
              returnType: 'json',
              sidoName: sidoNameKo,
              pageNo: 1,
              numOfRows: 1,
              ver: '1.0',
            },
          },
        ),
      );

      const measure = measureData.response.body.items?.[0];
      if (!measure) {
        return {
          pm10: null,
          pm25: null,
          pm10Grade: null,
          pm25Grade: null,
          sidoKey: null,
        };
      }

      const result = {
        pm10: measure.pm10Value !== '-' ? parseInt(measure.pm10Value) : null,
        pm25: measure.pm25Value !== '-' ? parseInt(measure.pm25Value) : null,
        pm10Grade:
          measure.pm10Grade !== '-' ? parseInt(measure.pm10Grade) : null,
        pm25Grade:
          measure.pm25Grade !== '-' ? parseInt(measure.pm25Grade) : null,
        sidoKey,
      };

      await this.redisService.set(cacheKey, result, AIR_CACHE_TTL);
      await this.redisService.set(`air:stale:${sidoKey}`, result);
      return result;
    } catch (error) {
      this.logger.warn(`미세먼지 API 호출 실패: ${error?.message}`);
      const stale = await this.redisService.get<{
        pm10: number | null;
        pm25: number | null;
        pm10Grade: number | null;
        pm25Grade: number | null;
        sidoKey: string | null;
      }>(`air:stale:${sidoKey}`);
      if (stale) {
        this.logger.warn(`미세먼지 API 실패 — stale 캐시 반환 (${sidoKey})`);
        return stale;
      }
      return {
        pm10: null,
        pm25: null,
        pm10Grade: null,
        pm25Grade: null,
        sidoKey: null,
      };
    }
  }

  // 초단기실황용 (PTY만 존재)
  private getPtyDescription(pty: number, lang: string): string {
    if (pty === 1) return this.i18n.t('weather.description.rain', { lang });
    if (pty === 2) return this.i18n.t('weather.description.sleet', { lang });
    if (pty === 3) return this.i18n.t('weather.description.snow', { lang });
    if (pty === 4) return this.i18n.t('weather.description.shower', { lang });
    return this.i18n.t('weather.description.clear', { lang });
  }

  // 단기예보용 (SKY + PTY 조합)
  private getWeatherDescription(
    sky: number,
    pty: number,
    lang: string,
  ): string {
    if (pty === 1) return this.i18n.t('weather.description.rain', { lang });
    if (pty === 2) return this.i18n.t('weather.description.sleet', { lang });
    if (pty === 3) return this.i18n.t('weather.description.snow', { lang });
    if (pty === 4) return this.i18n.t('weather.description.shower', { lang });
    if (sky === 1) return this.i18n.t('weather.description.clear', { lang });
    if (sky === 3) return this.i18n.t('weather.description.cloudy', { lang });
    if (sky === 4) return this.i18n.t('weather.description.overcast', { lang });
    return this.i18n.t('weather.description.unknown', { lang });
  }
}
