import { Injectable, Logger } from '@nestjs/common';

interface CnnFearGreedResponse {
  fear_and_greed: {
    score: number;
    rating: string;
    timestamp: string;
    previous_close: number;
  };
  fear_and_greed_historical: {
    data: { x: number; y: number; rating: string }[];
  };
}

const CNN_URL =
  'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://edition.cnn.com/markets/fear-and-greed',
  Origin: 'https://edition.cnn.com',
};

@Injectable()
export class FearGreedCollector {
  private readonly logger = new Logger(FearGreedCollector.name);

  async collect(): Promise<{ value: number } | null> {
    try {
      const res = await fetch(CNN_URL, {
        headers: HEADERS,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as CnnFearGreedResponse;
      const score = data?.fear_and_greed?.score;

      if (score == null || typeof score !== 'number') {
        this.logger.warn('FearGreed: no score in CNN response');
        return null;
      }

      return { value: Math.round(score) };
    } catch (err) {
      this.logger.error(`FearGreed collect failed: ${(err as Error).message}`);
      return null;
    }
  }

  async collectHistorical(
    days: number,
  ): Promise<{ date: Date; value: number }[]> {
    try {
      const res = await fetch(CNN_URL, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as CnnFearGreedResponse;
      const items = data?.fear_and_greed_historical?.data;

      if (!Array.isArray(items)) {
        this.logger.warn('FearGreed: history data is not an array');
        return [];
      }

      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      return items
        .filter((item) => item.x >= cutoff && item.y != null)
        .map((item) => ({
          date: new Date(item.x),
          value: Math.round(item.y),
        }));
    } catch (err) {
      this.logger.error(
        `FearGreed historical failed: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
