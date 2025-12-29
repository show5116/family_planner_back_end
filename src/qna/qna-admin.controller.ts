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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QnaService } from './qna.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { QuestionQueryDto } from './dto/question-query.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
} from '@/common/decorators/api-responses.decorator';
import { AdminGuard } from '@/auth/admin.guard';

/**
 * Q&A 관리자 컨트롤러
 * ADMIN만 접근 가능한 기능 (답변 작성, 전체 질문 조회, 통계 등)
 */
@ApiTags('Q&A (ADMIN)')
@Controller('qna/admin')
@UseGuards(AdminGuard)
@ApiCommonAuthResponses()
export class QnaAdminController {
  constructor(private readonly qnaService: QnaService) {}

  @Get('questions')
  @ApiOperation({ summary: '모든 질문 목록 조회 (ADMIN 전용)' })
  @ApiSuccess(Object, '질문 목록 조회 성공')
  findAllQuestions(@Query() query: QuestionQueryDto) {
    return this.qnaService.findAllQuestionsForAdmin(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '통계 조회 (ADMIN 전용)' })
  @ApiSuccess(Object, '통계 조회 성공')
  getStatistics() {
    return this.qnaService.getStatistics();
  }

  @Post('questions/:questionId/answers')
  @ApiOperation({ summary: '답변 작성 (ADMIN 전용)' })
  @ApiCreated(Object, '답변 작성 성공')
  @ApiNotFound('질문을 찾을 수 없습니다')
  createAnswer(
    @Param('questionId') questionId: string,
    @Request() req,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.qnaService.createAnswer(questionId, req.user.userId, dto);
  }

  @Put('questions/:questionId/answers/:id')
  @ApiOperation({ summary: '답변 수정 (ADMIN 전용)' })
  @ApiSuccess(Object, '답변 수정 성공')
  @ApiNotFound('답변을 찾을 수 없습니다')
  updateAnswer(@Param('id') id: string, @Body() dto: UpdateAnswerDto) {
    return this.qnaService.updateAnswer(id, dto);
  }

  @Delete('questions/:questionId/answers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '답변 삭제 (ADMIN 전용)' })
  @ApiNotFound('답변을 찾을 수 없습니다')
  removeAnswer(@Param('id') id: string) {
    return this.qnaService.removeAnswer(id);
  }
}
