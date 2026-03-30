import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvestmentService } from '@/investment/investment.service';
import { RedisService } from '@/redis/redis.service';
import { YahooCollector } from './collectors/yahoo.collector';
import { CoinGeckoCollector } from './collectors/coingecko.collector';
import { FredCollector } from './collectors/fred.collector';
import { BokCollector } from './collectors/bok.collector';
import { KoreaGoldCollector } from './collectors/korea-gold.collector';
import { FearGreedCollector } from './collectors/fear-greed.collector';

// 각 크론잡의 락 TTL (초) — 실행 최대 소요 시간보다 넉넉하게 설정
const LOCK_TTL = {
  yahoo: 4 * 60, // 4분 (5분 주기 크론)
  crypto: 55 * 60, // 55분 (1시간 주기 크론)
  macro: 10 * 60, // 10분
  bond: 10 * 60, // 10분
  goldSpot: 10 * 60, // 10분 (15분 주기 크론)
  fearGreed: 10 * 60, // 10분 (1시간 주기 크론)
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
    private readonly koreaGold: KoreaGoldCollector,
    private readonly fearGreed: FearGreedCollector,
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

      for (const q of quotes) {
        if (q.symbol === 'BUFFETT_W5000') continue;

        await this.investmentService.savePrice(
          q.symbol,
          q.price,
          q.prevPrice,
          now,
        );
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
   * 국내 금 현물가 수집 (15분마다, KST 09:00~16:00 평일)
   * 한국금거래소(koreagoldx.co.kr) 기준 순금 매수가 (원/g)
   */
  @Cron('*/15 0-7 * * 1-5')
  async collectGoldSpot() {
    const lockKey = 'lock:indicator:gold-spot';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.goldSpot,
      lockValue,
    );
    if (!acquired) return;

    try {
      this.logger.debug('Collecting Korea Gold spot price...');
      const result = await this.koreaGold.collect();

      if (!result) return;

      await this.investmentService.savePrice(
        'GOLD_KRW_SPOT',
        result.pricePerGram,
        null,
        new Date(),
      );

      this.logger.debug(
        `GOLD_KRW_SPOT: ${result.pricePerGram.toFixed(0)} 원/g`,
      );
    } finally {
      await this.redis.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Fear & Greed Index 수집 (1시간마다)
   */
  @Cron('0 * * * *')
  async collectFearGreed() {
    const lockKey = 'lock:indicator:fear-greed';
    const lockValue = Date.now().toString();
    const acquired = await this.redis.acquireLock(
      lockKey,
      LOCK_TTL.fearGreed,
      lockValue,
    );
    if (!acquired) return;

    try {
      this.logger.debug('Collecting Fear & Greed Index...');
      const result = await this.fearGreed.collect();

      if (!result) return;

      await this.investmentService.savePrice(
        'FEAR_GREED',
        result.value,
        null,
        new Date(),
      );

      this.logger.debug(`FEAR_GREED: ${result.value}`);
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
