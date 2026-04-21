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
import { RedisService } from '@/redis/redis.service';
import { YahooCollector } from './scheduler/collectors/yahoo.collector';
import { CoinGeckoCollector } from './scheduler/collectors/coingecko.collector';
import { BokCollector } from './scheduler/collectors/bok.collector';
import { KoreaGoldCollector } from './scheduler/collectors/korea-gold.collector';
import { FearGreedCollector } from './scheduler/collectors/fear-greed.collector';

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
  {
    symbol: 'FEAR_GREED',
    name: 'Fear & Greed Index',
    nameKo: '공포탐욕지수',
    category: 'MACRO',
    unit: 'pt',
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
    private readonly redis: RedisService,
    private readonly yahoo: YahooCollector,
    private readonly coinGecko: CoinGeckoCollector,
    private readonly bok: BokCollector,
    private readonly koreaGold: KoreaGoldCollector,
    private readonly fearGreed: FearGreedCollector,
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
   * 조회 기간에 따라 데이터 소스 및 집계 단위를 자동 결정:
   *  - ~7일  : 실시간 DB, 1시간 단위, 주말 필터 (카테고리에 따라)
   *  - ~30일 : 실시간 DB, 6시간 단위, 주말 필터 (카테고리에 따라)
   *  - 30일 초과 : Yahoo Historical API 직접 조회 (휴장일 자동 제거)
   */
  async findHistory(_userId: string, symbol: string, days: number) {
    const ind = await this.prisma.indicator.findUnique({ where: { symbol } });

    if (!ind) {
      throw new NotFoundException('지표를 찾을 수 없습니다');
    }

    // 30일 초과: Yahoo Historical API 직접 조회 (공휴일/휴장일 자동 제거됨)
    if (days > 30) {
      return this.findHistoryFromYahoo(ind, days);
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setUTCHours(0, 0, 0, 0); // UTC 자정 기준으로 정규화 (MySQL 타임존 차이 방지)

    type RawRow = { bucket: string; price: string };

    // 기간별 집계 버킷 결정 (INTERVAL/FORMAT은 파라미터 바인딩 불가 → Prisma.raw 사용)
    let rows: RawRow[];

    if (days <= 7) {
      // 5분 단위: raw 데이터 그대로 반환 (KST ISO 문자열로 변환)
      rows = await this.prisma.$queryRaw<RawRow[]>`
        SELECT
          DATE_FORMAT(DATE_ADD(recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d %H:%i:00+09:00') AS bucket,
          CAST(price AS CHAR) AS price
        FROM indicator_prices
        WHERE indicatorId = ${ind.id}
          AND recordedAt >= ${since}
        ORDER BY recordedAt ASC
      `;
    } else {
      // 6시간 단위: 버킷 내 마지막 가격 (종가 개념)
      rows = await this.prisma.$queryRaw<RawRow[]>`
        SELECT
          CONCAT(
            DATE_FORMAT(DATE_ADD(p.recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d '),
            LPAD(FLOOR(HOUR(DATE_ADD(p.recordedAt, INTERVAL 9 HOUR)) / 6) * 6, 2, '0'),
            ':00:00+09:00'
          ) AS bucket,
          CAST(p.price AS CHAR) AS price
        FROM indicator_prices p
        INNER JOIN (
          SELECT
            CONCAT(
              DATE_FORMAT(DATE_ADD(recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d '),
              LPAD(FLOOR(HOUR(DATE_ADD(recordedAt, INTERVAL 9 HOUR)) / 6) * 6, 2, '0'),
              ':00:00+09:00'
            ) AS bucket,
            MAX(recordedAt) AS lastRecordedAt
          FROM indicator_prices
          WHERE indicatorId = ${ind.id}
            AND recordedAt >= ${since}
          GROUP BY bucket
        ) last ON p.recordedAt = last.lastRecordedAt AND p.indicatorId = ${ind.id}
        ORDER BY bucket ASC
      `;
    }

    // CRYPTO(BTC)는 24/7 거래 → 주말 필터 없음
    // 그 외(INDEX, CURRENCY, COMMODITY, BOND, MACRO 등)는 주말 bucket 제거
    const filteredRows =
      ind.category === 'CRYPTO'
        ? rows
        : rows.filter((r) => {
            const dow = new Date(r.bucket).getDay(); // bucket이 +09:00 오프셋 포함 → UTC 변환 후 요일 계산
            return dow !== 0 && dow !== 6;
          });

    const history = filteredRows.map((r) => ({
      price: Number(r.price).toString(),
      recordedAt: r.bucket, // KST ISO 문자열 그대로 반환 (e.g. "2026-04-07 09:00:00+09:00")
    }));

    // GOLD_KRW_SPOT: 동일 버킷의 GOLD_USD·USD_KRW로 이격률 시계열 추가
    let spreadHistory: { spread: string; recordedAt: string }[] | undefined;
    if (ind.symbol === 'GOLD_KRW_SPOT' && rows.length > 0) {
      const [goldUsdInd, usdKrwInd] = await Promise.all([
        this.prisma.indicator.findUnique({ where: { symbol: 'GOLD_USD' } }),
        this.prisma.indicator.findUnique({ where: { symbol: 'USD_KRW' } }),
      ]);

      if (goldUsdInd && usdKrwInd) {
        type SpreadRow = { bucket: string; goldUsd: string; usdKrw: string };
        let spreadRows: SpreadRow[];

        if (days <= 7) {
          spreadRows = await this.prisma.$queryRaw<SpreadRow[]>`
            SELECT
              CONCAT(DATE_FORMAT(DATE_ADD(g.recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d %H'), ':00:00+09:00') AS bucket,
              CAST(g.price AS CHAR) AS goldUsd,
              CAST(u.price AS CHAR) AS usdKrw
            FROM indicator_prices g
            JOIN (
              SELECT
                CONCAT(DATE_FORMAT(DATE_ADD(recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d %H'), ':00:00+09:00') AS bucket,
                MAX(recordedAt) AS lastRecordedAt
              FROM indicator_prices
              WHERE indicatorId = ${goldUsdInd.id} AND recordedAt >= ${since}
              GROUP BY bucket
            ) lg ON g.recordedAt = lg.lastRecordedAt AND g.indicatorId = ${goldUsdInd.id}
            JOIN (
              SELECT
                CONCAT(DATE_FORMAT(DATE_ADD(recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d %H'), ':00:00+09:00') AS bucket,
                MAX(recordedAt) AS lastRecordedAt
              FROM indicator_prices
              WHERE indicatorId = ${usdKrwInd.id} AND recordedAt >= ${since}
              GROUP BY bucket
            ) lu ON lu.bucket = lg.bucket
            JOIN indicator_prices u ON u.recordedAt = lu.lastRecordedAt AND u.indicatorId = ${usdKrwInd.id}
            ORDER BY bucket ASC
          `;
        } else {
          spreadRows = await this.prisma.$queryRaw<SpreadRow[]>`
            SELECT
              CONCAT(DATE_FORMAT(DATE_ADD(g.recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d '), LPAD(FLOOR(HOUR(DATE_ADD(g.recordedAt, INTERVAL 9 HOUR))/6)*6,2,'0'), ':00:00+09:00') AS bucket,
              CAST(g.price AS CHAR) AS goldUsd,
              CAST(u.price AS CHAR) AS usdKrw
            FROM indicator_prices g
            JOIN (
              SELECT
                CONCAT(DATE_FORMAT(DATE_ADD(recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d '), LPAD(FLOOR(HOUR(DATE_ADD(recordedAt, INTERVAL 9 HOUR))/6)*6,2,'0'), ':00:00+09:00') AS bucket,
                MAX(recordedAt) AS lastRecordedAt
              FROM indicator_prices
              WHERE indicatorId = ${goldUsdInd.id} AND recordedAt >= ${since}
              GROUP BY bucket
            ) lg ON g.recordedAt = lg.lastRecordedAt AND g.indicatorId = ${goldUsdInd.id}
            JOIN (
              SELECT
                CONCAT(DATE_FORMAT(DATE_ADD(recordedAt, INTERVAL 9 HOUR), '%Y-%m-%d '), LPAD(FLOOR(HOUR(DATE_ADD(recordedAt, INTERVAL 9 HOUR))/6)*6,2,'0'), ':00:00+09:00') AS bucket,
                MAX(recordedAt) AS lastRecordedAt
              FROM indicator_prices
              WHERE indicatorId = ${usdKrwInd.id} AND recordedAt >= ${since}
              GROUP BY bucket
            ) lu ON lu.bucket = lg.bucket
            JOIN indicator_prices u ON u.recordedAt = lu.lastRecordedAt AND u.indicatorId = ${usdKrwInd.id}
            ORDER BY bucket ASC
          `;
        }

        // 버킷 맵: bucket → spot price (주말 필터 적용된 rows 기준)
        const spotMap = new Map(
          filteredRows.map((r) => [r.bucket, Number(r.price)]),
        );

        spreadHistory = spreadRows
          .map((r) => {
            const spot = spotMap.get(r.bucket);
            if (spot == null) return null;
            const calc = (Number(r.goldUsd) * Number(r.usdKrw)) / 31.1035;
            if (calc <= 0) return null;
            return {
              spread: (((spot - calc) / calc) * 100).toFixed(2),
              recordedAt: r.bucket,
            };
          })
          .filter(
            (r): r is { spread: string; recordedAt: string } => r !== null,
          );
      }
    }

    return {
      symbol: ind.symbol,
      nameKo: ind.nameKo,
      history,
      ...(spreadHistory !== undefined && { spreadHistory }),
    };
  }

  /**
   * 30일 초과 히스토리 — Yahoo Historical API 직접 조회
   * Yahoo Historical은 휴장일 row를 반환하지 않으므로 공휴일 처리가 자동으로 해결됨
   * CRYPTO/BUFFETT_US 등 Yahoo 미지원 심볼은 DB fallback
   */
  private async findHistoryFromYahoo(
    ind: { id: string; symbol: string; nameKo: string },
    days: number,
  ) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    // Yahoo Historical 지원 심볼만 API로 조회
    // BTC_KRW, BUFFETT_US, GOLD_KRW_SPOT은 Yahoo에 없으므로 DB fallback
    const YAHOO_UNSUPPORTED = new Set([
      'BTC_KRW',
      'BUFFETT_US',
      'GOLD_KRW_SPOT',
      'FEAR_GREED',
    ]);

    if (!YAHOO_UNSUPPORTED.has(ind.symbol)) {
      try {
        const yahooRows = await this.yahoo.collectHistoricalForSymbol(
          ind.symbol,
          from,
          to,
        );

        if (yahooRows.length > 0) {
          const history = yahooRows.map((r) => ({
            price: r.close.toString(),
            recordedAt: r.date,
          }));

          return { symbol: ind.symbol, nameKo: ind.nameKo, history };
        }
      } catch (err) {
        this.logger.warn(
          `Yahoo Historical fallback to DB for ${ind.symbol}: ${(err as Error).message}`,
        );
      }
    }

    // DB fallback: 1일 단위
    type RawRow = { bucket: string; price: string };
    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        DATE_FORMAT(recordedAt, '%Y-%m-%d') AS bucket,
        CAST(AVG(price) AS CHAR) AS price
      FROM indicator_prices
      WHERE indicatorId = ${ind.id}
        AND recordedAt >= ${from}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const history = rows.map((r) => ({
      price: Number(r.price).toString(),
      recordedAt: new Date(r.bucket),
    }));

    return { symbol: ind.symbol, nameKo: ind.nameKo, history };
  }

  /**
   * 즐겨찾기 목록 + 최신 시세
   */
  async findBookmarks(userId: string) {
    type BookmarkRow = {
      symbol: string;
      name: string;
      nameKo: string;
      category: IndicatorCategory;
      unit: string;
      price: Decimal | null;
      prevPrice: Decimal | null;
      change: Decimal | null;
      changeRate: Decimal | null;
      recordedAt: Date | null;
    };

    const rows = await this.prisma.$queryRaw<BookmarkRow[]>`
      SELECT
        i.symbol,
        i.name,
        i.nameKo,
        i.category,
        i.unit,
        ip.price,
        ip.prevPrice,
        ip.\`change\`,
        ip.changeRate,
        ip.recordedAt
      FROM indicator_bookmarks ib
      JOIN indicators i ON ib.indicatorId = i.id
      LEFT JOIN indicator_prices ip
        ON ip.indicatorId = i.id
        AND ip.recordedAt = (
          SELECT MAX(ip2.recordedAt)
          FROM indicator_prices ip2
          WHERE ip2.indicatorId = i.id
        )
      WHERE ib.userId = ${userId}
      ORDER BY ib.sortOrder ASC
    `;

    const hasGoldSpot = rows.some((r) => r.symbol === 'GOLD_KRW_SPOT');
    let goldUsdPrice: LatestPrice = null;
    let usdKrwPrice: LatestPrice = null;

    if (hasGoldSpot) {
      type SpreadRow = {
        price: Decimal;
        prevPrice: Decimal | null;
        change: Decimal | null;
        changeRate: Decimal | null;
        recordedAt: Date;
      };
      const [goldUsdRows, usdKrwRows] = await Promise.all([
        this.prisma.$queryRaw<SpreadRow[]>`
          SELECT ip.price, ip.prevPrice, ip.\`change\`, ip.changeRate, ip.recordedAt
          FROM indicators i
          JOIN indicator_prices ip ON ip.indicatorId = i.id
          WHERE i.symbol = 'GOLD_USD'
          ORDER BY ip.recordedAt DESC
          LIMIT 1
        `,
        this.prisma.$queryRaw<SpreadRow[]>`
          SELECT ip.price, ip.prevPrice, ip.\`change\`, ip.changeRate, ip.recordedAt
          FROM indicators i
          JOIN indicator_prices ip ON ip.indicatorId = i.id
          WHERE i.symbol = 'USD_KRW'
          ORDER BY ip.recordedAt DESC
          LIMIT 1
        `,
      ]);
      goldUsdPrice = goldUsdRows[0] ?? null;
      usdKrwPrice = usdKrwRows[0] ?? null;
    }

    return rows.map((r) => {
      const latestPrice: LatestPrice = r.price
        ? {
            price: r.price,
            prevPrice: r.prevPrice,
            change: r.change,
            changeRate: r.changeRate,
            recordedAt: r.recordedAt,
          }
        : null;

      return this.formatIndicator(
        r,
        latestPrice,
        true,
        r.symbol === 'GOLD_KRW_SPOT'
          ? this.calcGoldSpread(latestPrice, goldUsdPrice, usdKrwPrice)
          : null,
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

    // 직전 가격과 동일하면 저장 skip (장 마감 후 야후가 같은 값을 반복 반환하는 노이즈 방지)
    if (resolvedPrev != null && Math.abs(price - resolvedPrev) < 0.0001) return;

    const change = resolvedPrev != null ? price - resolvedPrev : null;
    const changeRate =
      resolvedPrev != null && resolvedPrev !== 0
        ? ((price - resolvedPrev) / resolvedPrev) * 100
        : null;

    const ts = recordedAt ?? new Date();

    await this.prisma.indicatorPrice.create({
      data: {
        indicatorId,
        price,
        prevPrice: resolvedPrev,
        change,
        changeRate,
        recordedAt: ts,
      },
    });

    // Python AI 에이전트가 시황 분석에 사용할 수 있도록 Redis에 시계열 누적
    // LPUSH + LTRIM으로 최신 1000개 유지 (5분 주기 기준 약 3.5일치)
    await this.redis.pushIndicatorHistory(symbol, {
      symbol,
      price,
      prevPrice: resolvedPrev,
      change,
      changeRate,
      recordedAt: ts.toISOString(),
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
    fearGreed: number;
    deleted: number;
  }> {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    // 30일 이내 일별 데이터(TIME = 00:00:00)는 실시간 수집이 담당하므로 저장하지 않음
    // init-history는 30일 초과 장기 데이터만 담당
    const REALTIME_THRESHOLD_DAYS = 30;
    const realtimeCutoff = new Date();
    realtimeCutoff.setDate(realtimeCutoff.getDate() - REALTIME_THRESHOLD_DAYS);

    // 이미 있는 indicatorId를 캐싱 (매 row마다 findUnique 방지)
    const indicators = await this.prisma.indicator.findMany({
      select: { id: true, symbol: true },
    });
    const idMap = new Map(indicators.map((i) => [i.symbol, i.id]));

    // ── 기존에 잘못 저장된 30일 이내 장 외 시간 데이터 삭제 ──
    // 1) 일별 init 데이터 (TIME = 00:00:00)
    // 2) 장 마감 후 중복 수집된 아시아/미국 지수 데이터 (장 외 UTC 시간대)
    this.logger.log(
      `[HistInit] Cleaning up stale data within ${REALTIME_THRESHOLD_DAYS}d ...`,
    );

    // 일별 init 데이터 삭제 (30일 이내만 — 장기 데이터는 일별이 정상)
    const deletedDaily = await this.prisma.$executeRaw`
      DELETE FROM indicator_prices
      WHERE recordedAt >= ${realtimeCutoff}
        AND TIME(recordedAt) = '00:00:00'
    `;

    // 장 외 시간 아시아 지수 삭제 — 전체 기간
    // UTC 00:30 이전(장 초반 워밍업) 또는 06:30 이후(장 마감 후)
    const deletedAsiaAfterClose = await this.prisma.$executeRaw`
      DELETE ip FROM indicator_prices ip
      JOIN indicators i ON ip.indicatorId = i.id
      WHERE i.symbol IN ('KOSPI', 'KOSDAQ', 'NIKKEI225', 'TWSE')
        AND (
          (HOUR(ip.recordedAt) * 60 + MINUTE(ip.recordedAt)) < 30
          OR (HOUR(ip.recordedAt) * 60 + MINUTE(ip.recordedAt)) >= 390
        )
    `;

    // 장 외 시간 미국 지수 삭제 — 전체 기간 (UTC 13:30 이전 또는 21:00 이후)
    const deletedUsAfterClose = await this.prisma.$executeRaw`
      DELETE ip FROM indicator_prices ip
      JOIN indicators i ON ip.indicatorId = i.id
      WHERE i.symbol IN ('SP500', 'NASDAQ', 'NQ100', 'DJI', 'RUSSELL2000', 'VIX', 'US10Y')
        AND (
          (HOUR(ip.recordedAt) * 60 + MINUTE(ip.recordedAt)) < 810
          OR (HOUR(ip.recordedAt) * 60 + MINUTE(ip.recordedAt)) >= 1260
        )
    `;

    const deleteResult =
      deletedDaily + deletedAsiaAfterClose + deletedUsAfterClose;
    this.logger.log(
      `[HistInit] Deleted ${deleteResult} stale rows (daily:${deletedDaily} asiaOOH:${deletedAsiaAfterClose} usOOH:${deletedUsAfterClose})`,
    );

    let yahooCount = 0;

    // ── Yahoo historical (30일 초과분만) ─────────────────────────
    this.logger.log(`[HistInit] Yahoo historical ${days}d ...`);
    const yahooRows = await this.yahoo.collectHistorical(from, to);

    const yahooInserts = yahooRows
      .filter((r) => idMap.has(r.symbol) && r.date < realtimeCutoff)
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

    // ── CoinGecko BTC/KRW (30일 초과분만) ───────────────────────
    this.logger.log(`[HistInit] CoinGecko historical ${days}d ...`);
    const btcRows = await this.coinGecko.collectHistorical(Math.min(days, 365));
    const btcId = idMap.get('BTC_KRW');
    let cryptoCount = 0;

    if (btcId && btcRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: btcRows
          .filter((r) => r.date < realtimeCutoff)
          .map((r) => ({
            indicatorId: btcId,
            price: r.price,
            prevPrice: null,
            change: null,
            changeRate: null,
            recordedAt: r.date,
          })),
        skipDuplicates: true,
      });
      cryptoCount = btcRows.filter((r) => r.date < realtimeCutoff).length;
    }

    // ── BOK KR3Y (30일 초과분만) ─────────────────────────────────
    this.logger.log(`[HistInit] BOK KR3Y historical ${days}d ...`);
    const bokRows = await this.bok.getKr3yHistory(from, to);
    const kr3yId = idMap.get('KR3Y');
    let bondCount = 0;

    if (kr3yId && bokRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: bokRows
          .filter((r) => r.date < realtimeCutoff)
          .map((r) => ({
            indicatorId: kr3yId,
            price: r.rate,
            prevPrice: null,
            change: null,
            changeRate: null,
            recordedAt: r.date,
          })),
        skipDuplicates: true,
      });
      bondCount = bokRows.filter((r) => r.date < realtimeCutoff).length;
    }

    // ── GOLD_KRW_SPOT 현물가 전체 기간 ───────────────────────────
    this.logger.log(`[HistInit] KoreaGold historical (ALL) ...`);
    const goldRows = await this.koreaGold.collectHistorical();
    const goldSpotId = idMap.get('GOLD_KRW_SPOT');
    let goldSpotCount = 0;

    if (goldSpotId && goldRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: goldRows
          .filter((r) => r.date < realtimeCutoff)
          .map((r) => ({
            indicatorId: goldSpotId,
            price: r.pricePerGram,
            prevPrice: null,
            change: null,
            changeRate: null,
            recordedAt: r.date,
          })),
        skipDuplicates: true,
      });
      goldSpotCount = goldRows.filter((r) => r.date < realtimeCutoff).length;
    }

    // ── Fear & Greed Index (30일 초과분만) ───────────────────────
    this.logger.log(
      `[HistInit] Fear & Greed historical ${Math.min(days, 365)}d ...`,
    );
    const fgRows = await this.fearGreed.collectHistorical(Math.min(days, 365));
    const fgId = idMap.get('FEAR_GREED');
    let fearGreedCount = 0;

    if (fgId && fgRows.length > 0) {
      await this.prisma.indicatorPrice.createMany({
        data: fgRows
          .filter((r) => r.date < realtimeCutoff)
          .map((r) => ({
            indicatorId: fgId,
            price: r.value,
            prevPrice: null,
            change: null,
            changeRate: null,
            recordedAt: r.date,
          })),
        skipDuplicates: true,
      });
      fearGreedCount = fgRows.filter((r) => r.date < realtimeCutoff).length;
    }

    this.logger.log(
      `[HistInit] Done — yahoo:${yahooCount} crypto:${cryptoCount} bond:${bondCount} goldSpot:${goldSpotCount} fearGreed:${fearGreedCount} deleted:${deleteResult}`,
    );

    return {
      yahoo: yahooCount,
      crypto: cryptoCount,
      bond: bondCount,
      goldSpot: goldSpotCount,
      fearGreed: fearGreedCount,
      deleted: deleteResult,
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
