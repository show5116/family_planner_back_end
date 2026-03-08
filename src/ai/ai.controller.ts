import { Controller, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from '@/ai/ai.service';
import { AiChatDto } from '@/ai/dto/ai-chat.dto';
import { AiChatResponseDto } from '@/ai/dto/ai-chat-response.dto';
import { ApiSuccess } from '@/common/decorators/api-responses.decorator';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';

/**
 * AI 에이전트 컨트롤러
 * FastAPI + LangGraph AI 마이크로서비스 프록시 API
 */
@ApiTags('AI')
@Controller('ai')
@ApiCommonAuthResponses()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: '플래너 AI 채팅' })
  @ApiSuccess(AiChatResponseDto, 'AI 응답 성공')
  chat(@Request() req, @Body() dto: AiChatDto) {
    return this.aiService.chat(req.user.userId, dto);
  }
}
