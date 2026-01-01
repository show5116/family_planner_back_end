import { ApiProperty } from '@nestjs/swagger';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionCategory } from '../enums/question-category.enum';
import { QuestionVisibility } from '../enums/question-visibility.enum';
import { AttachmentDto } from './attachment.dto';

/**
 * 사용자 정보 (간략)
 */
export class QuestionUserDto {
  @ApiProperty({ description: '사용자 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '사용자 이름', example: '홍길동' })
  name: string;
}

/**
 * 질문 응답 DTO (목록용)
 */
export class QuestionListDto {
  @ApiProperty({ description: '질문 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '제목', example: '그룹 초대는 어떻게 하나요?' })
  title: string;

  @ApiProperty({ description: '내용 (미리보기 100자)', example: '안녕하세요. 그룹에 가족을 초대하고 싶은데...' })
  content: string;

  @ApiProperty({ description: '카테고리', enum: QuestionCategory, example: QuestionCategory.FEATURE })
  category: QuestionCategory;

  @ApiProperty({ description: '질문 상태', enum: QuestionStatus, example: QuestionStatus.PENDING })
  status: QuestionStatus;

  @ApiProperty({ description: '공개 여부', enum: QuestionVisibility, example: QuestionVisibility.PUBLIC })
  visibility: QuestionVisibility;

  @ApiProperty({ description: '답변 수', example: 1 })
  answerCount: number;

  @ApiProperty({ description: '작성자 정보', type: QuestionUserDto })
  user: QuestionUserDto;

  @ApiProperty({ description: '생성일', example: '2025-12-30T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-30T00:00:00Z' })
  updatedAt: Date;
}

/**
 * 답변 응답 DTO
 */
export class AnswerDto {
  @ApiProperty({ description: '답변 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '답변 내용', example: '그룹 초대는 그룹 설정 메뉴에서 가능합니다...' })
  content: string;

  @ApiProperty({ description: '작성자 ID', example: 'uuid' })
  adminId: string;

  @ApiProperty({ description: '작성자 정보', type: QuestionUserDto })
  admin: QuestionUserDto;

  @ApiProperty({ description: '첨부파일 목록', type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty({ description: '생성일', example: '2025-12-30T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-30T00:00:00Z' })
  updatedAt: Date;
}

/**
 * 질문 상세 응답 DTO
 */
export class QuestionDetailDto {
  @ApiProperty({ description: '질문 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '제목', example: '그룹 초대는 어떻게 하나요?' })
  title: string;

  @ApiProperty({ description: '내용', example: '안녕하세요. 그룹에 가족을 초대하고 싶은데 방법을 모르겠습니다.' })
  content: string;

  @ApiProperty({ description: '카테고리', enum: QuestionCategory, example: QuestionCategory.FEATURE })
  category: QuestionCategory;

  @ApiProperty({ description: '질문 상태', enum: QuestionStatus, example: QuestionStatus.ANSWERED })
  status: QuestionStatus;

  @ApiProperty({ description: '공개 여부', enum: QuestionVisibility, example: QuestionVisibility.PUBLIC })
  visibility: QuestionVisibility;

  @ApiProperty({ description: '작성자 정보', type: QuestionUserDto })
  user: QuestionUserDto;

  @ApiProperty({ description: '첨부파일 목록', type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty({ description: '답변 목록', type: [AnswerDto] })
  answers: AnswerDto[];

  @ApiProperty({ description: '생성일', example: '2025-12-30T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2025-12-30T00:00:00Z' })
  updatedAt: Date;
}

/**
 * 질문 목록 응답 DTO (페이지네이션)
 */
export class PaginatedQuestionDto {
  @ApiProperty({ type: [QuestionListDto], description: '질문 목록' })
  data: QuestionListDto[];

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
 * 통계 응답 DTO
 */
export class QnaStatisticsDto {
  @ApiProperty({ description: '전체 질문 수', example: 150 })
  totalQuestions: number;

  @ApiProperty({ description: '답변 대기 중 질문 수', example: 10 })
  pendingQuestions: number;

  @ApiProperty({ description: '답변 완료 질문 수', example: 130 })
  answeredQuestions: number;

  @ApiProperty({ description: '해결 완료 질문 수', example: 120 })
  resolvedQuestions: number;
}

/**
 * 메시지 응답 DTO
 */
export class MessageResponseDto {
  @ApiProperty({ example: '작업이 완료되었습니다' })
  message: string;
}
