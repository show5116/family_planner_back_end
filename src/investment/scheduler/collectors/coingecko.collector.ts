import { Injectable, Logger } from '@nestjs/common';

interface CoinGeckoResponse {
  bitcoin: {
    krw: number;
    krw_24h_change: number;
    last_updated_at: number;
  };
}

// [timestamp_ms, price][]
type CoinGeckoMarketChart = {
  prices: [number, number][];
};

export interface CoinGeckoHistoricalPoint {
  date: Date;
  price: number;
}

@Injectable()
export class CoinGeckoCollector {
  private readonly logger = new Logger(CoinGeckoCollector.name);

  /**
   * CoinGecko에서 비트코인/원화 시세 수집
   */
  async collect(): Promise<{ price: number; change24h: number } | null> {
    try {
      const url =
        'https://api.coingecko.com/api/v3/simple/price' +
        '?ids=bitcoin&vs_currencies=krw&include_24hr_change=true&include_last_updated_at=true';

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as CoinGeckoResponse;
      const btc = data.bitcoin;

      if (!btc?.krw) {
        this.logger.warn('CoinGecko: no BTC/KRW data');
        return null;
      }

      return {
        price: btc.krw,
        change24h: btc.krw_24h_change ?? 0,
      };
    } catch (err) {
      this.logger.error(`CoinGecko collect failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * CoinGecko market_chart — 과거 N일 일별 BTC/KRW 시세 수집
   * 무료 티어: 최대 365일
   */
  async collectHistorical(days: number): Promise<CoinGeckoHistoricalPoint[]> {
    try {
      const url =
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart` +
        `?vs_currency=krw&days=${days}&interval=daily`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as CoinGeckoMarketChart;

      return data.prices.map(([ts, price]) => ({
        date: new Date(ts),
        price,
      }));
    } catch (err) {
      this.logger.error(
        `CoinGecko historical failed: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
