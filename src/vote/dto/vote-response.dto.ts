import { ApiProperty } from '@nestjs/swagger';

export class VoteOptionDto {
  @ApiProperty({ description: '선택지 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '선택지 내용', example: '치킨' })
  label: string;

  @ApiProperty({ description: '득표 수', example: 3 })
  count: number;

  @ApiProperty({ description: '현재 사용자의 선택 여부', example: false })
  isSelected: boolean;

  @ApiProperty({
    description: '투표한 사용자 목록 (익명 투표 시 빈 배열)',
    type: [String],
    example: ['홍길동', '김철수'],
  })
  voters: string[];
}

export class VoteDto {
  @ApiProperty({ description: '투표 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '그룹 ID', example: 'uuid-5678' })
  groupId: string;

  @ApiProperty({ description: '투표 제목', example: '저녁 메뉴 투표' })
  title: string;

  @ApiProperty({
    description: '투표 설명',
    example: '오늘 저녁 뭐 먹을까요?',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: '복수 선택 허용 여부', example: false })
  isMultiple: boolean;

  @ApiProperty({ description: '익명 투표 여부', example: false })
  isAnonymous: boolean;

  @ApiProperty({ description: '마감 시각', nullable: true })
  endsAt: Date | null;

  @ApiProperty({ description: '진행 중 여부', example: true })
  isOngoing: boolean;

  @ApiProperty({ description: '총 투표 참여자 수', example: 5 })
  totalVoters: number;

  @ApiProperty({ description: '현재 사용자 참여 여부', example: false })
  hasVoted: boolean;

  @ApiProperty({ description: '작성자 이름', example: '홍길동' })
  creatorName: string;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  @ApiProperty({ description: '선택지 목록', type: [VoteOptionDto] })
  options: VoteOptionDto[];
}

export class PaginatedVoteDto {
  @ApiProperty({ type: [VoteDto] })
  items: VoteDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
