import { Injectable, Logger } from '@nestjs/common';

interface FearGreedAllResponse {
  score: number;
}

interface FearGreedHistoryItem {
  date: string;
  score: number;
}

@Injectable()
export class FearGreedCollector {
  private readonly logger = new Logger(FearGreedCollector.name);
  private readonly BASE_URL = 'https://feargreedchart.com/api/';

  /**
   * feargreedchart.com — 주식시장 기반 공포탐욕지수 (CNN 기준과 동일한 방식)
   * VIX, S&P500 모멘텀, Put/Call 비율, 안전자산 수요, 정크본드 수요 5개 지표 합산
   */
  async collect(): Promise<{ value: number } | null> {
    try {
      const res = await fetch(`${this.BASE_URL}?action=all`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as FearGreedAllResponse;

      if (typeof data?.score !== 'number') {
        this.logger.warn('FearGreed: no score in response');
        return null;
      }

      return { value: data.score };
    } catch (err) {
      this.logger.error(`FearGreed collect failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 과거 N일 Fear & Greed 데이터 수집
   * feargreedchart.com은 2016-01-20부터 전체 history 제공
   */
  async collectHistorical(
    days: number,
  ): Promise<{ date: Date; value: number }[]> {
    try {
      const res = await fetch(`${this.BASE_URL}?action=history`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as FearGreedHistoryItem[];

      if (!Array.isArray(data)) {
        this.logger.warn('FearGreed: history response is not an array');
        return [];
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      return data
        .filter((item) => new Date(item.date) >= cutoff)
        .map((item) => ({
          date: new Date(item.date),
          value: item.score,
        }));
    } catch (err) {
      this.logger.error(
        `FearGreed historical failed: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
