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

import { ChildcareService } from './childcare.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { SavingsDepositDto, SavingsWithdrawDto } from './dto/savings.dto';
import {
  ChildcareAccountDto,
  ChildcareTransactionDto,
  ChildcareRewardDto,
  ChildcareRuleDto,
} from './dto/childcare-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';

/**
 * 육아 포인트 컨트롤러
 * 부모-자녀 포인트 관리 및 적금 API
 */
@ApiTags('육아 포인트')
@Controller('childcare')
@ApiCommonAuthResponses()
export class ChildcareController {
  constructor(private readonly childcareService: ChildcareService) {}

  // ─── 계정 CRUD ────────────────────────────────────────────

  @Post('accounts')
  @ApiOperation({ summary: '육아 계정 생성 (부모만 가능)' })
  @ApiCreated(ChildcareAccountDto, '육아 계정 생성 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  createAccount(@Request() req, @Body() dto: CreateAccountDto) {
    return this.childcareService.createAccount(req.user.userId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: '육아 계정 목록 조회' })
  @ApiSuccess(ChildcareAccountDto, '육아 계정 목록 조회 성공', {
    isArray: true,
  })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findAccounts(@Request() req, @Query('groupId') groupId: string) {
    return this.childcareService.findAccounts(req.user.userId, groupId);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: '육아 계정 상세 조회' })
  @ApiSuccess(ChildcareAccountDto, '육아 계정 상세 조회 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('해당 계정에 접근할 권한이 없습니다')
  findOneAccount(@Request() req, @Param('id') id: string) {
    return this.childcareService.findOneAccount(req.user.userId, id);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: '육아 계정 설정 수정 (부모만 가능)' })
  @ApiSuccess(ChildcareAccountDto, '육아 계정 수정 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  updateAccount(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.childcareService.updateAccount(req.user.userId, id, dto);
  }

  // ─── 거래 내역 ────────────────────────────────────────────

  @Post('accounts/:id/transactions')
  @ApiOperation({ summary: '포인트 거래 추가 (부모만 가능)' })
  @ApiCreated(ChildcareTransactionDto, '거래 추가 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  createTransaction(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.childcareService.createTransaction(req.user.userId, id, dto);
  }

  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: '거래 내역 조회' })
  @ApiSuccess(ChildcareTransactionDto, '거래 내역 조회 성공', {
    isArray: true,
  })
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('해당 계정에 접근할 권한이 없습니다')
  findTransactions(
    @Request() req,
    @Param('id') id: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.childcareService.findTransactions(req.user.userId, id, query);
  }

  // ─── 보상 항목 ────────────────────────────────────────────

  @Get('accounts/:id/rewards')
  @ApiOperation({ summary: '보상 항목 목록 조회' })
  @ApiSuccess(ChildcareRewardDto, '보상 항목 목록 조회 성공', {
    isArray: true,
  })
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  findRewards(@Request() req, @Param('id') id: string) {
    return this.childcareService.findRewards(req.user.userId, id);
  }

  @Post('accounts/:id/rewards')
  @ApiOperation({ summary: '보상 항목 추가 (부모만 가능)' })
  @ApiCreated(ChildcareRewardDto, '보상 항목 추가 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  createReward(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateRewardDto,
  ) {
    return this.childcareService.createReward(req.user.userId, id, dto);
  }

  @Patch('accounts/:id/rewards/:rewardId')
  @ApiOperation({ summary: '보상 항목 수정 (부모만 가능)' })
  @ApiSuccess(ChildcareRewardDto, '보상 항목 수정 성공')
  @ApiNotFound('보상 항목을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  updateReward(
    @Request() req,
    @Param('id') id: string,
    @Param('rewardId') rewardId: string,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.childcareService.updateReward(
      req.user.userId,
      id,
      rewardId,
      dto,
    );
  }

  @Delete('accounts/:id/rewards/:rewardId')
  @ApiOperation({ summary: '보상 항목 삭제 (부모만 가능)' })
  @ApiSuccess(MessageResponseDto, '보상 항목 삭제 성공')
  @ApiNotFound('보상 항목을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  removeReward(
    @Request() req,
    @Param('id') id: string,
    @Param('rewardId') rewardId: string,
  ) {
    return this.childcareService.removeReward(req.user.userId, id, rewardId);
  }

  // ─── 규칙 ─────────────────────────────────────────────────

  @Get('accounts/:id/rules')
  @ApiOperation({ summary: '규칙 목록 조회' })
  @ApiSuccess(ChildcareRuleDto, '규칙 목록 조회 성공', { isArray: true })
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  findRules(@Request() req, @Param('id') id: string) {
    return this.childcareService.findRules(req.user.userId, id);
  }

  @Post('accounts/:id/rules')
  @ApiOperation({ summary: '규칙 추가 (부모만 가능)' })
  @ApiCreated(ChildcareRuleDto, '규칙 추가 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  createRule(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateRuleDto,
  ) {
    return this.childcareService.createRule(req.user.userId, id, dto);
  }

  @Patch('accounts/:id/rules/:ruleId')
  @ApiOperation({ summary: '규칙 수정 (부모만 가능)' })
  @ApiSuccess(ChildcareRuleDto, '규칙 수정 성공')
  @ApiNotFound('규칙을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  updateRule(
    @Request() req,
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.childcareService.updateRule(req.user.userId, id, ruleId, dto);
  }

  @Delete('accounts/:id/rules/:ruleId')
  @ApiOperation({ summary: '규칙 삭제 (부모만 가능)' })
  @ApiSuccess(MessageResponseDto, '규칙 삭제 성공')
  @ApiNotFound('규칙을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  removeRule(
    @Request() req,
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.childcareService.removeRule(req.user.userId, id, ruleId);
  }

  // ─── 적금 ─────────────────────────────────────────────────

  @Post('accounts/:id/savings/deposit')
  @ApiOperation({ summary: '적금 입금 (자녀 또는 부모)' })
  @ApiCreated(ChildcareTransactionDto, '적금 입금 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('해당 계정에 접근할 권한이 없습니다')
  savingsDeposit(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SavingsDepositDto,
  ) {
    return this.childcareService.savingsDeposit(req.user.userId, id, dto);
  }

  @Post('accounts/:id/savings/withdraw')
  @ApiOperation({ summary: '적금 출금 (부모만 가능)' })
  @ApiCreated(ChildcareTransactionDto, '적금 출금 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  savingsWithdraw(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SavingsWithdrawDto,
  ) {
    return this.childcareService.savingsWithdraw(req.user.userId, id, dto);
  }
}
