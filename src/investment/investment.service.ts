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
    symbol: 'GOLD_KRW',
    name: 'Gold (KRW, calculated)',
    nameKo: '금 (국내 환산)',
    category: 'COMMODITY',
    unit: '원/g',
  },
  {
    symbol: 'GOLD_KRW_SPOT',
    name: 'Gold (KRW, spot)',
    nameKo: '금 (국내 현물)',
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

const OZ_TO_GRAM = 31.1035;

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

    const goldKrw = indicators.find((i) => i.symbol === 'GOLD_KRW');
    const goldSpot = indicators.find((i) => i.symbol === 'GOLD_KRW_SPOT');
    const goldSpread = this.calcGoldSpread(
      goldKrw?.prices[0] ?? null,
      goldSpot?.prices[0] ?? null,
    );

    return indicators
      .map((ind) => ({
        dto: this.formatIndicator(
          ind,
          ind.prices[0] ?? null,
          bookmarkMap.has(ind.id),
          ind.symbol === 'GOLD_KRW' ? goldSpread : null,
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
    if (ind.symbol === 'GOLD_KRW') {
      const spotInd = await this.prisma.indicator.findUnique({
        where: { symbol: 'GOLD_KRW_SPOT' },
        include: { prices: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });
      spread = this.calcGoldSpread(
        ind.prices[0] ?? null,
        spotInd?.prices[0] ?? null,
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
   */
  async findHistory(_userId: string, symbol: string, days: number) {
    const ind = await this.prisma.indicator.findUnique({ where: { symbol } });

    if (!ind) {
      throw new NotFoundException('지표를 찾을 수 없습니다');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const prices = await this.prisma.indicatorPrice.findMany({
      where: {
        indicatorId: ind.id,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
      select: { price: true, recordedAt: true },
    });

    return {
      symbol: ind.symbol,
      nameKo: ind.nameKo,
      history: prices.map((p) => ({
        price: Number(p.price).toString(),
        recordedAt: p.recordedAt,
      })),
    };
  }

  /**
   * 즐겨찾기 목록 + 최신 시세
   */
  async findBookmarks(userId: string) {
    const [bookmarks, goldSpotInd] = await Promise.all([
      this.prisma.indicatorBookmark.findMany({
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
      }),
      this.prisma.indicator.findUnique({
        where: { symbol: 'GOLD_KRW_SPOT' },
        include: {
          prices: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return bookmarks.map((b) => {
      const spread =
        b.indicator.symbol === 'GOLD_KRW'
          ? this.calcGoldSpread(
              b.indicator.prices[0] ?? null,
              goldSpotInd?.prices[0] ?? null,
            )
          : null;
      return this.formatIndicator(
        b.indicator,
        b.indicator.prices[0] ?? null,
        true,
        spread,
      );
    });
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

    return { message: '즐겨찾기에 등록되었습니다' };
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

    return { message: '즐겨찾기에서 해제되었습니다' };
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
   */
  async savePrice(
    symbol: string,
    price: number,
    prevPrice: number | null,
    recordedAt?: Date,
  ) {
    const indicatorId = this.indicatorIdCache.get(symbol);
    if (!indicatorId) return;

    const change = prevPrice != null ? price - prevPrice : null;
    const changeRate =
      prevPrice != null && prevPrice !== 0
        ? ((price - prevPrice) / prevPrice) * 100
        : null;

    await this.prisma.indicatorPrice.create({
      data: {
        indicatorId,
        price,
        prevPrice,
        change,
        changeRate,
        recordedAt: recordedAt ?? new Date(),
      },
    });
  }

  /**
   * 과거 데이터 일괄 초기화 (어드민 1회 호출용)
   * - Yahoo: 지정 기간 일별 종가
   * - CoinGecko: 최대 365일
   * - BOK: 지정 기간 국고채 3년물
   * - GOLD_KRW: Yahoo GOLD_USD × USD_KRW 기반 계산
   */
  async initializeHistoricalData(days: number = 365): Promise<{
    yahoo: number;
    crypto: number;
    bond: number;
    goldKrw: number;
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
    let goldKrwCount = 0;

    // ── Yahoo historical ─────────────────────────────────────────
    this.logger.log(`[HistInit] Yahoo historical ${days}d ...`);
    const yahooRows = await this.yahoo.collectHistorical(from, to);

    // date별로 GOLD_USD, USD_KRW 값을 저장해 GOLD_KRW 계산
    const goldUsdByDate = new Map<string, number>();
    const usdKrwByDate = new Map<string, number>();

    const yahooInserts = yahooRows
      .filter((r) => idMap.has(r.symbol))
      .map((r) => {
        const dateKey = r.date.toISOString().slice(0, 10);
        if (r.symbol === 'GOLD_USD') goldUsdByDate.set(dateKey, r.close);
        if (r.symbol === 'USD_KRW') usdKrwByDate.set(dateKey, r.close);

        return {
          indicatorId: idMap.get(r.symbol),
          price: r.close,
          prevPrice: null,
          change: null,
          changeRate: null,
          recordedAt: r.date,
        };
      });

    if (yahooInserts.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: yahooInserts,
        skipDuplicates: true,
      });
      yahooCount = yahooInserts.length;
    }

    // ── GOLD_KRW 계산 삽입 ───────────────────────────────────────
    const goldKrwId = idMap.get('GOLD_KRW');
    if (goldKrwId) {
      const goldKrwInserts: {
        indicatorId: string;
        price: number;
        prevPrice: null;
        change: null;
        changeRate: null;
        recordedAt: Date;
      }[] = [];

      for (const [dateKey, goldUsd] of goldUsdByDate) {
        const usdKrw = usdKrwByDate.get(dateKey);
        if (usdKrw == null) continue;
        const goldKrw = (goldUsd * usdKrw) / OZ_TO_GRAM;
        goldKrwInserts.push({
          indicatorId: goldKrwId,
          price: goldKrw,
          prevPrice: null,
          change: null,
          changeRate: null,
          recordedAt: new Date(`${dateKey}T00:00:00Z`),
        });
      }

      if (goldKrwInserts.length > 0) {
        await this.prisma.indicatorPrice.createMany({
          data: goldKrwInserts,
          skipDuplicates: true,
        });
        goldKrwCount = goldKrwInserts.length;
      }
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

    this.logger.log(
      `[HistInit] Done — yahoo:${yahooCount} goldKrw:${goldKrwCount} crypto:${cryptoCount} bond:${bondCount}`,
    );

    return {
      yahoo: yahooCount,
      crypto: cryptoCount,
      bond: bondCount,
      goldKrw: goldKrwCount,
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
   * GOLD_KRW (환산가) vs GOLD_KRW_SPOT (현물가) 이격률 계산
   * 양수: 환산가가 현물가보다 높음 (프리미엄)
   * 음수: 환산가가 현물가보다 낮음 (디스카운트)
   */
  private calcGoldSpread(
    goldKrwPrice: LatestPrice,
    goldSpotPrice: LatestPrice,
  ): string | null {
    if (!goldKrwPrice || !goldSpotPrice) return null;
    const calc = Number(goldKrwPrice.price);
    const spot = Number(goldSpotPrice.price);
    if (spot <= 0) return null;
    return (((calc - spot) / spot) * 100).toFixed(2);
  }
}
