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
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceKey = this.configService.get<string>('weather.kmaServiceKey');
  }

  async getWeather(query: WeatherQueryDto): Promise<WeatherResponseDto> {
    const { nx, ny } = toGrid(query.lat, query.lon);

    // 기상청 초단기실황: 매시 정각 발표, 약 10분 후 제공 → 안전하게 1시간 전 기준
    const now = dayjs().subtract(1, 'hour');
    const baseDate = now.format('YYYYMMDD');
    const baseTime = now.format('HH00');

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

      const sky = parseInt(get('SKY'));
      const pty = parseInt(get('PTY'));

      return {
        temperature: parseFloat(get('T1H')),
        humidity: parseInt(get('REH')),
        windSpeed: parseFloat(get('WSD')),
        precipitation: parseFloat(get('RN1')),
        sky,
        precipitationType: pty,
        weatherDescription: this.getWeatherDescription(sky, pty),
        baseDate,
        baseTime,
      };
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

      return { baseDate, baseTime, forecasts };
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
