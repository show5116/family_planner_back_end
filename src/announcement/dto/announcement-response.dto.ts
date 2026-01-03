import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementCategory } from '@/announcement/enums/announcement-category.enum';

/**
 * 작성자 정보 (간략)
 */
export class AnnouncementAuthorDto {
  @ApiProperty({ description: '작성자 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '작성자 이름', example: '관리자' })
  name: string;
}

/**
 * 공지사항 응답 DTO
 */
export class AnnouncementDto {
  @ApiProperty({ description: '공지사항 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '제목', example: '시스템 점검 안내' })
  title: string;

  @ApiProperty({
    description: '내용',
    example: '2025년 1월 1일 오전 2시~4시 시스템 점검 예정입니다.',
  })
  content: string;

  @ApiProperty({
    description: '카테고리',
    enum: AnnouncementCategory,
    enumName: 'AnnouncementCategory',
    example: AnnouncementCategory.ANNOUNCEMENT,
  })
  category: AnnouncementCategory;

  @ApiProperty({ description: '고정 여부', example: false })
  isPinned: boolean;

  @ApiProperty({ description: '작성자 정보', type: AnnouncementAuthorDto })
  author: AnnouncementAuthorDto;

  @ApiProperty({ description: '읽은 사람 수', example: 42 })
  readCount: number;

  @ApiProperty({ description: '현재 사용자가 읽었는지 여부', example: false })
  isRead: boolean;

  @ApiProperty({ description: '생성일', example: '2025-12-30T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-30T00:00:00Z' })
  updatedAt: Date;
}

/**
 * 공지사항 목록 응답 DTO (페이지네이션)
 */
export class PaginatedAnnouncementDto {
  @ApiProperty({ type: [AnnouncementDto], description: '공지사항 목록' })
  data: AnnouncementDto[];

  @ApiProperty({
    description: '페이지네이션 메타 정보',
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 메시지 응답 DTO
 */
export class MessageResponseDto {
  @ApiProperty({ example: '작업이 완료되었습니다' })
  message: string;
}
