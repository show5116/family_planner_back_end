import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AssetsService } from './assets.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountRecordDto } from './dto/create-account-record.dto';
import { AccountQueryDto } from './dto/account-query.dto';
import { StatisticsQueryDto } from './dto/assets-query.dto';
import {
  AccountDto,
  AccountRecordDto,
  AccountStatisticsDto,
} from './dto/assets-response.dto';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiCreated,
  ApiForbidden,
  ApiNotFound,
  ApiSuccess,
} from '@/common/decorators/api-responses.decorator';

/**
 * 자산 관리 컨트롤러
 * 계좌 CRUD 및 자산 기록, 통계 API
 */
@ApiTags('자산관리')
@Controller('assets')
@ApiCommonAuthResponses()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ─── 계좌 CRUD ────────────────────────────────────────────

  @Post('accounts')
  @ApiOperation({ summary: '계좌 생성' })
  @ApiCreated(AccountDto, '계좌 생성 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  createAccount(@Request() req, @Body() dto: CreateAccountDto) {
    return this.assetsService.createAccount(req.user.userId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: '계좌 목록 조회' })
  @ApiSuccess(AccountDto, '계좌 목록 조회 성공', { isArray: true })
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findAllAccounts(@Request() req, @Query() query: AccountQueryDto) {
    return this.assetsService.findAllAccounts(req.user.userId, query);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: '계좌 상세 조회' })
  @ApiSuccess(AccountDto, '계좌 상세 조회 성공')
  @ApiNotFound('계좌를 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findOneAccount(@Request() req, @Param('id') id: string) {
    return this.assetsService.findOneAccount(req.user.userId, id);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: '계좌 수정' })
  @ApiSuccess(AccountDto, '계좌 수정 성공')
  @ApiNotFound('계좌를 찾을 수 없습니다')
  @ApiForbidden('본인의 계좌만 수정할 수 있습니다')
  updateAccount(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.assetsService.updateAccount(req.user.userId, id, dto);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: '계좌 삭제' })
  @ApiSuccess(MessageResponseDto, '계좌 삭제 성공')
  @ApiNotFound('계좌를 찾을 수 없습니다')
  @ApiForbidden('본인의 계좌만 삭제할 수 있습니다')
  removeAccount(@Request() req, @Param('id') id: string) {
    return this.assetsService.removeAccount(req.user.userId, id);
  }

  // ─── 자산 기록 ────────────────────────────────────────────

  @Post('accounts/:id/records')
  @ApiOperation({ summary: '자산 기록 추가' })
  @ApiCreated(AccountRecordDto, '자산 기록 추가 성공')
  @ApiNotFound('계좌를 찾을 수 없습니다')
  @ApiForbidden('본인의 계좌에만 기록을 추가할 수 있습니다')
  createAccountRecord(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateAccountRecordDto,
  ) {
    return this.assetsService.createAccountRecord(req.user.userId, id, dto);
  }

  @Get('accounts/:id/records')
  @ApiOperation({ summary: '자산 기록 목록 조회' })
  @ApiSuccess(AccountRecordDto, '자산 기록 목록 조회 성공', { isArray: true })
  @ApiNotFound('계좌를 찾을 수 없습니다')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  findAccountRecords(@Request() req, @Param('id') id: string) {
    return this.assetsService.findAccountRecords(req.user.userId, id);
  }

  // ─── 통계 ─────────────────────────────────────────────────

  @Get('statistics')
  @ApiOperation({ summary: '그룹 자산 통계 조회' })
  @ApiSuccess(AccountStatisticsDto, '자산 통계 조회 성공')
  @ApiForbidden('해당 그룹의 멤버가 아닙니다')
  getStatistics(@Request() req, @Query() query: StatisticsQueryDto) {
    return this.assetsService.getStatistics(req.user.userId, query.groupId);
  }
}
