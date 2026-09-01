import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isSchedulerEnabled } from '@/common/base.scheduler';
import { DiaryService } from './diary.service';

@Injectable()
export class DiaryScheduler {
  private readonly logger = new Logger(DiaryScheduler.name);

  constructor(private readonly diaryService: DiaryService) {}

  /**
   * 매일 04:30 KST — 삭제 후 30일이 지난 일기 완전 삭제
   * (하루 경계인 04:00 직후에 돌려 통계와 기준을 맞춘다)
   */
  @Cron('30 4 * * *', { timeZone: 'Asia/Seoul' })
  async purgeDeletedDiaries() {
    if (!isSchedulerEnabled('diary')) return;

    const count = await this.diaryService.purgeExpired();
    this.logger.log(`30일 경과 일기 완전 삭제: ${count}건`);
  }
}
