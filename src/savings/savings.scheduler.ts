import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SavingsService } from './savings.service';

@Injectable()
export class SavingsScheduler {
  private readonly logger = new Logger(SavingsScheduler.name);

  constructor(private readonly savingsService: SavingsService) {}

  /**
   * 매월 1일 00:10에 자동 적립 실행
   * autoDeposit=true && status=ACTIVE인 목표에 monthlyAmount 적립
   */
  @Cron('10 0 1 * *')
  async runAutoDeposit() {
    this.logger.log('자동 적립 스케줄러 실행');

    const { count } = await this.savingsService.runAutoDeposit();

    this.logger.log(`자동 적립 완료 — ${count}건 처리`);
  }
}
