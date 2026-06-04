import { ApiProperty } from '@nestjs/swagger';
import { MemoFormat } from '@/memo/enums/memo-format.enum';
import { MemoVisibility } from '@/memo/enums/memo-visibility.enum';

export class MemoTagDto {
  @ApiProperty({ description: '태그 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '태그 이름', example: '중요' })
  name: string;
}

export class MemoAttachmentDto {
  @ApiProperty({ description: '첨부파일 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '파일 이름', example: 'document.pdf' })
  fileName: string;

  @ApiProperty({ description: '파일 URL' })
  fileUrl: string;

  @ApiProperty({ description: '파일 크기 (bytes)', example: 1024 })
  fileSize: number;

  @ApiProperty({ description: 'MIME 타입', example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;
}

export class MemoAuthorDto {
  @ApiProperty({ description: '작성자 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '작성자 이름', example: '홍길동' })
  name: string;
}

export class ChecklistMetaDto {
  @ApiProperty({ description: '전체 체크리스트 항목 수', example: 11 })
  total: number;

  @ApiProperty({ description: '체크된 항목 수', example: 3 })
  checked: number;
}

export class MemoDto {
  @ApiProperty({ description: '메모 ID', example: 'uuid-1234' })
  id: string;

  @ApiProperty({ description: '제목', example: '외박 준비물' })
  title: string;

  @ApiProperty({ description: 'Delta JSON 문자열 또는 일반 텍스트' })
  content: string;

  @ApiProperty({ description: '메모 형식', enum: MemoFormat })
  format: MemoFormat;

  @ApiProperty({ description: '공개 범위', enum: MemoVisibility })
  visibility: MemoVisibility;

  @ApiProperty({ description: '핀 여부', example: false })
  isPinned: boolean;

  @ApiProperty({ description: '그룹 ID', nullable: true })
  groupId: string | null;

  @ApiProperty({ description: '작성자 정보', type: MemoAuthorDto })
  user: MemoAuthorDto;

  @ApiProperty({ description: '태그 목록', type: [MemoTagDto] })
  tags: MemoTagDto[];

  @ApiProperty({ description: '첨부파일 목록', type: [MemoAttachmentDto] })
  attachments: MemoAttachmentDto[];

  @ApiProperty({
    description: '체크리스트 집계 (체크리스트 없으면 total=0)',
    type: ChecklistMetaDto,
  })
  checklistMeta: ChecklistMetaDto;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;
}

export class MemoTagNamesDto {
  @ApiProperty({
    description: '태그 이름 목록',
    example: ['중요', '업무', '가족'],
  })
  tags: string[];
}

export class PaginatedMemoDto {
  @ApiProperty({ type: [MemoDto], description: '메모 목록' })
  data: MemoDto[];

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
