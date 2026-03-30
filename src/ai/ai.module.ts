import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from '@/ai/ai.controller';
import { AiService } from '@/ai/ai.service';
import { MarketBriefingController } from '@/ai/market-briefing.controller';
import { MarketBriefingService } from '@/ai/market-briefing.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController, MarketBriefingController],
  providers: [AiService, MarketBriefingService],
})
export class AiModule {}
