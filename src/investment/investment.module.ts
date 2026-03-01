import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@/prisma/prisma.module';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { InvestmentScheduler } from './scheduler/investment.scheduler';
import { YahooCollector } from './scheduler/collectors/yahoo.collector';
import { CoinGeckoCollector } from './scheduler/collectors/coingecko.collector';
import { FredCollector } from './scheduler/collectors/fred.collector';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [InvestmentController],
  providers: [
    InvestmentService,
    InvestmentScheduler,
    YahooCollector,
    CoinGeckoCollector,
    FredCollector,
  ],
  exports: [InvestmentService],
})
export class InvestmentModule {}
