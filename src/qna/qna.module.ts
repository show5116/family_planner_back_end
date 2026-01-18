import { Module } from '@nestjs/common';
import { QnaController } from './qna.controller';
import { QnaAdminController } from './qna-admin.controller';
import { QnaService } from './qna.service';
import { QnaScheduler } from './qna.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';
import { WebhookModule } from '@/webhook/webhook.module';

@Module({
  imports: [PrismaModule, NotificationModule, WebhookModule],
  controllers: [QnaController, QnaAdminController],
  providers: [QnaService, QnaScheduler],
  exports: [QnaService],
})
export class QnaModule {}
