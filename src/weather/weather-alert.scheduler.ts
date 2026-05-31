import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationQueueService } from '@/notification/notification-queue.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';

// 위경도 → 기상청 격자 변환 (weather.service.ts와 동일한 LCC 상수)
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

function getSidoKey(lat: number, lon: number): string {
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
  return 'seoul';
}

// 단기예보 base_time 선택 (weather.service.ts와 동일)
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
  const target = now.subtract(10, 'minute');
  const currentHHmm = target.format('HHmm');
  for (const t of FCST_BASE_TIMES) {
    if (currentHHmm >= t) {
      return { baseDate: target.format('YYYYMMDD'), baseTime: t };
    }
  }
  return {
    baseDate: target.subtract(1, 'day').format('YYYYMMDD'),
    baseTime: '2300',
  };
}

interface KmaFcstItem {
  fcstDate: string;
  fcstTime: string;
  category: string;
  fcstValue: string;
}

interface ForecastSummary {
  hasPrecipitation: boolean;
  todayMinTemp: number | null;
  todayMaxTemp: number | null;
  precipType: number;
  precipStartTime: string | null; // 'HHmm' 형식, 강수 첫 예보 시각
  precipEndTime: string | null; // 'HHmm' 형식, 강수 마지막 예보 시각
}

interface GridForecast {
  summary: ForecastSummary;
  baseDate: string;
}

@Injectable()
export class WeatherAlertScheduler {
  private readonly logger = new Logger(WeatherAlertScheduler.name);
  private readonly fcstUrl =
    'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
  private readonly serviceKey: string;

  // 전날 기온 캐시 키 (격자별, 날짜별) — TTL 48시간
  private readonly PREV_TEMP_TTL = 48 * 60 * 60;
  // 크론잡 격자 예보 캐시 TTL: 1시간
  private readonly ALERT_FORECAST_TTL = 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly i18n: I18nService,
  ) {
    this.serviceKey = this.configService.get<string>('weather.kmaServiceKey');
  }

  private async getUserLang(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    return user?.language ?? 'ko';
  }

  /**
   * 매 정시 실행 — 날씨 알림 크론잡
   */
  @Cron('0 * * * *', { timeZone: 'Asia/Seoul' })
  async sendWeatherAlerts() {
    if (!isSchedulerEnabled('')) return;
    const currentHour = dayjs().tz('Asia/Seoul').hour();
    this.logger.log(`[WeatherAlert] ${currentHour}시 크론잡 시작`);

    // 1. 현재 hour에 알림 설정된 유저 조회 (lastLat/lastLon이 있는 유저만)
    const settings = await this.prisma.notificationSetting.findMany({
      where: {
        category: 'WEATHER' as any,
        enabled: true,
        weatherAlertHour: currentHour,
        user: {
          lastLat: { not: null },
          lastLon: { not: null },
          deviceTokens: { some: {} },
        },
      },
      select: {
        userId: true,
        user: {
          select: { lastLat: true, lastLon: true },
        },
      },
    });

    if (settings.length === 0) {
      this.logger.log(`[WeatherAlert] ${currentHour}시에 처리할 유저 없음`);
      return;
    }

    this.logger.log(`[WeatherAlert] 대상 유저 ${settings.length}명`);

    // 2. 유저를 시도 단위로 그룹핑
    const sidoMap = new Map<
      string,
      { userIds: string[]; nx: number; ny: number }
    >();
    for (const s of settings) {
      const { lastLat, lastLon } = s.user;
      const sido = getSidoKey(lastLat, lastLon);
      if (!sidoMap.has(sido)) {
        const { nx, ny } = toGrid(lastLat, lastLon);
        sidoMap.set(sido, { userIds: [], nx, ny });
      }
      sidoMap.get(sido).userIds.push(s.userId);
    }

    this.logger.log(`[WeatherAlert] 시도 ${sidoMap.size}개로 그룹핑`);

    const today = dayjs().tz('Asia/Seoul').format('YYYYMMDD');

    // 3. 시도별 처리
    for (const [sido, { userIds, nx, ny }] of sidoMap) {
      try {
        const forecast = await this.getForecastForGrid(sido, nx, ny, today);
        if (!forecast) continue;

        // 4. 전날 기온과 비교해 온도 변화 판단
        const prevTempKey = `weather_temp:${sido}:${dayjs().tz('Asia/Seoul').subtract(1, 'day').format('YYYYMMDD')}`;
        const prevTemp = await this.redisService.get<{
          min: number;
          max: number;
        }>(prevTempKey);

        let tempChangedMin: number | null = null;
        let tempChangedMax: number | null = null;

        if (
          prevTemp &&
          forecast.summary.todayMinTemp !== null &&
          forecast.summary.todayMaxTemp !== null
        ) {
          const minDiff = forecast.summary.todayMinTemp - prevTemp.min;
          const maxDiff = forecast.summary.todayMaxTemp - prevTemp.max;
          if (Math.abs(minDiff) >= 5) tempChangedMin = minDiff;
          if (Math.abs(maxDiff) >= 5) tempChangedMax = maxDiff;
        }

        // 5. 오늘 기온을 Redis에 저장 (내일 비교용)
        if (
          forecast.summary.todayMinTemp !== null &&
          forecast.summary.todayMaxTemp !== null
        ) {
          const todayTempKey = `weather_temp:${sido}:${today}`;
          await this.redisService.set(
            todayTempKey,
            {
              min: forecast.summary.todayMinTemp,
              max: forecast.summary.todayMaxTemp,
            },
            this.PREV_TEMP_TTL,
          );
        }

        // 6. 알림 조건 확인
        const shouldAlert =
          forecast.summary.hasPrecipitation ||
          tempChangedMin !== null ||
          tempChangedMax !== null;
        if (!shouldAlert) {
          this.logger.debug(
            `[WeatherAlert] 시도 ${sido} — 알림 조건 미충족, 스킵`,
          );
          continue;
        }

        // 7. 해당 시도 유저 전체에 FCM 발송 (개인별 언어)
        this.logger.log(
          `[WeatherAlert] 시도 ${sido} → ${userIds.length}명 발송`,
        );
        for (const userId of userIds) {
          const lang = await this.getUserLang(userId);
          const { title, body } = this.buildAlertMessage(
            forecast.summary,
            tempChangedMin,
            tempChangedMax,
            lang,
          );
          await this.notificationQueue.enqueueImmediate({
            userId,
            category: NotificationCategory.WEATHER,
            title,
            body,
            data: { action: 'view_weather' },
          });
        }
      } catch (err) {
        this.logger.error(
          `[WeatherAlert] 시도 ${sido} 처리 실패: ${err.message}`,
        );
      }
    }

    this.logger.log(`[WeatherAlert] ${currentHour}시 크론잡 완료`);
  }

  /**
   * 격자별 단기예보 조회 (Redis 캐시 우선, 없으면 API 호출)
   */
  private async getForecastForGrid(
    sido: string,
    nx: number,
    ny: number,
    today: string,
  ): Promise<GridForecast | null> {
    const { baseDate, baseTime } = getForecastBaseTime(dayjs());
    const cacheKey = `weather_alert_fcst:${sido}`;

    const cached = await this.redisService.get<GridForecast>(cacheKey);
    if (cached) {
      this.logger.debug(`[WeatherAlert] 격자 ${nx}_${ny} 캐시 히트`);
      return cached;
    }

    if (!this.serviceKey) {
      this.logger.warn('[WeatherAlert] KMA serviceKey가 설정되지 않음');
      return null;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(this.fcstUrl, {
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

      const header = data?.response?.header;
      if (!header || header.resultCode !== '00') {
        this.logger.error(`[WeatherAlert] KMA API 오류: ${header?.resultMsg}`);
        return null;
      }

      const items: KmaFcstItem[] = data.response.body.items.item;
      const summary = this.parseForecastSummary(items, today);

      const result: GridForecast = { summary, baseDate };
      await this.redisService.set(cacheKey, result, this.ALERT_FORECAST_TTL);
      return result;
    } catch (err) {
      this.logger.error(
        `[WeatherAlert] KMA API 호출 실패 (${nx},${ny}): ${err.message}`,
      );
      return null;
    }
  }

  /**
   * 오늘 날짜 예보 항목에서 강수 여부와 최고/최저 기온 추출
   */
  private parseForecastSummary(
    items: KmaFcstItem[],
    today: string,
  ): ForecastSummary {
    const todayItems = items.filter((i) => i.fcstDate === today);

    let hasPrecipitation = false;
    let precipType = 0;
    let todayMinTemp: number | null = null;
    let todayMaxTemp: number | null = null;
    let precipStartTime: string | null = null;
    let precipEndTime: string | null = null;

    for (const item of todayItems) {
      if (item.category === 'PTY') {
        const pty = parseInt(item.fcstValue);
        if (pty > 0) {
          hasPrecipitation = true;
          if (precipType === 0) precipType = pty;
          if (precipStartTime === null || item.fcstTime < precipStartTime)
            precipStartTime = item.fcstTime;
          if (precipEndTime === null || item.fcstTime > precipEndTime)
            precipEndTime = item.fcstTime;
        }
      }
      if (item.category === 'TMP') {
        const tmp = parseFloat(item.fcstValue);
        if (todayMinTemp === null || tmp < todayMinTemp) todayMinTemp = tmp;
        if (todayMaxTemp === null || tmp > todayMaxTemp) todayMaxTemp = tmp;
      }
    }

    return {
      hasPrecipitation,
      todayMinTemp,
      todayMaxTemp,
      precipType,
      precipStartTime,
      precipEndTime,
    };
  }

  private getPtyDescription(pty: number, lang: string): string {
    if (pty === 1) return this.i18n.t('weather.description.rain', { lang });
    if (pty === 2) return this.i18n.t('weather.description.sleet', { lang });
    if (pty === 3) return this.i18n.t('weather.description.snow', { lang });
    if (pty === 4) return this.i18n.t('weather.description.shower', { lang });
    return '';
  }

  private formatHour(hhmm: string, lang: string): string {
    const h = parseInt(hhmm.substring(0, 2), 10);
    if (lang === 'ko') {
      const period = h < 12 ? '오전' : '오후';
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${period} ${display}시`;
    }
    if (lang === 'ja') {
      const period = h < 12 ? '午前' : '午後';
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${period}${display}時`;
    }
    if (lang === 'zh') {
      const period = h < 12 ? '上午' : '下午';
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${period}${display}时`;
    }
    // en
    const period = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${period}`;
  }

  private formatPrecipTimeRange(
    startTime: string,
    endTime: string,
    lang: string,
  ): string {
    const start = this.formatHour(startTime, lang);
    const end = this.formatHour(endTime, lang);
    if (start === end) return start;
    if (lang === 'ko') return `${start} ~ ${end}`;
    if (lang === 'ja') return `${start}〜${end}`;
    if (lang === 'zh') return `${start} ~ ${end}`;
    return `${start} – ${end}`;
  }

  /**
   * 알림 제목/본문 조합
   */
  private buildAlertMessage(
    summary: ForecastSummary,
    tempChangedMin: number | null,
    tempChangedMax: number | null,
    lang: string,
  ): { title: string; body: string } {
    const parts: string[] = [];

    if (summary.hasPrecipitation) {
      const desc = this.getPtyDescription(summary.precipType, lang);
      const icon =
        summary.precipType === 3
          ? this.i18n.t('weather.notification.snow_icon', { lang })
          : this.i18n.t('weather.notification.rain_icon', { lang });
      const timeRange =
        summary.precipStartTime && summary.precipEndTime
          ? this.formatPrecipTimeRange(
              summary.precipStartTime,
              summary.precipEndTime,
              lang,
            )
          : null;
      const key = timeRange
        ? 'weather.notification.precipitation_alert_with_time'
        : 'weather.notification.precipitation_alert';
      parts.push(
        this.i18n.t(key, {
          lang,
          args: { desc, icon, timeRange },
        }),
      );
    }

    const tempDiff = tempChangedMax ?? tempChangedMin;
    if (tempDiff !== null) {
      const sign = tempDiff > 0 ? '+' : '';
      const tempRef =
        tempChangedMax !== null ? summary.todayMaxTemp : summary.todayMinTemp;
      const label =
        tempChangedMax !== null
          ? this.i18n.t('weather.notification.temp_label_max', { lang })
          : this.i18n.t('weather.notification.temp_label_min', { lang });
      parts.push(
        this.i18n.t('weather.notification.temp_change_alert', {
          lang,
          args: { sign, diff: Math.abs(tempDiff), label, temp: tempRef },
        }),
      );
    }

    return {
      title: this.i18n.t('weather.notification.alert_title', { lang }),
      body: parts.join(' · '),
    };
  }
}
