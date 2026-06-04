import { Injectable } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountRecordService } from './account-record.service';
import { HoldingRecordService } from './holding-record.service';
import { AssetsStatisticsService } from './assets-statistics.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountRecordDto } from './dto/create-account-record.dto';
import { CreateAccountWithdrawalDto } from './dto/create-account-withdrawal.dto';
import { AccountQueryDto } from './dto/account-query.dto';
import { ReorderAccountsDto } from './dto/reorder-accounts.dto';
import { CreateAccountHoldingRecordDto } from './dto/create-account-holding-record.dto';
import { UpdateAccountHoldingRecordDto } from './dto/update-account-holding-record.dto';
import { AccountTrendQueryDto, TrendQueryDto } from './dto/assets-query.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly accountService: AccountService,
    private readonly accountRecordService: AccountRecordService,
    private readonly holdingRecordService: HoldingRecordService,
    private readonly statisticsService: AssetsStatisticsService,
  ) {}

  // ─── 계좌 ────────────────────────────────────────────────────

  createAccount(userId: string, dto: CreateAccountDto) {
    return this.accountService.createAccount(userId, dto);
  }

  findAllAccounts(userId: string, query: AccountQueryDto) {
    return this.accountService.findAllAccounts(userId, query);
  }

  findOneAccount(userId: string, id: string) {
    return this.accountService.findOneAccount(userId, id);
  }

  updateAccount(userId: string, id: string, dto: UpdateAccountDto) {
    return this.accountService.updateAccount(userId, id, dto);
  }

  removeAccount(userId: string, id: string) {
    return this.accountService.removeAccount(userId, id);
  }

  reorderAccounts(userId: string, dto: ReorderAccountsDto) {
    return this.accountService.reorderAccounts(userId, dto);
  }

  // ─── 자산 기록 ───────────────────────────────────────────────

  getGoldCurrentPrice() {
    return this.accountRecordService.getGoldCurrentPrice();
  }

  createAccountRecord(
    userId: string,
    accountId: string,
    dto: CreateAccountRecordDto,
  ) {
    return this.accountRecordService.createAccountRecord(
      userId,
      accountId,
      dto,
    );
  }

  findAccountRecords(userId: string, accountId: string) {
    return this.accountRecordService.findAccountRecords(userId, accountId);
  }

  removeAccountRecord(userId: string, accountId: string, recordId: string) {
    return this.accountRecordService.removeAccountRecord(
      userId,
      accountId,
      recordId,
    );
  }

  // ─── 출금 ────────────────────────────────────────────────────

  createWithdrawal(
    userId: string,
    accountId: string,
    dto: CreateAccountWithdrawalDto,
  ) {
    return this.accountRecordService.createWithdrawal(userId, accountId, dto);
  }

  findWithdrawals(userId: string, accountId: string) {
    return this.accountRecordService.findWithdrawals(userId, accountId);
  }

  removeWithdrawal(userId: string, accountId: string, withdrawalId: string) {
    return this.accountRecordService.removeWithdrawal(
      userId,
      accountId,
      withdrawalId,
    );
  }

  // ─── 포트폴리오 종목 ─────────────────────────────────────────

  findHoldingRecords(userId: string, accountId: string, recordDate?: string) {
    return this.holdingRecordService.findHoldingRecords(
      userId,
      accountId,
      recordDate,
    );
  }

  createHoldingRecord(
    userId: string,
    accountId: string,
    dto: CreateAccountHoldingRecordDto,
  ) {
    return this.holdingRecordService.createHoldingRecord(
      userId,
      accountId,
      dto,
    );
  }

  updateHoldingRecord(
    userId: string,
    accountId: string,
    recordId: string,
    dto: UpdateAccountHoldingRecordDto,
  ) {
    return this.holdingRecordService.updateHoldingRecord(
      userId,
      accountId,
      recordId,
      dto,
    );
  }

  removeHoldingRecord(userId: string, accountId: string, recordId: string) {
    return this.holdingRecordService.removeHoldingRecord(
      userId,
      accountId,
      recordId,
    );
  }

  findHoldingNames(userId: string, groupId: string) {
    return this.holdingRecordService.findHoldingNames(userId, groupId);
  }

  // ─── 통계 ────────────────────────────────────────────────────

  getStatistics(userId: string, groupId: string, accountIds?: string[]) {
    return this.statisticsService.getStatistics(userId, groupId, accountIds);
  }

  getGroupTrend(userId: string, query: TrendQueryDto) {
    return this.statisticsService.getGroupTrend(userId, query);
  }

  getAccountTrend(
    userId: string,
    accountId: string,
    query: AccountTrendQueryDto,
  ) {
    return this.statisticsService.getAccountTrend(userId, accountId, query);
  }
}
