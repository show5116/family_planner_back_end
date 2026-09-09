import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { DiaryMediaService } from './diary-media.service';

/**
 * 미디어 정리 스케줄러
 *
 * 둘 다 없으면 한도가 샌다 — 예약만 하고 안 올린 건과, 일기에 붙지 못한 고아가
 * 계속 용량을 잡는다.
 */
@Injectable()
export class DiaryMediaScheduler {
  private readonly logger = new Logger(DiaryMediaScheduler.name);

  constructor(private readonly mediaService: DiaryMediaService) {}

  /** 5분마다 — presigned만 받고 업로드하지 않은 만료 예약 정리 */
  @Cron('*/5 * * * *', { timeZone: 'Asia/Seoul' })
  async cleanupExpiredReservations() {
    if (!isSchedulerEnabled('diary')) return;

    const count = await this.mediaService.cleanupExpiredReservations();
    if (count > 0) {
      this.logger.log(`만료된 업로드 예약 정리: ${count}건`);
    }
  }

  /** 매시 10분 — 일기에 붙지 못한 고아 미디어 정리 */
  @Cron('10 * * * *', { timeZone: 'Asia/Seoul' })
  async cleanupOrphanMedia() {
    if (!isSchedulerEnabled('diary')) return;

    const count = await this.mediaService.cleanupOrphanMedia();
    if (count > 0) {
      this.logger.log(`고아 미디어 정리: ${count}건`);
    }
  }
}
