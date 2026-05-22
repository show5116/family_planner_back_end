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

    // 2. 유저를 격자(nx, ny) 단위로 그룹핑
    const gridMap = new Map<string, string[]>();
    for (const s of settings) {
      const { lastLat, lastLon } = s.user;
      const { nx, ny } = toGrid(lastLat, lastLon);
      const gridKey = `${nx}_${ny}`;
      if (!gridMap.has(gridKey)) gridMap.set(gridKey, []);
      gridMap.get(gridKey).push(s.userId);
    }

    this.logger.log(`[WeatherAlert] 격자 ${gridMap.size}개로 그룹핑`);

    const today = dayjs().tz('Asia/Seoul').format('YYYYMMDD');

    // 3. 격자별 처리
    for (const [gridKey, userIds] of gridMap) {
      try {
        const [nxStr, nyStr] = gridKey.split('_');
        const nx = parseInt(nxStr);
        const ny = parseInt(nyStr);

        const forecast = await this.getForecastForGrid(nx, ny, today);
        if (!forecast) continue;

        // 4. 전날 기온과 비교해 온도 변화 판단
        const prevTempKey = `weather_temp:${gridKey}:${dayjs().tz('Asia/Seoul').subtract(1, 'day').format('YYYYMMDD')}`;
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
          const todayTempKey = `weather_temp:${gridKey}:${today}`;
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
            `[WeatherAlert] 격자 ${gridKey} — 알림 조건 미충족, 스킵`,
          );
          continue;
        }

        // 7. 해당 격자 유저 전체에 FCM 발송 (개인별 언어)
        this.logger.log(
          `[WeatherAlert] 격자 ${gridKey} → ${userIds.length}명 발송`,
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
          `[WeatherAlert] 격자 ${gridKey} 처리 실패: ${err.message}`,
        );
      }
    }

    this.logger.log(`[WeatherAlert] ${currentHour}시 크론잡 완료`);
  }

  /**
   * 격자별 단기예보 조회 (Redis 캐시 우선, 없으면 API 호출)
   */
  private async getForecastForGrid(
    nx: number,
    ny: number,
    today: string,
  ): Promise<GridForecast | null> {
    const { baseDate, baseTime } = getForecastBaseTime(dayjs());
    const cacheKey = `weather_alert_fcst:${nx}:${ny}:${baseDate}:${baseTime}`;

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

    for (const item of todayItems) {
      if (item.category === 'PTY') {
        const pty = parseInt(item.fcstValue);
        if (pty > 0) {
          hasPrecipitation = true;
          if (precipType === 0) precipType = pty;
        }
      }
      if (item.category === 'TMP') {
        const tmp = parseFloat(item.fcstValue);
        if (todayMinTemp === null || tmp < todayMinTemp) todayMinTemp = tmp;
        if (todayMaxTemp === null || tmp > todayMaxTemp) todayMaxTemp = tmp;
      }
    }

    return { hasPrecipitation, todayMinTemp, todayMaxTemp, precipType };
  }

  private getPtyDescription(pty: number, lang: string): string {
    if (pty === 1) return this.i18n.t('weather.description.rain', { lang });
    if (pty === 2) return this.i18n.t('weather.description.sleet', { lang });
    if (pty === 3) return this.i18n.t('weather.description.snow', { lang });
    if (pty === 4) return this.i18n.t('weather.description.shower', { lang });
    return '';
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
      parts.push(
        this.i18n.t('weather.notification.precipitation_alert', {
          lang,
          args: { desc, icon },
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
