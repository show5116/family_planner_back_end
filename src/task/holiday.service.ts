import { HttpService } from '@nestjs/axios';
import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '@/redis/redis.service';
import { HolidayQueryDto } from '@/task/dto/holiday-query.dto';
import {
  HolidayDto,
  HolidayListDto,
  SpecialDayDto,
} from '@/task/dto/holiday-response.dto';

// 공휴일 캐시 TTL: 30일 (공휴일 데이터는 거의 변경되지 않음)
const HOLIDAY_CACHE_TTL = 60 * 60 * 24 * 30;

// 매년 반복되는 특별한 날 (휴일 아님 — 기념일/이벤트)
// MM-DD 형식
const SPECIAL_DAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 14, name: '다이어리 데이' },
  { month: 2, day: 14, name: '발렌타인 데이' },
  { month: 3, day: 14, name: '화이트 데이' },
  { month: 4, day: 14, name: '블랙 데이' },
  { month: 5, day: 8, name: '어버이날' },
  { month: 5, day: 15, name: '스승의 날' },
  { month: 6, day: 5, name: '환경의 날' },
  { month: 6, day: 14, name: '로즈 데이' },
  { month: 7, day: 14, name: '실버 데이' },
  { month: 8, day: 14, name: '그린 데이' },
  { month: 10, day: 1, name: '국군의 날' },
  { month: 10, day: 14, name: '와인 데이' },
  { month: 11, day: 11, name: '빼빼로 데이' },
  { month: 11, day: 14, name: '무비 데이' },
  { month: 12, day: 14, name: '허그 데이' },
  { month: 12, day: 24, name: '크리스마스 이브' },
];

interface HolidayItem {
  dateKind: string;
  dateName: string;
  isHoliday: string;
  locdate: number;
  seq: number;
}

interface HolidayApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: HolidayItem | HolidayItem[] } | '';
      totalCount: number;
    };
  };
}

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);
  private readonly apiUrl =
    'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo';
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.serviceKey = this.configService.get<string>('weather.kmaServiceKey');
  }

  /**
   * 특정 연/월의 공휴일 목록 조회
   */
  async getHolidays(query: HolidayQueryDto): Promise<HolidayListDto> {
    const { year, month } = query;
    const cacheKey = `holidays:${year}:${month}`;

    const cached = await this.redisService.get<HolidayListDto>(cacheKey);
    if (cached) return cached;

    const solMonth = String(month).padStart(2, '0');

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<HolidayApiResponse>(this.apiUrl, {
          params: {
            serviceKey: this.serviceKey,
            pageNo: 1,
            numOfRows: 50,
            solYear: year,
            solMonth,
            _type: 'json',
          },
        }),
      );

      const header = data.response.header;
      if (header.resultCode !== '00') {
        this.logger.error(`공휴일 API 오류: ${header.resultMsg}`);
        throw new BadGatewayException('공휴일 정보를 가져오는데 실패했습니다');
      }

      const body = data.response.body;
      const holidays: HolidayDto[] = [];

      if (body.totalCount > 0 && body.items !== '') {
        // 단일 항목이면 배열로 감싸기
        const items = Array.isArray(body.items.item)
          ? body.items.item
          : [body.items.item];

        for (const item of items) {
          // isHoliday === 'Y'인 항목만 (공휴일로 지정된 날)
          if (item.isHoliday !== 'Y') continue;

          const dateStr = String(item.locdate);
          const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

          holidays.push({
            date,
            name: item.dateName,
            isSubstitute: item.dateName.includes('대체'),
          });
        }
      }

      const specialDays: SpecialDayDto[] = SPECIAL_DAYS.filter(
        (s) => s.month === month,
      ).map((s) => ({
        date: `${year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`,
        name: s.name,
      }));

      const result: HolidayListDto = { year, month, holidays, specialDays };
      await this.redisService.set(cacheKey, result, HOLIDAY_CACHE_TTL);
      return result;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      const status = error?.response?.status;
      const detail = error?.response?.data ?? error?.message;
      this.logger.error(
        `공휴일 API 호출 실패 [${status}]: ${JSON.stringify(detail)}`,
      );
      throw new BadGatewayException('공휴일 정보를 가져오는데 실패했습니다');
    }
  }
}
