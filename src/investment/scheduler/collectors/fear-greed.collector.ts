import { Injectable, Logger } from '@nestjs/common';

interface FearGreedResponse {
  data: {
    value: string;
    value_classification: string;
    timestamp: string;
  }[];
}

@Injectable()
export class FearGreedCollector {
  private readonly logger = new Logger(FearGreedCollector.name);

  /**
   * Alternative.me Fear & Greed Index 수집
   * 0~25: Extreme Fear, 26~45: Fear, 46~55: Neutral, 56~75: Greed, 76~100: Extreme Greed
   */
  async collect(): Promise<{ value: number } | null> {
    try {
      const url = 'https://api.alternative.me/fng/?limit=1';

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as FearGreedResponse;
      const item = data?.data?.[0];

      if (!item?.value) {
        this.logger.warn('FearGreed: no data');
        return null;
      }

      return { value: Number(item.value) };
    } catch (err) {
      this.logger.error(`FearGreed collect failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 과거 N일 Fear & Greed 데이터 수집 (최대 365일)
   */
  async collectHistorical(
    days: number,
  ): Promise<{ date: Date; value: number }[]> {
    try {
      const url = `https://api.alternative.me/fng/?limit=${days}`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as FearGreedResponse;

      return (data?.data ?? []).map((item) => ({
        date: new Date(Number(item.timestamp) * 1000),
        value: Number(item.value),
      }));
    } catch (err) {
      this.logger.error(
        `FearGreed historical failed: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
