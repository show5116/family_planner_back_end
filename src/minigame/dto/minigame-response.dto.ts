import { ApiProperty } from '@nestjs/swagger';
import { MinigameType } from './create-minigame-result.dto';

export class MinigameResultDto {
  @ApiProperty({ description: '결과 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  groupId: string;

  @ApiProperty({
    description: '게임 타입',
    enum: MinigameType,
    example: MinigameType.LADDER,
  })
  gameType: MinigameType;

  @ApiProperty({ description: '게임 제목', example: '저녁 메뉴 정하기' })
  title: string;

  @ApiProperty({
    description: '참여자 이름 목록',
    example: ['아빠', '엄마', '민준'],
    type: [String],
  })
  participants: string[];

  @ApiProperty({
    description: '결과 항목 목록',
    example: ['삼겹살', '치킨', '피자'],
    type: [String],
  })
  options: string[];

  @ApiProperty({
    description: '게임 결과',
    example: { assignments: [{ participant: '아빠', option: '치킨' }] },
  })
  result: Record<string, unknown>;

  @ApiProperty({ description: '생성자 userId', example: 'uuid-user' })
  createdBy: string;

  @ApiProperty({
    description: '생성 시각',
    example: '2026-03-06T12:00:00.000Z',
  })
  createdAt: Date;
}

export class PaginatedMinigameResultDto {
  @ApiProperty({ type: [MinigameResultDto] })
  items: MinigameResultDto[];

  @ApiProperty({ description: '전체 개수', example: 42 })
  total: number;

  @ApiProperty({ description: '더 있는지 여부', example: true })
  hasMore: boolean;
}

export class MessageResponseDto {
  @ApiProperty({ example: '작업이 완료되었습니다' })
  message: string;
}
