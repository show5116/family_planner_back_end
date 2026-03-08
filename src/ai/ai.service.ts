import { HttpService } from '@nestjs/axios';
import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { AiChatDto } from '@/ai/dto/ai-chat.dto';
import { AiChatResponseDto } from '@/ai/dto/ai-chat-response.dto';

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('ai.microserviceUrl');
    this.apiKey = this.configService.get<string>('ai.microserviceApiKey');
  }

  /**
   * 플래너 에이전트 채팅 요청
   */
  async chat(userId: string, dto: AiChatDto): Promise<AiChatResponseDto> {
    const roomId = dto.room_id ?? randomUUID();
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-Request-ID': randomUUID(),
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<Omit<AiChatResponseDto, 'room_id'>>(
          `${this.baseUrl}/api/v1/planner/chat`,
          {
            message: dto.message,
            user_id: userId,
            room_id: roomId,
            target_agent: dto.target_agent,
          },
          { headers },
        ),
      );
      return { ...data, room_id: roomId };
    } catch (error) {
      throw new BadGatewayException('AI 서비스 호출에 실패했습니다');
    }
  }
}
