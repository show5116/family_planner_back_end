import { Injectable, Logger } from '@nestjs/common';

// 3.75g(1돈) → 1g 변환
const DON_TO_GRAM = 3.75;

export interface KoreaGoldResult {
  /** 순금 매수 기준가 (원/g) */
  pricePerGram: number;
}

export interface KoreaGoldHistoricalPoint {
  date: Date;
  pricePerGram: number;
}

/**
 * 한국금거래소 (koreagoldx.co.kr) 에서 국내 금 현물가 수집
 *
 * 응답 예시:
 * { list: [{ date: "2024-03-01", s_pure: "370125", ... }] }
 * s_pure: 순금 3.75g(1돈) 매수가 (원)
 */
@Injectable()
export class KoreaGoldCollector {
  private readonly logger = new Logger(KoreaGoldCollector.name);

  async collect(): Promise<KoreaGoldResult | null> {
    try {
      const res = await fetch(
        'https://www.koreagoldx.co.kr/api/price/chart/list',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: 'https://www.koreagoldx.co.kr/price/gold',
            'User-Agent': 'Mozilla/5.0 (compatible; FamilyPlannerBot/1.0)',
          },
          body: new URLSearchParams({
            srchDt: '5M',
            type: 'Au',
          }).toString(),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!res.ok) {
        this.logger.warn(`KoreaGold HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        list?: { date: string; s_pure: string }[];
      };

      const rows = data?.list;
      if (!rows?.length) {
        this.logger.warn('KoreaGold: empty list');
        return null;
      }

      // 가장 최신 데이터 (마지막 항목)
      const latest = rows[rows.length - 1];
      const pricePerDon = parseFloat(latest.s_pure?.replace(/,/g, '') ?? '');

      if (isNaN(pricePerDon) || pricePerDon <= 0) {
        this.logger.warn(`KoreaGold: invalid s_pure = ${latest.s_pure}`);
        return null;
      }

      const pricePerGram = pricePerDon / DON_TO_GRAM;
      return { pricePerGram };
    } catch (err) {
      this.logger.error(`KoreaGold fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 한국금거래소 전체 히스토리 수집 (srchDt=ALL)
   * 2008년 개장 이후 모든 일별 데이터 반환
   */
  async collectHistorical(): Promise<KoreaGoldHistoricalPoint[]> {
    try {
      const res = await fetch(
        'https://www.koreagoldx.co.kr/api/price/chart/list',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: 'https://www.koreagoldx.co.kr/price/gold',
            'User-Agent': 'Mozilla/5.0 (compatible; FamilyPlannerBot/1.0)',
          },
          body: new URLSearchParams({
            srchDt: 'ALL',
            type: 'Au',
          }).toString(),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (!res.ok) {
        this.logger.warn(`KoreaGold historical HTTP ${res.status}`);
        return [];
      }

      const data = (await res.json()) as {
        list?: { date: string; s_pure: string }[];
      };

      const rows = data?.list;
      if (!rows?.length) {
        this.logger.warn('KoreaGold historical: empty list');
        return [];
      }

      return rows
        .map((row) => {
          const pricePerDon = parseFloat(row.s_pure?.replace(/,/g, '') ?? '');
          if (isNaN(pricePerDon) || pricePerDon <= 0) return null;
          // date 형식: "YYYY-MM-DD" 또는 "YYYY.MM.DD"
          const normalized = row.date.replace(/\./g, '-');
          return {
            date: new Date(`${normalized}T00:00:00+09:00`),
            pricePerGram: pricePerDon / DON_TO_GRAM,
          };
        })
        .filter(
          (r): r is KoreaGoldHistoricalPoint =>
            r !== null && !isNaN(r.date.getTime()),
        );
    } catch (err) {
      this.logger.error(
        `KoreaGold historical failed: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
