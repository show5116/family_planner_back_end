import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvestmentService } from '@/investment/investment.service';
import { YahooCollector } from './collectors/yahoo.collector';
import { CoinGeckoCollector } from './collectors/coingecko.collector';
import { FredCollector } from './collectors/fred.collector';

const OZ_TO_GRAM = 31.1035;

@Injectable()
export class InvestmentScheduler {
  private readonly logger = new Logger(InvestmentScheduler.name);

  constructor(
    private readonly investmentService: InvestmentService,
    private readonly yahoo: YahooCollector,
    private readonly coinGecko: CoinGeckoCollector,
    private readonly fred: FredCollector,
  ) {}

  /**
   * Yahoo Finance 전체 수집 (5분마다)
   */
  @Cron('*/5 * * * *')
  async collectYahoo() {
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
  }

  /**
   * 비트코인 수집 (1시간마다)
   */
  @Cron('0 * * * *')
  async collectCrypto() {
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
  }

  /**
   * 버핏 지수 수집 (매일 06:00 KST = 21:00 UTC)
   */
  @Cron('0 21 * * *')
  async collectMacro() {
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
  }
}
