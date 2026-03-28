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
import { CreateChildDto } from './dto/create-child.dto';
import { CreateAllowancePlanDto } from './dto/create-allowance-plan.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { SavingsDepositDto, SavingsWithdrawDto } from './dto/savings.dto';
import {
  ChildDto,
  ChildcareAccountDto,
  AllowancePlanDto,
  AllowancePlanHistoryDto,
  ChildcareTransactionDto,
  ChildcareShopItemDto,
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

  // ─── 자녀 프로필 ──────────────────────────────────────────

  @Post('children')
  @ApiOperation({ summary: '자녀 프로필 등록 (앱 계정 불필요)' })
  @ApiCreated(ChildDto, '자녀 프로필 등록 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  createChild(@Request() req, @Body() dto: CreateChildDto) {
    return this.childcareService.createChild(req.user.userId, dto);
  }

  @Get('children')
  @ApiOperation({ summary: '그룹 내 자녀 프로필 목록 조회' })
  @ApiSuccess(ChildDto, '자녀 프로필 목록 조회 성공', { isArray: true })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findChildren(@Request() req, @Query('groupId') groupId: string) {
    return this.childcareService.findChildren(req.user.userId, groupId);
  }

  @Post('children/:id/link-user')
  @ApiOperation({ summary: '자녀 프로필과 앱 계정 연동 (부모만 가능)' })
  @ApiSuccess(ChildDto, '앱 계정 연동 성공')
  @ApiNotFound('자녀 프로필을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  linkUser(
    @Request() req,
    @Param('id') id: string,
    @Body('targetUserId') targetUserId: string,
  ) {
    return this.childcareService.linkUser(req.user.userId, id, targetUserId);
  }

  // ─── 포인트 계정 ──────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: '그룹 내 포인트 계정 목록 조회' })
  @ApiSuccess(ChildcareAccountDto, '포인트 계정 목록 조회 성공', {
    isArray: true,
  })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findAccounts(@Request() req, @Query('groupId') groupId: string) {
    return this.childcareService.findAccounts(req.user.userId, groupId);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: '포인트 계정 상세 조회' })
  @ApiSuccess(ChildcareAccountDto, '포인트 계정 상세 조회 성공')
  @ApiNotFound('포인트 계정을 찾을 수 없습니다')
  @ApiForbidden('해당 계정에 접근할 권한이 없습니다')
  findOneAccount(@Request() req, @Param('id') id: string) {
    return this.childcareService.findOneAccount(req.user.userId, id);
  }

  // ─── 월 포인트 할당 ────────────────────────────────────────

  @Post('children/:id/allowance-plan')
  @ApiOperation({
    summary: '월 포인트 할당 설정 (생성 또는 수정, 부모만 가능)',
  })
  @ApiCreated(AllowancePlanDto, '월 포인트 할당 설정 성공')
  @ApiNotFound('자녀 프로필을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  upsertAllowancePlan(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateAllowancePlanDto,
  ) {
    return this.childcareService.upsertAllowancePlan(req.user.userId, id, dto);
  }

  @Get('children/:id/allowance-plan')
  @ApiOperation({ summary: '월 포인트 할당 설정 조회' })
  @ApiSuccess(AllowancePlanDto, '월 포인트 할당 설정 조회 성공')
  @ApiNotFound('자녀 프로필을 찾을 수 없습니다')
  @ApiForbidden('해당 자녀 프로필에 접근할 권한이 없습니다')
  findAllowancePlan(@Request() req, @Param('id') id: string) {
    return this.childcareService.findAllowancePlan(req.user.userId, id);
  }

  @Get('children/:id/allowance-plan/history')
  @ApiOperation({ summary: '월 포인트 할당 변경 히스토리 조회' })
  @ApiSuccess(AllowancePlanHistoryDto, '히스토리 조회 성공', { isArray: true })
  @ApiNotFound('자녀 프로필을 찾을 수 없습니다')
  @ApiForbidden('해당 자녀 프로필에 접근할 권한이 없습니다')
  findAllowancePlanHistory(@Request() req, @Param('id') id: string) {
    return this.childcareService.findAllowancePlanHistory(req.user.userId, id);
  }

  // ─── 거래 내역 ────────────────────────────────────────────

  @Post('accounts/:id/transactions')
  @ApiOperation({
    summary: '포인트 거래 추가 (부모만 가능)',
    description: `포인트 적립/차감 거래를 추가합니다.

**방법 1 — 상점 아이템 적용**: \`shopItemId\` 지정
- type: PURCHASE 자동 설정, 아이템 포인트만큼 잔액 차감

**방법 2 — 규칙 적용**: \`ruleId\` 지정
- PLUS 규칙 → type: REWARD, 잔액 증가
- MINUS 규칙 → type: PENALTY, 잔액 차감
- INFO 규칙은 포인트가 없어 적용 불가

**방법 3 — 직접 입력**: \`type\`, \`amount\`, \`description\` 직접 지정`,
  })
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

  // ─── 포인트 상점 ──────────────────────────────────────────

  @Get('accounts/:id/shop-items')
  @ApiOperation({ summary: '상점 아이템 목록 조회' })
  @ApiSuccess(ChildcareShopItemDto, '상점 아이템 목록 조회 성공', {
    isArray: true,
  })
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  findShopItems(@Request() req, @Param('id') id: string) {
    return this.childcareService.findShopItems(req.user.userId, id);
  }

  @Post('accounts/:id/shop-items')
  @ApiOperation({ summary: '상점 아이템 추가 (부모만 가능)' })
  @ApiCreated(ChildcareShopItemDto, '상점 아이템 추가 성공')
  @ApiNotFound('육아 계정을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  createShopItem(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateShopItemDto,
  ) {
    return this.childcareService.createShopItem(req.user.userId, id, dto);
  }

  @Patch('accounts/:id/shop-items/:itemId')
  @ApiOperation({ summary: '상점 아이템 수정 (부모만 가능)' })
  @ApiSuccess(ChildcareShopItemDto, '상점 아이템 수정 성공')
  @ApiNotFound('상점 아이템을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  updateShopItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShopItemDto,
  ) {
    return this.childcareService.updateShopItem(
      req.user.userId,
      id,
      itemId,
      dto,
    );
  }

  @Delete('accounts/:id/shop-items/:itemId')
  @ApiOperation({ summary: '상점 아이템 삭제 (부모만 가능)' })
  @ApiSuccess(MessageResponseDto, '상점 아이템 삭제 성공')
  @ApiNotFound('상점 아이템을 찾을 수 없습니다')
  @ApiForbidden('부모만 수행할 수 있는 작업입니다')
  removeShopItem(
    @Request() req,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.childcareService.removeShopItem(req.user.userId, id, itemId);
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
