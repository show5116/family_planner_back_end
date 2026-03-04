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

// 국고채 3년물 통계코드: 817Y002, 항목코드: 010200000
const STAT_CODE = '817Y002';
const ITEM_CODE = '010200000';

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
        `/1/5/${STAT_CODE}/D/${startDate}/${endDate}/${ITEM_CODE}`;

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

  /**
   * 날짜 범위 국고채 3년물 히스토리 조회 (과거 데이터 초기화용)
   * ECOS API 최대 조회 건수(10000) 이내로 자동 분할
   */
  async getKr3yHistory(
    from: Date,
    to: Date,
  ): Promise<{ rate: number; date: Date }[]> {
    if (!this.apiKey) {
      this.logger.debug('BOK_API_KEY not set — skipping KR3Y history');
      return [];
    }

    try {
      const startDate = this.formatDate(from);
      const endDate = this.formatDate(to);

      // ECOS: 최대 10000건 조회 가능, 일별 데이터라 1년=약 250건으로 충분
      const url =
        `https://ecos.bok.or.kr/api/StatisticSearch/${this.apiKey}/json/kr` +
        `/1/10000/${STAT_CODE}/D/${startDate}/${endDate}/${ITEM_CODE}`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as BokResponse;
      const rows = data?.StatisticSearch?.row;

      if (!rows?.length) {
        this.logger.warn('BOK: no KR3Y history data');
        return [];
      }

      return rows
        .map((row) => {
          const rate = parseFloat(row.DATA_VALUE);
          if (isNaN(rate)) return null;
          // TIME 형식: YYYYMMDD
          const y = row.TIME.slice(0, 4);
          const m = row.TIME.slice(4, 6);
          const d = row.TIME.slice(6, 8);
          return { rate, date: new Date(`${y}-${m}-${d}T00:00:00Z`) };
        })
        .filter((r): r is { rate: number; date: Date } => r !== null);
    } catch (err) {
      this.logger.error(`BOK KR3Y history failed: ${(err as Error).message}`);
      return [];
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
}
