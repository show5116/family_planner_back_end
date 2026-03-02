import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { IndicatorCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 앱 시작 시 지표 마스터 데이터 upsert
   */
  async onModuleInit() {
    for (const ind of INDICATORS) {
      await this.prisma.indicator.upsert({
        where: { symbol: ind.symbol },
        update: {
          name: ind.name,
          nameKo: ind.nameKo,
          category: ind.category,
          unit: ind.unit,
        },
        create: ind,
      });
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
        select: { indicatorId: true },
      }),
    ]);

    const bookmarkedIds = new Set(bookmarks.map((b) => b.indicatorId));

    return indicators.map((ind) =>
      this.formatIndicator(
        ind,
        ind.prices[0] ?? null,
        bookmarkedIds.has(ind.id),
      ),
    );
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

    return this.formatIndicator(
      ind,
      ind.prices[0] ?? null,
      ind.bookmarks.length > 0,
    );
  }

  /**
   * 시세 히스토리 (시계열)
   */
  async findHistory(userId: string, symbol: string, days: number) {
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
      orderBy: { createdAt: 'asc' },
    });

    return bookmarks.map((b) =>
      this.formatIndicator(b.indicator, b.indicator.prices[0] ?? null, true),
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

    await this.prisma.indicatorBookmark.create({
      data: { userId, indicatorId: ind.id },
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
   * 시세 저장 (Collector에서 호출)
   */
  async savePrice(
    symbol: string,
    price: number,
    prevPrice: number | null,
    recordedAt?: Date,
  ) {
    const ind = await this.prisma.indicator.findUnique({ where: { symbol } });
    if (!ind) return;

    const change = prevPrice != null ? price - prevPrice : null;
    const changeRate =
      prevPrice != null && prevPrice !== 0
        ? ((price - prevPrice) / prevPrice) * 100
        : null;

    await this.prisma.indicatorPrice.create({
      data: {
        indicatorId: ind.id,
        price,
        prevPrice,
        change,
        changeRate,
        recordedAt: recordedAt ?? new Date(),
      },
    });
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
    };
  }
}
