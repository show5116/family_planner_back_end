import { Injectable, Logger } from '@nestjs/common';
import YahooFinanceClass from 'yahoo-finance2';

const yahooFinance = new YahooFinanceClass();

export interface YahooQuoteResult {
  symbol: string;
  price: number;
  prevPrice: number | null;
}

export interface YahooHistoricalPoint {
  symbol: string;
  date: Date;
  close: number;
}

const YAHOO_SYMBOLS: { symbol: string; ticker: string }[] = [
  { symbol: 'KOSPI', ticker: '^KS11' },
  { symbol: 'KOSDAQ', ticker: '^KQ11' },
  { symbol: 'SP500', ticker: '^GSPC' },
  { symbol: 'NASDAQ', ticker: '^IXIC' },
  { symbol: 'DJI', ticker: '^DJI' },
  { symbol: 'NIKKEI225', ticker: '^N225' },
  { symbol: 'TWSE', ticker: '^TWII' },
  { symbol: 'USD_KRW', ticker: 'KRW=X' },
  { symbol: 'DXY', ticker: 'DX-Y.NYB' },
  { symbol: 'GOLD_USD', ticker: 'GC=F' },
  { symbol: 'SILVER', ticker: 'SI=F' },
  { symbol: 'WTI', ticker: 'CL=F' },
  { symbol: 'COPPER', ticker: 'HG=F' },
  { symbol: 'US10Y', ticker: '^TNX' },
  { symbol: 'VIX', ticker: '^VIX' },
  { symbol: 'BUFFETT_W5000', ticker: '^W5000' },
];

@Injectable()
export class YahooCollector {
  private readonly logger = new Logger(YahooCollector.name);

  /**
   * Yahoo Finance에서 전체 지표 시세 일괄 수집
   */
  async collect(): Promise<YahooQuoteResult[]> {
    const results: YahooQuoteResult[] = [];

    for (const { symbol, ticker } of YAHOO_SYMBOLS) {
      try {
        // validateResult: false 오버로드는 Promise<any>를 반환하나,
        // 타입 추론이 실패하는 경우가 있어 명시적으로 캐스팅

        const quotePromise = yahooFinance.quote(
          ticker,
          {},
          {
            validateResult: false,
          },
        ) as unknown as Promise<any>;

        const quote = await quotePromise;

        const price = (quote?.regularMarketPrice ??
          quote?.postMarketPrice ??
          null) as number | null;

        const prevPrice = (quote?.regularMarketPreviousClose ?? null) as
          | number
          | null;

        if (price == null) {
          this.logger.warn(`No price for ${symbol} (${ticker})`);
          continue;
        }

        results.push({ symbol, price, prevPrice });
      } catch (err) {
        this.logger.error(
          `Failed to fetch ${symbol} (${ticker}): ${(err as Error).message}`,
        );
      }
    }

    return results;
  }

  /**
   * Yahoo Finance historical() — 날짜 범위 일별 종가 수집
   * BUFFETT_W5000은 제외 (버핏 지수는 별도 계산)
   */
  async collectHistorical(
    from: Date,
    to: Date,
  ): Promise<YahooHistoricalPoint[]> {
    const results: YahooHistoricalPoint[] = [];

    // GOLD_KRW는 계산값이므로 Yahoo 직접 수집 대상에서 제외
    const targets = YAHOO_SYMBOLS.filter((s) => s.symbol !== 'BUFFETT_W5000');

    for (const { symbol, ticker } of targets) {
      try {
        const histPromise = yahooFinance.historical(ticker, {
          period1: from,
          period2: to,
          interval: '1d',
        }) as unknown as Promise<any[]>;

        const rows = await histPromise;

        for (const row of rows) {
          if (row.close == null) continue;

          results.push({
            symbol,
            date: row.date as Date,
            close: row.close as number,
          });
        }

        this.logger.debug(`Historical ${symbol}: ${rows.length} rows`);
      } catch (err) {
        this.logger.error(
          `Historical fetch failed ${symbol} (${ticker}): ${(err as Error).message}`,
        );
      }
    }

    return results;
  }

  /**
   * Wilshire 5000 현재 지수만 별도 수집 (버핏 지수 계산용)
   */
  async getWilshire5000(): Promise<number | null> {
    try {
      const w5000Promise = yahooFinance.quote(
        '^W5000',
        {},
        {
          validateResult: false,
        },
      ) as unknown as Promise<any>;

      const quote = await w5000Promise;

      return (quote?.regularMarketPrice as number | undefined) ?? null;
    } catch (err) {
      this.logger.error(
        `Failed to fetch Wilshire 5000: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
