import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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

  @Get('public-questions')
  @ApiOperation({ summary: '공개 질문 목록 조회' })
  @ApiSuccess(PaginatedQuestionDto, '공개 질문 목록 조회 성공')
  findPublicQuestions(@Query() query: QuestionQueryDto) {
    return this.qnaService.findPublicQuestions(query);
  }

  @Get('my-questions')
  @ApiOperation({ summary: '내 질문 목록 조회' })
  @ApiSuccess(PaginatedQuestionDto, '내 질문 목록 조회 성공')
  findMyQuestions(@Request() req, @Query() query: QuestionQueryDto) {
    return this.qnaService.findMyQuestions(req.user.userId, query);
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

  @Patch('questions/:id/resolve')
  @ApiOperation({ summary: '질문 해결 완료 처리 (본인만, ANSWERED 상태만)' })
  @ApiSuccess(QuestionDetailDto, '질문 해결 완료 처리 성공')
  @ApiNotFound('질문을 찾을 수 없습니다')
  resolve(@Param('id') id: string, @Request() req) {
    return this.qnaService.resolve(id, req.user.userId);
  }
}
