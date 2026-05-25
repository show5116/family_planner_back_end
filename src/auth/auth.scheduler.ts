import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { AuthService } from '@/auth/auth.service';

/**
 * 인증 스케줄러
 * - 유예 기간(7일) 만료 계정 하드 삭제 (매일 새벽 3시)
 */
@Injectable()
export class AuthScheduler {
  private readonly logger = new Logger(AuthScheduler.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * 매일 새벽 3시: 유예 기간 만료 계정 완전 삭제
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredAccounts() {
    if (!isSchedulerEnabled('auth')) return;

    try {
      const result = await this.authService.purgeExpiredAccounts();
      if (result.purged > 0) {
        this.logger.log(`만료 계정 ${result.purged}개 삭제 완료`);
      }
    } catch (error) {
      this.logger.error('만료 계정 삭제 실패', error);
    }
  }
}
