import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { QnaService } from './qna.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionQueryDto } from './dto/question-query.dto';
import {
  PaginatedQuestionDto,
  QuestionDetailDto,
} from './dto/qna-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
} from '@/common/decorators/api-responses.decorator';
import { QuestionVisibilityGuard } from './guards/question-visibility.guard';

/**
 * Q&A 컨트롤러 (사용자용)
 * 사용자가 질문을 작성하고 조회하는 기능
 */
@ApiTags('Q&A')
@Controller('qna')
@ApiCommonAuthResponses()
export class QnaController {
  constructor(private readonly qnaService: QnaService) {}

  @Get('questions')
  @ApiOperation({
    summary: '질문 목록 조회 (통합)',
    description:
      'filter 파라미터로 조회 범위 설정: public(공개 질문), my(내 질문), all(모든 질문-ADMIN 전용)',
  })
  @ApiSuccess(PaginatedQuestionDto, '질문 목록 조회 성공')
  findQuestions(@Request() req, @Query() query: QuestionQueryDto) {
    const userId = req.user?.userId || null;
    const isAdmin = req.user?.isAdmin || false;
    return this.qnaService.findQuestions(userId, query, isAdmin);
  }

  @Get('questions/:id')
  @UseGuards(QuestionVisibilityGuard)
  @ApiOperation({ summary: '질문 상세 조회' })
  @ApiSuccess(QuestionDetailDto, '질문 상세 조회 성공')
  @ApiNotFound('질문을 찾을 수 없습니다')
  findOne(@Param('id') id: string) {
    return this.qnaService.findOne(id);
  }

  @Post('questions')
  @ApiOperation({ summary: '질문 작성' })
  @ApiCreated(QuestionDetailDto, '질문 작성 성공')
  create(@Request() req, @Body() dto: CreateQuestionDto) {
    return this.qnaService.create(req.user.userId, dto);
  }

  @Put('questions/:id')
  @ApiOperation({ summary: '질문 수정 (본인만, PENDING 상태만)' })
  @ApiSuccess(QuestionDetailDto, '질문 수정 성공')
  @ApiNotFound('질문을 찾을 수 없습니다')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.qnaService.update(id, req.user.userId, dto);
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: '질문 삭제 (본인만)' })
  @ApiSuccess(MessageResponseDto, '질문 삭제 성공')
  @ApiNotFound('질문을 찾을 수 없습니다')
  remove(@Param('id') id: string, @Request() req) {
    return this.qnaService.remove(id, req.user.userId);
  }
}
