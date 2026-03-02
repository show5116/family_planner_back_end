import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 한국은행 경제통계시스템 API 응답 타입
interface BokStatRow {
  STAT_CODE: string;
  STAT_NAME: string;
  ITEM_CODE1: string;
  ITEM_NAME1: string;
  DATA_VALUE: string;
  TIME: string;
}

interface BokResponse {
  StatisticSearch: {
    list_total_count: number;
    row: BokStatRow[];
  };
}

// 국고채 3년물 통계코드: 817Y002, 항목코드: 010190000
const STAT_CODE = '817Y002';
const ITEM_CODE = '010190000';

@Injectable()
export class BokCollector {
  private readonly logger = new Logger(BokCollector.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BOK_API_KEY');
  }

  /**
   * 한국은행 Open API에서 국고채 3년물 금리 조회
   * BOK_API_KEY 없으면 null 반환
   */
  async getKr3yRate(): Promise<{ rate: number; date: string } | null> {
    if (!this.apiKey) {
      this.logger.debug('BOK_API_KEY not set — skipping KR3Y fetch');
      return null;
    }

    try {
      // 최근 5일치 조회 (주말/공휴일 고려)
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 5);

      const startDate = this.formatDate(from);
      const endDate = this.formatDate(today);

      const url =
        `https://ecos.bok.or.kr/api/StatisticSearch/${this.apiKey}/json/kr` +
        `/1/5/${STAT_CODE}/DD/${startDate}/${endDate}/${ITEM_CODE}`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as BokResponse;
      const rows = data?.StatisticSearch?.row;

      if (!rows?.length) {
        this.logger.warn('BOK: no KR3Y data');
        return null;
      }

      // 최신 데이터 (마지막 행)
      const latest = rows[rows.length - 1];
      const rate = parseFloat(latest.DATA_VALUE);

      if (isNaN(rate)) {
        this.logger.warn(`BOK: invalid rate value: ${latest.DATA_VALUE}`);
        return null;
      }

      return { rate, date: latest.TIME };
    } catch (err) {
      this.logger.error(`BOK KR3Y fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
}
