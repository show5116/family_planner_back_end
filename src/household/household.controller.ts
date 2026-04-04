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
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

import { HouseholdService } from './household.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { BulkUpsertBudgetDto } from './dto/create-budget.dto';
import { BulkUpsertBudgetTemplateDto } from './dto/budget-template.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';
import {
  ExpenseDto,
  BudgetDto,
  BudgetTemplateDto,
  GroupBudgetDto,
  GroupBudgetTemplateDto,
  StatisticsDto,
  YearlyStatisticsDto,
  ExpenseReceiptDto,
  ReceiptUploadUrlDto,
  BulkBudgetResultDto,
  BulkBudgetTemplateResultDto,
} from './dto/household-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';

class StatisticsQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '조회 월 (YYYY-MM)', example: '2026-02' })
  @IsString()
  month: string;
}

class YearlyStatisticsQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '조회 연도 (YYYY)', example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: '연도 형식은 YYYY이어야 합니다' })
  year: string;
}

class BudgetQueryDto {
  @ApiProperty({ description: '그룹 ID', example: 'uuid-1234' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: '조회 월 (YYYY-MM)', example: '2026-02' })
  @IsString()
  month: string;
}

class ReceiptUploadQueryDto {
  @ApiProperty({ description: 'MIME 타입', example: 'image/jpeg' })
  @IsString()
  mimeType: string;
}

/**
 * 가계부 컨트롤러
 * 가족 그룹 지출 관리 및 예산 API
 */
@ApiTags('가계부')
@Controller('household')
@ApiCommonAuthResponses()
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  // ─── 지출 CRUD ───────────────────────────────────────────

  @Post('expenses')
  @ApiOperation({ summary: '지출 등록' })
  @ApiCreated(ExpenseDto, '지출 등록 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  createExpense(@Request() req, @Body() dto: CreateExpenseDto) {
    return this.householdService.createExpense(req.user.userId, dto);
  }

  @Get('expenses')
  @ApiOperation({ summary: '지출 목록 조회' })
  @ApiSuccess(ExpenseDto, '지출 목록 조회 성공', { isArray: true })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findAllExpenses(@Request() req, @Query() query: ExpenseQueryDto) {
    return this.householdService.findAllExpenses(req.user.userId, query);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: '지출 상세 조회' })
  @ApiSuccess(ExpenseDto, '지출 상세 조회 성공')
  @ApiNotFound('지출 내역을 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findOneExpense(@Request() req, @Param('id') id: string) {
    return this.householdService.findOneExpense(req.user.userId, id);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: '지출 수정' })
  @ApiSuccess(ExpenseDto, '지출 수정 성공')
  @ApiNotFound('지출 내역을 찾을 수 없습니다')
  @ApiForbidden('본인이 등록한 지출만 수정할 수 있습니다')
  updateExpense(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.householdService.updateExpense(req.user.userId, id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: '지출 삭제' })
  @ApiSuccess(MessageResponseDto, '지출 삭제 성공')
  @ApiNotFound('지출 내역을 찾을 수 없습니다')
  @ApiForbidden('본인이 등록한 지출만 삭제할 수 있습니다')
  removeExpense(@Request() req, @Param('id') id: string) {
    return this.householdService.removeExpense(req.user.userId, id);
  }

  // ─── 영수증 ──────────────────────────────────────────────

  @Get('expenses/:id/receipts/upload-url')
  @ApiOperation({
    summary: '영수증 업로드 Presigned URL 발급',
    description:
      '발급된 uploadUrl로 파일을 직접 업로드한 뒤, confirmReceipt API를 호출하세요.',
  })
  @ApiSuccess(ReceiptUploadUrlDto, '업로드 URL 발급 성공')
  @ApiNotFound('지출 내역을 찾을 수 없습니다')
  @ApiForbidden('본인이 등록한 지출만 수정할 수 있습니다')
  getReceiptUploadUrl(
    @Request() req,
    @Param('id') id: string,
    @Query() query: ReceiptUploadQueryDto,
  ) {
    return this.householdService.getReceiptUploadUrl(
      req.user.userId,
      id,
      query.mimeType,
    );
  }

  @Post('expenses/:id/receipts/confirm')
  @ApiOperation({ summary: '영수증 업로드 완료 확인 (DB 등록)' })
  @ApiCreated(ExpenseReceiptDto, '영수증 등록 성공')
  @ApiNotFound('지출 내역을 찾을 수 없습니다')
  @ApiForbidden('본인이 등록한 지출만 수정할 수 있습니다')
  confirmReceipt(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ConfirmReceiptDto,
  ) {
    return this.householdService.confirmReceipt(req.user.userId, id, dto);
  }

  @Delete('expenses/:id/receipts/:receiptId')
  @ApiOperation({ summary: '영수증 삭제' })
  @ApiSuccess(MessageResponseDto, '영수증 삭제 성공')
  @ApiNotFound('영수증을 찾을 수 없습니다')
  @ApiForbidden('본인이 등록한 지출의 영수증만 삭제할 수 있습니다')
  removeReceipt(
    @Request() req,
    @Param('id') id: string,
    @Param('receiptId') receiptId: string,
  ) {
    return this.householdService.removeReceipt(req.user.userId, id, receiptId);
  }

  // ─── 통계 ────────────────────────────────────────────────

  @Get('statistics')
  @ApiOperation({ summary: '월별 지출 통계 조회' })
  @ApiSuccess(StatisticsDto, '통계 조회 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  getStatistics(@Request() req, @Query() query: StatisticsQueryDto) {
    return this.householdService.getStatistics(
      req.user.userId,
      query.groupId,
      query.month,
    );
  }

  @Get('statistics/yearly')
  @ApiOperation({ summary: '연별 지출 통계 조회 (월별 합계)' })
  @ApiSuccess(YearlyStatisticsDto, '연별 통계 조회 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  getYearlyStatistics(
    @Request() req,
    @Query() query: YearlyStatisticsQueryDto,
  ) {
    return this.householdService.getYearlyStatistics(
      req.user.userId,
      query.groupId,
      query.year,
    );
  }

  // ─── 예산 ────────────────────────────────────────────────

  @Post('budgets/bulk')
  @ApiOperation({ summary: '예산 일괄 설정 (전체 + 카테고리별)' })
  @ApiCreated(BulkBudgetResultDto, '예산 일괄 설정 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  bulkUpsertBudget(@Request() req, @Body() dto: BulkUpsertBudgetDto) {
    return this.householdService.bulkUpsertBudget(req.user.userId, dto);
  }

  @Get('budgets')
  @ApiOperation({ summary: '예산 목록 조회' })
  @ApiSuccess(BudgetDto, '예산 목록 조회 성공', { isArray: true })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findBudgets(@Request() req, @Query() query: BudgetQueryDto) {
    return this.householdService.findBudgets(
      req.user.userId,
      query.groupId,
      query.month,
    );
  }

  // ─── 예산 템플릿 ─────────────────────────────────────────

  @Post('budget-templates/bulk')
  @ApiOperation({ summary: '예산 템플릿 일괄 설정 (전체 + 카테고리별)' })
  @ApiCreated(BulkBudgetTemplateResultDto, '예산 템플릿 일괄 설정 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  bulkUpsertBudgetTemplate(
    @Request() req,
    @Body() dto: BulkUpsertBudgetTemplateDto,
  ) {
    return this.householdService.bulkUpsertBudgetTemplate(req.user.userId, dto);
  }

  @Get('budget-templates')
  @ApiOperation({ summary: '예산 템플릿 목록 조회' })
  @ApiSuccess(BudgetTemplateDto, '예산 템플릿 목록 조회 성공', {
    isArray: true,
  })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findBudgetTemplates(@Request() req, @Query('groupId') groupId: string) {
    return this.householdService.findBudgetTemplates(req.user.userId, groupId);
  }

  @Delete('budget-templates/:category')
  @ApiOperation({ summary: '예산 템플릿 삭제' })
  @ApiSuccess(MessageResponseDto, '예산 템플릿 삭제 성공')
  @ApiNotFound('예산 템플릿을 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  removeBudgetTemplate(
    @Request() req,
    @Param('category') category: string,
    @Query('groupId') groupId: string,
  ) {
    return this.householdService.removeBudgetTemplate(
      req.user.userId,
      groupId,
      category,
    );
  }

  // ─── 그룹 전체 예산 ──────────────────────────────────────

  @Get('group-budgets')
  @ApiOperation({ summary: '그룹 전체 예산 조회 (월별)' })
  @ApiSuccess(GroupBudgetDto, '전체 예산 조회 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findGroupBudget(
    @Request() req,
    @Query('groupId') groupId: string,
    @Query('month') month: string,
  ) {
    return this.householdService.findGroupBudget(
      req.user.userId,
      groupId,
      month,
    );
  }

  // ─── 그룹 전체 예산 템플릿 ───────────────────────────────

  @Get('group-budget-templates')
  @ApiOperation({ summary: '그룹 전체 예산 템플릿 조회' })
  @ApiSuccess(GroupBudgetTemplateDto, '전체 예산 템플릿 조회 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findGroupBudgetTemplate(@Request() req, @Query('groupId') groupId: string) {
    return this.householdService.findGroupBudgetTemplate(
      req.user.userId,
      groupId,
    );
  }

  @Delete('group-budget-templates')
  @ApiOperation({ summary: '그룹 전체 예산 템플릿 삭제' })
  @ApiSuccess(MessageResponseDto, '전체 예산 템플릿 삭제 성공')
  @ApiNotFound('전체 예산 템플릿을 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  removeGroupBudgetTemplate(@Request() req, @Query('groupId') groupId: string) {
    return this.householdService.removeGroupBudgetTemplate(
      req.user.userId,
      groupId,
    );
  }
}
