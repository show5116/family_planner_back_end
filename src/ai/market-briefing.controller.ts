import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketBriefingService } from '@/ai/market-briefing.service';
import { MarketBriefingResponseDto } from '@/ai/dto/market-briefing-response.dto';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';

/**
 * 시황 브리핑 컨트롤러
 * AI 에이전트가 Redis에 저장한 시황 분석 결과 조회 API
 */
@ApiTags('AI')
@Controller('ai/market-briefing')
@ApiCommonAuthResponses()
export class MarketBriefingController {
  constructor(private readonly marketBriefingService: MarketBriefingService) {}

  @Get()
  @ApiOperation({ summary: '시황 브리핑 조회 (매크로, 국내, 글로벌)' })
  @ApiSuccess(MarketBriefingResponseDto, '시황 브리핑 조회 성공')
  getBriefings() {
    return this.marketBriefingService.getBriefings();
  }
}
