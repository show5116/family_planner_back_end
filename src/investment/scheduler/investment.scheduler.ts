import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvestmentService } from '@/investment/investment.service';
import { RedisService } from '@/redis/redis.service';
import { YahooCollector } from './collectors/yahoo.collector';
import { CoinGeckoCollector } from './collectors/coingecko.collector';
import { FredCollector } from './collectors/fred.collector';
import { BokCollector } from './collectors/bok.collector';

const OZ_TO_GRAM = 31.1035;

// 각 크론잡의 락 TTL (초) — 실행 최대 소요 시간보다 넉넉하게 설정
const LOCK_TTL = {
  yahoo: 4 * 60, // 4분 (5분 주기 크론)
  crypto: 55 * 60, // 55분 (1시간 주기 크론)
  macro: 10 * 60, // 10분
  bond: 10 * 60, // 10분
} as const;

@Injectable()
export class InvestmentScheduler {
  private readonly logger = new Logger(InvestmentScheduler.name);

  constructor(
    private readonly investmentService: InvestmentService,
    private readonly redis: RedisService,
    private readonly yahoo: YahooCollector,
    private readonly coinGecko: CoinGeckoCollector,
    private readonly fred: FredCollector,
    private readonly bok: BokCollector,
  ) {}

  /**
   * Yahoo Finance 전체 수집 (5분마다)
   */
  @Cron('*/5 * * * *')
  async collectYahoo() {
    const lockKey = 'lock:indicator:yahoo';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.yahoo,
      lockValue,
    );
    if (!acquired) return;

    try {
      this.logger.debug('Collecting Yahoo Finance quotes...');
      const quotes = await this.yahoo.collect();

      const now = new Date();
      let goldUsd: number | null = null;
      let usdKrw: number | null = null;

      for (const q of quotes) {
        if (q.symbol === 'BUFFETT_W5000') continue;

        await this.investmentService.savePrice(
          q.symbol,
          q.price,
          q.prevPrice,
          now,
        );

        if (q.symbol === 'GOLD_USD') goldUsd = q.price;
        if (q.symbol === 'USD_KRW') usdKrw = q.price;
      }

      // 국내 금값 계산: GOLD_USD × USD_KRW ÷ 31.1035 (oz → g)
      if (goldUsd != null && usdKrw != null) {
        const goldKrw = (goldUsd * usdKrw) / OZ_TO_GRAM;
        await this.investmentService.savePrice('GOLD_KRW', goldKrw, null, now);
      }

      this.logger.debug(`Collected ${quotes.length} Yahoo quotes`);
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 비트코인 수집 (1시간마다)
   */
  @Cron('0 * * * *')
  async collectCrypto() {
    const lockKey = 'lock:indicator:crypto';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.crypto,
      lockValue,
    );
    if (!acquired) return;

    try {
      this.logger.debug('Collecting CoinGecko BTC/KRW...');
      const result = await this.coinGecko.collect();

      if (!result) return;

      const prevPrice =
        result.change24h !== 0
          ? result.price / (1 + result.change24h / 100)
          : null;

      await this.investmentService.savePrice(
        'BTC_KRW',
        result.price,
        prevPrice,
        new Date(),
      );

      this.logger.debug(`BTC/KRW: ${result.price}`);
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 버핏 지수 수집 (매일 06:00 KST = 21:00 UTC)
   */
  @Cron('0 21 * * *')
  async collectMacro() {
    const lockKey = 'lock:indicator:macro';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.macro,
      lockValue,
    );
    if (!acquired) return;

    try {
      this.logger.debug('Collecting Buffett Indicator...');

      const [wilshire, gdp] = await Promise.all([
        this.yahoo.getWilshire5000(),
        this.fred.getLatestGdp(),
      ]);

      if (wilshire == null || gdp == null) {
        this.logger.warn(
          `Buffett Indicator skipped — wilshire=${wilshire}, gdp=${gdp}`,
        );
        return;
      }

      // BUFFETT_US = Wilshire 5000 / GDP(billions) * 100
      const buffett = (wilshire / gdp) * 100;

      await this.investmentService.savePrice(
        'BUFFETT_US',
        buffett,
        null,
        new Date(),
      );

      this.logger.debug(`Buffett Indicator: ${buffett.toFixed(2)}%`);
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 한국채 3년물 수집 (매일 18:00 KST = 09:00 UTC, 장 마감 후)
   */
  @Cron('0 9 * * 1-5')
  async collectBond() {
    const lockKey = 'lock:indicator:bond';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.bond,
      lockValue,
    );
    if (!acquired) return;

    try {
      this.logger.debug('Collecting BOK KR3Y...');
      const result = await this.bok.getKr3yRate();

      if (!result) return;

      await this.investmentService.savePrice(
        'KR3Y',
        result.rate,
        null,
        new Date(),
      );

      this.logger.debug(`KR3Y: ${result.rate}% (${result.date})`);
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }
}
