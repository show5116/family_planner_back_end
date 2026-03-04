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

// API 응답 행 타입 (s_pure: 숫자)
interface KoreaGoldRow {
  date: string; // "YYYY-MM-DD HH:mm:ss"
  s_pure: number;
}

const API_URL = 'https://www.koreagoldx.co.kr/api/price/chart/list';
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  Referer: 'https://www.koreagoldx.co.kr/price/gold',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: '*/*',
  'X-Requested-With': 'XMLHttpRequest',
  Origin: 'https://www.koreagoldx.co.kr',
};

/**
 * 한국금거래소 (koreagoldx.co.kr) 에서 국내 금 현물가 수집
 *
 * 응답 예시:
 * { list: [{ date: "2024-03-01 10:22:14", s_pure: 883000, ... }] }
 * s_pure: 순금 3.75g(1돈) 매수가 (원), 숫자형
 */
@Injectable()
export class KoreaGoldCollector {
  private readonly logger = new Logger(KoreaGoldCollector.name);

  async collect(): Promise<KoreaGoldResult | null> {
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 7);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          srchDt: 'SEARCH',
          type: 'Au',
          dataDateStart: this.formatDate(from),
          dataDateEnd: this.formatDate(today),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        this.logger.warn(`KoreaGold HTTP ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { list?: KoreaGoldRow[] };
      const rows = data?.list;

      if (!rows?.length) {
        this.logger.warn('KoreaGold: empty list');
        return null;
      }

      // 응답은 날짜 내림차순 — 첫 번째가 가장 최신
      const latest = rows[0];
      const pricePerDon =
        typeof latest.s_pure === 'string'
          ? parseFloat((latest.s_pure as string).replace(/,/g, ''))
          : latest.s_pure;

      if (isNaN(pricePerDon) || pricePerDon <= 0) {
        this.logger.warn(`KoreaGold: invalid s_pure = ${latest.s_pure}`);
        return null;
      }

      return { pricePerGram: pricePerDon / DON_TO_GRAM };
    } catch (err) {
      this.logger.error(`KoreaGold fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 한국금거래소 전체 히스토리 수집 (srchDt=ALL)
   * 하루에 여러 건 있으므로 날짜별 첫 번째 항목(최신 시각)만 추출
   */
  async collectHistorical(): Promise<KoreaGoldHistoricalPoint[]> {
    try {
      const today = new Date();
      const from = new Date('2008-01-01');

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          srchDt: 'SEARCH',
          type: 'Au',
          dataDateStart: this.formatDate(from),
          dataDateEnd: this.formatDate(today),
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        this.logger.warn(`KoreaGold historical HTTP ${res.status}`);
        return [];
      }

      const data = (await res.json()) as { list?: KoreaGoldRow[] };
      const rows = data?.list;

      if (!rows?.length) {
        this.logger.warn('KoreaGold historical: empty list');
        return [];
      }

      // 날짜(YYYY-MM-DD)별 첫 번째 항목만 유지 (응답이 내림차순이므로 첫 항목이 최신)
      const seen = new Set<string>();
      const results: KoreaGoldHistoricalPoint[] = [];

      for (const row of rows) {
        const pricePerDon =
          typeof row.s_pure === 'string'
            ? parseFloat((row.s_pure as string).replace(/,/g, ''))
            : row.s_pure;

        if (isNaN(pricePerDon) || pricePerDon <= 0) continue;

        // date: "YYYY-MM-DD HH:mm:ss" 또는 "YYYY-MM-DD"
        const dateStr = row.date.slice(0, 10); // "YYYY-MM-DD"
        if (seen.has(dateStr)) continue;
        seen.add(dateStr);

        const date = new Date(`${dateStr}T00:00:00+09:00`);
        if (isNaN(date.getTime())) continue;

        results.push({ date, pricePerGram: pricePerDon / DON_TO_GRAM });
      }

      return results;
    } catch (err) {
      this.logger.error(
        `KoreaGold historical failed: ${(err as Error).message}`,
      );
      return [];
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
