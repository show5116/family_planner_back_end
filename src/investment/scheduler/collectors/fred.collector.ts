import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

@Injectable()
export class FredCollector {
  private readonly logger = new Logger(FredCollector.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('FRED_API_KEY');
  }

  /**
   * FRED에서 미국 GDP(분기) 조회
   * FRED_API_KEY 없으면 null 반환
   */
  async getLatestGdp(): Promise<number | null> {
    if (!this.apiKey) {
      this.logger.debug('FRED_API_KEY not set — skipping GDP fetch');
      return null;
    }

    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=GDP&api_key=${this.apiKey}&file_type=json&sort_order=desc&limit=1`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as FredResponse;
      const obs = data.observations?.[0];

      if (!obs || obs.value === '.') {
        this.logger.warn('FRED: no valid GDP observation');
        return null;
      }

      return parseFloat(obs.value);
    } catch (err) {
      this.logger.error(`FRED GDP fetch failed: ${(err as Error).message}`);
      return null;
    }
  }
}
