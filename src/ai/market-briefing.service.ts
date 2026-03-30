import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import {
  MarketBriefingDto,
  MarketBriefingResponseDto,
} from '@/ai/dto/market-briefing-response.dto';

@Injectable()
export class MarketBriefingService {
  private readonly logger = new Logger(MarketBriefingService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Redis에 저장된 모든 시황 브리핑 조회
   */
  async getBriefings(): Promise<MarketBriefingResponseDto> {
    const [macro, domesticMarket, globalMarket] = await Promise.all([
      this.redisService.get<MarketBriefingDto>('market_briefing:MACRO'),
      this.redisService.get<MarketBriefingDto>(
        'market_briefing:DOMESTIC_MARKET',
      ),
      this.redisService.get<MarketBriefingDto>('market_briefing:GLOBAL_MARKET'),
    ]);

    return {
      macro,
      domestic_market: domesticMarket,
      global_market: globalMarket,
    };
  }
}
