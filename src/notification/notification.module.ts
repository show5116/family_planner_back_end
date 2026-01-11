import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationTokenService } from './notification-token.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationWorker } from './notification.worker';

/**
 * 알림 모듈
 * FCM 푸시 알림 및 알림 히스토리 관리
 */
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationTokenService,
    NotificationSettingsService,
    NotificationQueueService,
    NotificationWorker,
  ],
  exports: [
    NotificationService,
    NotificationTokenService,
    NotificationSettingsService,
    NotificationQueueService,
  ],
})
export class NotificationModule {}
