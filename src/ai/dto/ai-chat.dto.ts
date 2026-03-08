import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AiChatDto {
  @ApiProperty({
    description: '사용자 메시지',
    example: '이번 주말 가족 일정을 추천해줘.',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: '채팅방 고유 ID (대화 이력 구분)',
    example: 'room-uuid-5678',
    required: false,
  })
  @IsOptional()
  @IsString()
  room_id?: string;

  @ApiProperty({
    description: '호출할 AI 에이전트 (기본값: supervisor)',
    example: 'planner',
    required: false,
  })
  @IsOptional()
  @IsString()
  target_agent?: string;
}
