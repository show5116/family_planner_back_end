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

/**
 * 심볼별 거래 시간 (UTC 기준, [시작분, 종료분] — 자정 기준 분 단위)
 * 이 범위 밖의 데이터는 장 마감 후 마지막 가격 반복이므로 저장 skip
 * null = 24시간 거래 (FX, 선물 등)
 */
const TRADING_MINUTES_UTC: Record<string, [number, number] | null> = {
  KOSPI: [30, 390], // KST 09:30~15:30 → UTC 00:30~06:30 (장 초반 30분 워밍업 제외)
  KOSDAQ: [30, 390],
  NIKKEI225: [30, 390], // JST 09:30~15:30 → UTC 00:30~06:30
  TWSE: [60, 330], // TST 09:00~13:30 → UTC 01:00~05:30
  SP500: [810, 1260], // ET 09:30~16:00 → UTC 13:30~21:00 (서머타임 12:30~20:00)
  NASDAQ: [810, 1260],
  NQ100: [810, 1260],
  DJI: [810, 1260],
  RUSSELL2000: [810, 1260],
  VIX: [810, 1260],
  US10Y: [810, 1260],
  // FX, 선물, 원자재 — 24시간 또는 거의 24시간
  USD_KRW: null,
  DXY: null,
  GOLD_USD: null,
  SILVER: null,
  WTI: null,
  COPPER: null,
  NAT_GAS: null,
  WHEAT: null,
  KR3Y: null,
  BUFFETT_US: null,
};

/** 현재 UTC 시각이 해당 심볼의 거래 시간 내인지 확인 */
function isMarketOpen(symbol: string, utcDate: Date): boolean {
  const minutes = TRADING_MINUTES_UTC[symbol];
  if (minutes === undefined || minutes === null) return true;
  const utcMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
  const [start, end] = minutes;
  return utcMinutes >= start && utcMinutes < end;
}

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
        if (!isMarketOpen(q.symbol, now)) continue; // 장 외 시간 skip

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
