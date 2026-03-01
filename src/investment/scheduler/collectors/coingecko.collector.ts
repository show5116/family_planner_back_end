import { Injectable, Logger } from '@nestjs/common';

interface CoinGeckoResponse {
  bitcoin: {
    krw: number;
    krw_24h_change: number;
    last_updated_at: number;
  };
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
}
