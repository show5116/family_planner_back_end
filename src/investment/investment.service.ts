import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { IndicatorCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { YahooCollector } from './scheduler/collectors/yahoo.collector';
import { CoinGeckoCollector } from './scheduler/collectors/coingecko.collector';
import { BokCollector } from './scheduler/collectors/bok.collector';
import { KoreaGoldCollector } from './scheduler/collectors/korea-gold.collector';

const INDICATORS: {
  symbol: string;
  name: string;
  nameKo: string;
  category: IndicatorCategory;
  unit: string;
}[] = [
  {
    symbol: 'KOSPI',
    name: 'KOSPI',
    nameKo: '코스피',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'KOSDAQ',
    name: 'KOSDAQ',
    nameKo: '코스닥',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'SP500',
    name: 'S&P 500',
    nameKo: 'S&P 500',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'NASDAQ',
    name: 'NASDAQ',
    nameKo: '나스닥',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'NQ100',
    name: 'Nasdaq 100 Futures',
    nameKo: '나스닥 100 선물',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'DJI',
    name: 'Dow Jones',
    nameKo: '다우존스',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'NIKKEI225',
    name: 'Nikkei 225',
    nameKo: '니케이 225',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'TWSE',
    name: 'TWSE',
    nameKo: '대만 가권 지수',
    category: 'INDEX',
    unit: 'pt',
  },
  {
    symbol: 'USD_KRW',
    name: 'USD/KRW',
    nameKo: '원/달러 환율',
    category: 'CURRENCY',
    unit: '원',
  },
  {
    symbol: 'DXY',
    name: 'Dollar Index',
    nameKo: '달러 인덱스',
    category: 'CURRENCY',
    unit: 'pt',
  },
  {
    symbol: 'GOLD_USD',
    name: 'Gold (International)',
    nameKo: '금 (국제)',
    category: 'COMMODITY',
    unit: 'USD/oz',
  },
  {
    symbol: 'GOLD_KRW_SPOT',
    name: 'Gold (KRW)',
    nameKo: '금 (국내)',
    category: 'COMMODITY',
    unit: '원/g',
  },
  {
    symbol: 'SILVER',
    name: 'Silver',
    nameKo: '은',
    category: 'COMMODITY',
    unit: 'USD/oz',
  },
  {
    symbol: 'WTI',
    name: 'WTI Crude Oil',
    nameKo: '국제 유가 (WTI)',
    category: 'COMMODITY',
    unit: 'USD/bbl',
  },
  {
    symbol: 'COPPER',
    name: 'Copper',
    nameKo: '구리',
    category: 'COMMODITY',
    unit: 'USD/lb',
  },
  {
    symbol: 'US10Y',
    name: 'US 10Y Treasury',
    nameKo: '미국채 10년물',
    category: 'BOND',
    unit: '%',
  },
  {
    symbol: 'KR3Y',
    name: 'Korea 3Y Treasury',
    nameKo: '한국채 3년물',
    category: 'BOND',
    unit: '%',
  },
  {
    symbol: 'VIX',
    name: 'VIX',
    nameKo: 'VIX 지수',
    category: 'VOLATILITY',
    unit: 'pt',
  },
  {
    symbol: 'BTC_KRW',
    name: 'Bitcoin (KRW)',
    nameKo: '비트코인',
    category: 'CRYPTO',
    unit: '원',
  },
  {
    symbol: 'BUFFETT_US',
    name: 'Buffett Indicator (US)',
    nameKo: '버핏 지수 (미국)',
    category: 'MACRO',
    unit: '%',
  },
];

type LatestPrice = {
  price: Decimal;
  prevPrice: Decimal | null;
  change: Decimal | null;
  changeRate: Decimal | null;
  recordedAt: Date;
} | null;

@Injectable()
export class InvestmentService implements OnModuleInit {
  private readonly logger = new Logger(InvestmentService.name);
  // symbol → indicatorId 캐시 (마스터 데이터는 변경 없으므로 메모리에 유지)
  private indicatorIdCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly yahoo: YahooCollector,
    private readonly coinGecko: CoinGeckoCollector,
    private readonly bok: BokCollector,
    private readonly koreaGold: KoreaGoldCollector,
  ) {}

  /**
   * 앱 시작 시 지표 마스터 데이터 upsert + 캐시 초기화
   */
  async onModuleInit() {
    for (const ind of INDICATORS) {
      const result = await this.prisma.indicator.upsert({
        where: { symbol: ind.symbol },
        update: {
          name: ind.name,
          nameKo: ind.nameKo,
          category: ind.category,
          unit: ind.unit,
        },
        create: ind,
      });
      this.indicatorIdCache.set(ind.symbol, result.id);
    }
  }

  /**
   * 전체 지표 목록 + 최신 시세 + 즐겨찾기 여부
   */
  async findAll(userId: string) {
    const [indicators, bookmarks] = await Promise.all([
      this.prisma.indicator.findMany({
        where: { isActive: true },
        include: {
          prices: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ category: 'asc' }, { symbol: 'asc' }],
      }),
      this.prisma.indicatorBookmark.findMany({
        where: { userId },
        select: { indicatorId: true, sortOrder: true },
      }),
    ]);

    const bookmarkMap = new Map(
      bookmarks.map((b) => [b.indicatorId, b.sortOrder]),
    );

    const goldUsd = indicators.find((i) => i.symbol === 'GOLD_USD');
    const usdKrw = indicators.find((i) => i.symbol === 'USD_KRW');

    return indicators
      .map((ind) => ({
        dto: this.formatIndicator(
          ind,
          ind.prices[0] ?? null,
          bookmarkMap.has(ind.id),
          ind.symbol === 'GOLD_KRW_SPOT'
            ? this.calcGoldSpread(
                ind.prices[0] ?? null,
                goldUsd?.prices[0] ?? null,
                usdKrw?.prices[0] ?? null,
              )
            : null,
        ),
        sortOrder: bookmarkMap.get(ind.id),
      }))
      .sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined)
          return a.sortOrder - b.sortOrder;
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        return 0;
      })
      .map((item) => item.dto);
  }

  /**
   * 지표 상세 + 최신 시세 + 즐겨찾기 여부
   */
  async findOne(userId: string, symbol: string) {
    const ind = await this.prisma.indicator.findUnique({
      where: { symbol },
      include: {
        prices: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!ind) {
      throw new NotFoundException('지표를 찾을 수 없습니다');
    }

    let spread: string | null = null;
    if (ind.symbol === 'GOLD_KRW_SPOT') {
      const [goldUsdInd, usdKrwInd] = await Promise.all([
        this.prisma.indicator.findUnique({
          where: { symbol: 'GOLD_USD' },
          include: { prices: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        }),
        this.prisma.indicator.findUnique({
          where: { symbol: 'USD_KRW' },
          include: { prices: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        }),
      ]);
      spread = this.calcGoldSpread(
        ind.prices[0] ?? null,
        goldUsdInd?.prices[0] ?? null,
        usdKrwInd?.prices[0] ?? null,
      );
    }

    return this.formatIndicator(
      ind,
      ind.prices[0] ?? null,
      ind.bookmarks.length > 0,
      spread,
    );
  }

  /**
   * 시세 히스토리 (시계열)
   *
   * 조회 기간에 따라 집계 단위를 자동 결정해 포인트 수를 제한:
   *  - ~7일  : 1시간 단위
   *  - ~30일 : 6시간 단위
   *  - 그 외 : 1일 단위 (과거 초기화 데이터와 동일 밀도)
   */
  async findHistory(_userId: string, symbol: string, days: number) {
    const ind = await this.prisma.indicator.findUnique({ where: { symbol } });

    if (!ind) {
      throw new NotFoundException('지표를 찾을 수 없습니다');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    type RawRow = { bucket: string; price: string };

    // 기간별 집계 버킷 결정 (INTERVAL/FORMAT은 파라미터 바인딩 불가 → Prisma.raw 사용)
    let rows: RawRow[];

    if (days <= 7) {
      // 1시간 단위: 'YYYY-MM-DD HH:00:00'
      rows = await this.prisma.$queryRaw<RawRow[]>`
        SELECT
          CONCAT(DATE_FORMAT(recordedAt, '%Y-%m-%d %H'), ':00:00') AS bucket,
          CAST(AVG(price) AS CHAR) AS price
        FROM indicator_prices
        WHERE indicatorId = ${ind.id}
          AND recordedAt >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    } else if (days <= 30) {
      // 6시간 단위: FLOOR(hour/6)*6 → '00','06','12','18'
      rows = await this.prisma.$queryRaw<RawRow[]>`
        SELECT
          CONCAT(
            DATE_FORMAT(recordedAt, '%Y-%m-%d '),
            LPAD(FLOOR(HOUR(recordedAt) / 6) * 6, 2, '0'),
            ':00:00'
          ) AS bucket,
          CAST(AVG(price) AS CHAR) AS price
        FROM indicator_prices
        WHERE indicatorId = ${ind.id}
          AND recordedAt >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    } else {
      // 1일 단위
      rows = await this.prisma.$queryRaw<RawRow[]>`
        SELECT
          DATE_FORMAT(recordedAt, '%Y-%m-%d') AS bucket,
          CAST(AVG(price) AS CHAR) AS price
        FROM indicator_prices
        WHERE indicatorId = ${ind.id}
          AND recordedAt >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
    }

    return {
      symbol: ind.symbol,
      nameKo: ind.nameKo,
      history: rows.map((r) => ({
        price: Number(r.price).toString(),
        recordedAt: new Date(r.bucket),
      })),
    };
  }

  /**
   * 즐겨찾기 목록 + 최신 시세
   */
  async findBookmarks(userId: string) {
    const bookmarks = await this.prisma.indicatorBookmark.findMany({
      where: { userId },
      include: {
        indicator: {
          include: {
            prices: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const hasGoldSpot = bookmarks.some(
      (b) => b.indicator.symbol === 'GOLD_KRW_SPOT',
    );
    let goldUsdPrice: LatestPrice = null;
    let usdKrwPrice: LatestPrice = null;

    if (hasGoldSpot) {
      const [goldUsdInd, usdKrwInd] = await Promise.all([
        this.prisma.indicator.findUnique({
          where: { symbol: 'GOLD_USD' },
          include: { prices: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        }),
        this.prisma.indicator.findUnique({
          where: { symbol: 'USD_KRW' },
          include: { prices: { orderBy: { recordedAt: 'desc' }, take: 1 } },
        }),
      ]);
      goldUsdPrice = goldUsdInd?.prices[0] ?? null;
      usdKrwPrice = usdKrwInd?.prices[0] ?? null;
    }

    return bookmarks.map((b) =>
      this.formatIndicator(
        b.indicator,
        b.indicator.prices[0] ?? null,
        true,
        b.indicator.symbol === 'GOLD_KRW_SPOT'
          ? this.calcGoldSpread(
              b.indicator.prices[0] ?? null,
              goldUsdPrice,
              usdKrwPrice,
            )
          : null,
      ),
    );
  }

  /**
   * 즐겨찾기 등록
   */
  async addBookmark(userId: string, symbol: string) {
    const ind = await this.prisma.indicator.findUnique({ where: { symbol } });

    if (!ind) {
      throw new NotFoundException('지표를 찾을 수 없습니다');
    }

    const existing = await this.prisma.indicatorBookmark.findUnique({
      where: { userId_indicatorId: { userId, indicatorId: ind.id } },
    });

    if (existing) {
      throw new ConflictException('이미 즐겨찾기에 등록된 지표입니다');
    }

    const maxOrder = await this.prisma.indicatorBookmark.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    await this.prisma.indicatorBookmark.create({
      data: { userId, indicatorId: ind.id, sortOrder: nextOrder },
    });

    return this.findOne(userId, symbol);
  }

  /**
   * 즐겨찾기 해제
   */
  async removeBookmark(userId: string, symbol: string) {
    const ind = await this.prisma.indicator.findUnique({ where: { symbol } });

    if (!ind) {
      throw new NotFoundException('지표를 찾을 수 없습니다');
    }

    const existing = await this.prisma.indicatorBookmark.findUnique({
      where: { userId_indicatorId: { userId, indicatorId: ind.id } },
    });

    if (!existing) {
      throw new NotFoundException('즐겨찾기에 등록되지 않은 지표입니다');
    }

    await this.prisma.indicatorBookmark.delete({
      where: { userId_indicatorId: { userId, indicatorId: ind.id } },
    });

    return this.findOne(userId, symbol);
  }

  /**
   * 즐겨찾기 순서 변경
   */
  async reorderBookmarks(userId: string, symbols: string[]) {
    const indicators = await this.prisma.indicator.findMany({
      where: { symbol: { in: symbols } },
      select: { id: true, symbol: true },
    });

    const symbolToId = new Map(indicators.map((i) => [i.symbol, i.id]));

    const bookmarks = await this.prisma.indicatorBookmark.findMany({
      where: { userId },
      select: { indicatorId: true },
    });
    const bookmarkedIds = new Set(bookmarks.map((b) => b.indicatorId));

    const updates = symbols.flatMap((symbol, index) => {
      const indicatorId = symbolToId.get(symbol);
      if (!indicatorId || !bookmarkedIds.has(indicatorId)) return [];
      return [
        this.prisma.indicatorBookmark.update({
          where: { userId_indicatorId: { userId, indicatorId } },
          data: { sortOrder: index },
        }),
      ];
    });

    await this.prisma.$transaction(updates);

    return { message: '즐겨찾기 순서가 변경되었습니다' };
  }

  /**
   * 시세 저장 (Collector에서 호출) — indicatorId는 캐시에서 조회
   * prevPrice가 null이면 DB에서 직전 레코드를 자동 조회해 change/changeRate 계산
   */
  async savePrice(
    symbol: string,
    price: number,
    prevPrice: number | null,
    recordedAt?: Date,
  ) {
    const indicatorId = this.indicatorIdCache.get(symbol);
    if (!indicatorId) return;

    let resolvedPrev = prevPrice;
    if (resolvedPrev == null) {
      const last = await this.prisma.indicatorPrice.findFirst({
        where: { indicatorId },
        orderBy: { recordedAt: 'desc' },
        select: { price: true },
      });
      resolvedPrev = last ? Number(last.price) : null;
    }

    const change = resolvedPrev != null ? price - resolvedPrev : null;
    const changeRate =
      resolvedPrev != null && resolvedPrev !== 0
        ? ((price - resolvedPrev) / resolvedPrev) * 100
        : null;

    await this.prisma.indicatorPrice.create({
      data: {
        indicatorId,
        price,
        prevPrice: resolvedPrev,
        change,
        changeRate,
        recordedAt: recordedAt ?? new Date(),
      },
    });
  }

  /**
   * 과거 데이터 일괄 초기화 (어드민 1회 호출용)
   * - Yahoo: 지정 기간 일별 종가 (최대 10년+)
   * - CoinGecko: 최대 365일 (무료 티어 제한)
   * - BOK: 지정 기간 국고채 3년물
   * - GOLD_KRW_SPOT: 한국금거래소 전체 기간 (2008년~)
   */
  async initializeHistoricalData(days: number = 3650): Promise<{
    yahoo: number;
    crypto: number;
    bond: number;
    goldSpot: number;
  }> {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    // 이미 있는 indicatorId를 캐싱 (매 row마다 findUnique 방지)
    const indicators = await this.prisma.indicator.findMany({
      select: { id: true, symbol: true },
    });
    const idMap = new Map(indicators.map((i) => [i.symbol, i.id]));

    let yahooCount = 0;

    // ── Yahoo historical ─────────────────────────────────────────
    this.logger.log(`[HistInit] Yahoo historical ${days}d ...`);
    const yahooRows = await this.yahoo.collectHistorical(from, to);

    const yahooInserts = yahooRows
      .filter((r) => idMap.has(r.symbol))
      .map((r) => ({
        indicatorId: idMap.get(r.symbol),
        price: r.close,
        prevPrice: null,
        change: null,
        changeRate: null,
        recordedAt: r.date,
      }));

    if (yahooInserts.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: yahooInserts,
        skipDuplicates: true,
      });
      yahooCount = yahooInserts.length;
    }

    // ── CoinGecko BTC/KRW ────────────────────────────────────────
    this.logger.log(`[HistInit] CoinGecko historical ${days}d ...`);
    const btcRows = await this.coinGecko.collectHistorical(Math.min(days, 365));
    const btcId = idMap.get('BTC_KRW');
    let cryptoCount = 0;

    if (btcId && btcRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: btcRows.map((r) => ({
          indicatorId: btcId,
          price: r.price,
          prevPrice: null,
          change: null,
          changeRate: null,
          recordedAt: r.date,
        })),
        skipDuplicates: true,
      });
      cryptoCount = btcRows.length;
    }

    // ── BOK KR3Y ─────────────────────────────────────────────────
    this.logger.log(`[HistInit] BOK KR3Y historical ${days}d ...`);
    const bokRows = await this.bok.getKr3yHistory(from, to);
    const kr3yId = idMap.get('KR3Y');
    let bondCount = 0;

    if (kr3yId && bokRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: bokRows.map((r) => ({
          indicatorId: kr3yId,
          price: r.rate,
          prevPrice: null,
          change: null,
          changeRate: null,
          recordedAt: r.date,
        })),
        skipDuplicates: true,
      });
      bondCount = bokRows.length;
    }

    // ── GOLD_KRW_SPOT 현물가 전체 기간 ───────────────────────────
    this.logger.log(`[HistInit] KoreaGold historical (ALL) ...`);
    const goldRows = await this.koreaGold.collectHistorical();
    const goldSpotId = idMap.get('GOLD_KRW_SPOT');
    let goldSpotCount = 0;

    if (goldSpotId && goldRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: goldRows.map((r) => ({
          indicatorId: goldSpotId,
          price: r.pricePerGram,
          prevPrice: null,
          change: null,
          changeRate: null,
          recordedAt: r.date,
        })),
        skipDuplicates: true,
      });
      goldSpotCount = goldRows.length;
    }

    this.logger.log(
      `[HistInit] Done — yahoo:${yahooCount} crypto:${cryptoCount} bond:${bondCount} goldSpot:${goldSpotCount}`,
    );

    return {
      yahoo: yahooCount,
      crypto: cryptoCount,
      bond: bondCount,
      goldSpot: goldSpotCount,
    };
  }

  private formatIndicator(
    ind: {
      symbol: string;
      name: string;
      nameKo: string;
      category: IndicatorCategory;
      unit: string;
    },
    latestPrice: LatestPrice,
    isBookmarked: boolean,
    spread: string | null = null,
  ) {
    return {
      symbol: ind.symbol,
      name: ind.name,
      nameKo: ind.nameKo,
      category: ind.category,
      unit: ind.unit,
      price: latestPrice ? Number(latestPrice.price).toString() : null,
      prevPrice: latestPrice?.prevPrice
        ? Number(latestPrice.prevPrice).toString()
        : null,
      change: latestPrice?.change
        ? Number(latestPrice.change).toString()
        : null,
      changeRate: latestPrice?.changeRate
        ? Number(latestPrice.changeRate).toFixed(4)
        : null,
      recordedAt: latestPrice?.recordedAt ?? null,
      isBookmarked,
      spread,
    };
  }

  /**
   * GOLD_KRW_SPOT(현물가) vs 환산가(GOLD_USD × USD_KRW ÷ 31.1035) 이격률
   * 양수: 현물가가 환산가보다 높음 (프리미엄)
   * 음수: 현물가가 환산가보다 낮음 (디스카운트)
   */
  private calcGoldSpread(
    spotPrice: LatestPrice,
    goldUsdPrice: LatestPrice,
    usdKrwPrice: LatestPrice,
  ): string | null {
    if (!spotPrice || !goldUsdPrice || !usdKrwPrice) return null;
    const spot = Number(spotPrice.price);
    const calc =
      (Number(goldUsdPrice.price) * Number(usdKrwPrice.price)) / 31.1035;
    if (calc <= 0) return null;
    return (((spot - calc) / calc) * 100).toFixed(2);
  }
}
