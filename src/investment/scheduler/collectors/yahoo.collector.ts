import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';

export interface YahooQuoteResult {
  symbol: string;
  price: number;
  prevPrice: number | null;
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

        const quotePromise = YahooFinance.quote(
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
   * Wilshire 5000 현재 지수만 별도 수집 (버핏 지수 계산용)
   */
  async getWilshire5000(): Promise<number | null> {
    try {
      const w5000Promise = YahooFinance.quote(
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
