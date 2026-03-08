import { ApiProperty } from '@nestjs/swagger';

export class AiChatResponseDto {
  @ApiProperty({
    description: 'AI 응답 메시지',
    example: '이번 주말 메뉴로는 파스타 어떠신가요?',
  })
  response: string;

  @ApiProperty({
    description: '생성된 플랜 (없을 경우 null)',
    example: null,
    nullable: true,
  })
  plan: string | null;

  @ApiProperty({
    description: '채팅방 ID (클라이언트가 다음 요청 시 재사용)',
    example: 'room-uuid-5678',
  })
  room_id: string;
}
