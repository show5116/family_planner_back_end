import { Injectable, Logger } from '@nestjs/common';

export interface KoreaGoldResult {
  /** KRX 금시장 매매기준율 (원/g) */
  pricePerGram: number;
}

export interface KoreaGoldHistoricalPoint {
  date: Date;
  pricePerGram: number;
}

const BASE_URL = 'https://finance.naver.com/marketindex/goldDailyQuote.nhn';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Charset': 'euc-kr,utf-8;q=0.7,*;q=0.3',
};

/**
 * 네이버 금융에서 KRX 금시장 매매기준율 수집 (원/g)
 *
 * https://finance.naver.com/marketindex/goldDailyQuote.nhn
 * - "매매기준율" = KRX 금시장 공식 기준가 (세금·수수료 미포함 순수 현물가)
 * - HTML 파싱: <td class="date">2026.03.05</td> <td class="num">244,452.53</td>
 */
@Injectable()
export class KoreaGoldCollector {
  private readonly logger = new Logger(KoreaGoldCollector.name);

  async collect(): Promise<KoreaGoldResult | null> {
    try {
      const rows = await this.fetchPage(1);
      if (!rows.length) {
        this.logger.warn('KoreaGold: empty list on page 1');
        return null;
      }
      // 첫 번째 행이 가장 최신
      return { pricePerGram: rows[0].pricePerGram };
    } catch (err) {
      this.logger.error(`KoreaGold fetch failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * KRX 금시장 전체 히스토리 수집
   * 네이버 금융 페이지를 순차적으로 읽어 최대 10년치 반환
   */
  async collectHistorical(): Promise<KoreaGoldHistoricalPoint[]> {
    const results: KoreaGoldHistoricalPoint[] = [];
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 10);

    try {
      for (let page = 1; page <= 500; page++) {
        const rows = await this.fetchPage(page);
        if (!rows.length) break;

        let reachedCutoff = false;
        for (const row of rows) {
          if (row.date < cutoff) {
            reachedCutoff = true;
            break;
          }
          results.push(row);
        }
        if (reachedCutoff) break;

        // 서버 부하 방지
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      this.logger.error(
        `KoreaGold historical failed: ${(err as Error).message}`,
      );
    }

    this.logger.log(`KoreaGold historical: ${results.length}건 수집`);
    return results;
  }

  private async fetchPage(page: number): Promise<KoreaGoldHistoricalPoint[]> {
    const res = await fetch(`${BASE_URL}?page=${page}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    // euc-kr 인코딩 → 숫자/날짜 부분은 ASCII이므로 직접 파싱 가능
    const html = await res.text();
    return this.parseRows(html);
  }

  private parseRows(html: string): KoreaGoldHistoricalPoint[] {
    const results: KoreaGoldHistoricalPoint[] = [];

    // <td class="date">2026.03.05</td>\n\t<td class="num">244,452.53</td>
    const rowRegex =
      /<td class="date">(\d{4}\.\d{2}\.\d{2})<\/td>\s*<td class="num">([\d,]+\.?\d*)<\/td>/g;

    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      const dateStr = match[1].replace(/\./g, '-'); // "2026.03.05" → "2026-03-05"
      const price = parseFloat(match[2].replace(/,/g, ''));

      if (isNaN(price) || price <= 0) continue;

      const date = new Date(`${dateStr}T00:00:00+09:00`);
      if (isNaN(date.getTime())) continue;

      results.push({ date, pricePerGram: price });
    }

    return results;
  }
}
