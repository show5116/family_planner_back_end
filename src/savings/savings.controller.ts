import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { SavingsService } from './savings.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { DepositDto, WithdrawDto } from './dto/savings-transaction.dto';
import {
  SavingsGoalQueryDto,
  TransactionQueryDto,
} from './dto/savings-query.dto';
import {
  SavingsGoalDto,
  SavingsGoalDetailDto,
  SavingsTransactionDto,
  TransactionPageDto,
} from './dto/savings-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
  ApiBadRequest,
} from '@/common/decorators/api-responses.decorator';

/**
 * 적립금 컨트롤러
 * 계/비상금 등 목적별 적립금 관리 API
 */
@ApiTags('적립금')
@Controller('savings')
@ApiCommonAuthResponses()
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  // ─── 적립 목표 ───────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: '적립 목표 생성' })
  @ApiCreated(SavingsGoalDto, '적립 목표 생성 성공')
  @ApiBadRequest('autoDeposit=true 시 monthlyAmount 필수')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  createGoal(@Request() req, @Body() dto: CreateSavingsGoalDto) {
    return this.savingsService.createGoal(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '적립 목표 목록 조회' })
  @ApiSuccess(SavingsGoalDto, '적립 목표 목록 조회 성공', { isArray: true })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findGoals(@Request() req, @Query() query: SavingsGoalQueryDto) {
    return this.savingsService.findGoals(req.user.userId, query.groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: '적립 목표 상세 조회 (최근 내역 10건 포함)' })
  @ApiSuccess(SavingsGoalDetailDto, '적립 목표 상세 조회 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findGoalById(@Request() req, @Param('id') id: string) {
    return this.savingsService.findGoalById(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '적립 목표 수정' })
  @ApiSuccess(SavingsGoalDto, '적립 목표 수정 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  updateGoal(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.savingsService.updateGoal(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '적립 목표 삭제' })
  @ApiSuccess(MessageResponseDto, '적립 목표 삭제 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  deleteGoal(@Request() req, @Param('id') id: string) {
    return this.savingsService.deleteGoal(req.user.userId, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: '자동 적립 일시 중지' })
  @ApiSuccess(MessageResponseDto, '일시 중지 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiBadRequest('자동 적립 미설정 또는 이미 일시 중지 상태')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  pauseGoal(@Request() req, @Param('id') id: string) {
    return this.savingsService.pauseGoal(req.user.userId, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '자동 적립 재개' })
  @ApiSuccess(MessageResponseDto, '재개 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiBadRequest('자동 적립 미설정 또는 이미 활성 상태')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  resumeGoal(@Request() req, @Param('id') id: string) {
    return this.savingsService.resumeGoal(req.user.userId, id);
  }

  // ─── 적립/출금 내역 ──────────────────────────────────────

  @Post(':id/deposit')
  @ApiOperation({ summary: '수동 입금' })
  @ApiCreated(SavingsTransactionDto, '입금 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiBadRequest('완료된 목표')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  deposit(@Request() req, @Param('id') id: string, @Body() dto: DepositDto) {
    return this.savingsService.deposit(req.user.userId, id, dto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: '출금 (이벤트 사용)' })
  @ApiCreated(SavingsTransactionDto, '출금 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiBadRequest('잔액 부족 또는 완료된 목표')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  withdraw(@Request() req, @Param('id') id: string, @Body() dto: WithdrawDto) {
    return this.savingsService.withdraw(req.user.userId, id, dto);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: '적립/출금 내역 목록 (페이지네이션)' })
  @ApiSuccess(TransactionPageDto, '내역 조회 성공')
  @ApiNotFound('적립 목표를 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findTransactions(
    @Request() req,
    @Param('id') id: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.savingsService.findTransactions(req.user.userId, id, query);
  }
}
