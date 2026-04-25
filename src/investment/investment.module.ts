import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { InvestmentScheduler } from './scheduler/investment.scheduler';
import { YahooCollector } from './scheduler/collectors/yahoo.collector';
import { CoinGeckoCollector } from './scheduler/collectors/coingecko.collector';
import { FredCollector } from './scheduler/collectors/fred.collector';
import { BokCollector } from './scheduler/collectors/bok.collector';
import { KoreaGoldCollector } from './scheduler/collectors/korea-gold.collector';
import { FearGreedCollector } from './scheduler/collectors/fear-greed.collector';

@Module({
  imports: [PrismaModule],
  controllers: [InvestmentController],
  providers: [
    InvestmentService,
    InvestmentScheduler,
    YahooCollector,
    CoinGeckoCollector,
    FredCollector,
    BokCollector,
    KoreaGoldCollector,
    FearGreedCollector,
  ],
  exports: [InvestmentService],
})
export class InvestmentModule {}
