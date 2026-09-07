import { ApiProperty } from '@nestjs/swagger';
import { DiaryFormat } from '@/diary/enums/diary-format.enum';
import { DiaryVisibility } from '@/diary/enums/diary-visibility.enum';

export class DiaryAuthorDto {
  @ApiProperty({ description: '작성자 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '작성자 이름', example: '홍길동' })
  name: string;
}

export class DiaryDto {
  @ApiProperty({ description: '일기 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({
    description: "일기 날짜 ('YYYY-MM-DD')",
    example: '2026-09-01',
  })
  date: string;

  @ApiProperty({ description: '제목', example: '가을 첫날', nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Delta JSON 문자열 또는 일반 텍스트' })
  content: string;

  @ApiProperty({ description: '검색용 평문 (서버 추출)', nullable: true })
  plainText: string | null;

  @ApiProperty({ description: '일기 형식', enum: DiaryFormat })
  format: DiaryFormat;

  @ApiProperty({ description: '공개 범위', enum: DiaryVisibility })
  visibility: DiaryVisibility;

  @ApiProperty({
    description: '기분 이모지/코드',
    example: '😊',
    nullable: true,
  })
  mood: string | null;

  @ApiProperty({ description: '날씨 코드', example: 'SUNNY', nullable: true })
  weather: string | null;

  @ApiProperty({ description: '그룹 ID', nullable: true })
  groupId: string | null;

  @ApiProperty({ description: '작성자 정보', type: DiaryAuthorDto })
  user: DiaryAuthorDto;

  @ApiProperty({
    description: '첨부 미디어 존재 여부 (Phase 1에서는 항상 false)',
  })
  hasMedia: boolean;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class PaginatedDiaryDto {
  @ApiProperty({ type: [DiaryDto], description: '일기 목록' })
  data: DiaryDto[];

  @ApiProperty({
    description: '페이지네이션 메타 정보',
    example: { total: 100, page: 1, limit: 20, totalPages: 5 },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AppendedFragmentDto {
  @ApiProperty({
    description: '추가된 텍스트 조각',
    example: '점심에 본 고양이',
  })
  text: string;

  @ApiProperty({
    description: "조각 시각 마커 ('HH:mm')",
    example: '14:32',
    nullable: true,
  })
  capturedAt: string | null;
}

export class AppendDiaryResultDto {
  @ApiProperty({ description: '일기 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({
    description: "일기 날짜 ('YYYY-MM-DD')",
    example: '2026-09-01',
  })
  date: string;

  @ApiProperty({
    description: '이 요청으로 일기가 새로 생성되었는지',
    example: true,
  })
  created: boolean;

  @ApiProperty({ description: '추가된 조각', type: AppendedFragmentDto })
  appended: AppendedFragmentDto;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class DiaryCalendarDayDto {
  @ApiProperty({ description: "날짜 ('YYYY-MM-DD')", example: '2026-09-01' })
  date: string;

  @ApiProperty({ description: '일기 ID', example: 'uuid-1234' })
  diaryId: string;

  @ApiProperty({ description: '작성자 ID', example: 'uuid-1234' })
  userId: string;

  @ApiProperty({ description: '작성자 이름', example: '홍길동' })
  authorName: string;

  @ApiProperty({
    description: '기분 이모지/코드',
    example: '😊',
    nullable: true,
  })
  mood: string | null;

  @ApiProperty({
    description: '첨부 미디어 존재 여부 (Phase 1에서는 항상 false)',
  })
  hasMedia: boolean;
}

export class DiaryCalendarDto {
  @ApiProperty({
    description: '작성 현황 (그룹 조회 시 같은 날짜가 여러 건일 수 있음)',
    type: [DiaryCalendarDayDto],
  })
  days: DiaryCalendarDayDto[];
}

export class DiaryStreakDto {
  @ApiProperty({ description: '현재 연속 작성일수', example: 5 })
  currentStreak: number;

  @ApiProperty({ description: '이번 달 작성일수', example: 12 })
  thisMonthCount: number;

  @ApiProperty({ description: '최장 연속 작성일수', example: 23 })
  longestStreak: number;
}

export class DiaryFlashbackItemDto {
  @ApiProperty({ description: '일기 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({
    description: "일기 날짜 ('YYYY-MM-DD')",
    example: '2025-09-01',
  })
  date: string;

  @ApiProperty({ description: '회고 라벨', example: '1년 전 오늘' })
  label: string;

  @ApiProperty({ description: '제목', example: '가을 첫날', nullable: true })
  title: string | null;

  @ApiProperty({ description: '본문 발췌 (평문 앞부분)', nullable: true })
  excerpt: string | null;

  @ApiProperty({
    description: '기분 이모지/코드',
    example: '😊',
    nullable: true,
  })
  mood: string | null;
}

export class DiaryFlashbackDto {
  @ApiProperty({
    description: '회고 목록 (없으면 빈 배열)',
    type: [DiaryFlashbackItemDto],
  })
  items: DiaryFlashbackItemDto[];
}
