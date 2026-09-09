import { Module } from '@nestjs/common';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { DiaryScheduler } from './diary.scheduler';
import { DiaryMediaController } from './media/diary-media.controller';
import { DiaryMediaService } from './media/diary-media.service';
import { DiaryMediaQuotaService } from './media/diary-media-quota.service';
import { DiaryMediaScheduler } from './media/diary-media.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { SubscriptionModule } from '@/subscription/subscription.module';

@Module({
  imports: [PrismaModule, StorageModule, SubscriptionModule],
  // 미디어 라우트(/diaries/media/*)를 먼저 등록해 :id 라우트에 먹히지 않게 한다
  controllers: [DiaryMediaController, DiaryController],
  providers: [
    DiaryService,
    DiaryScheduler,
    DiaryMediaService,
    DiaryMediaQuotaService,
    DiaryMediaScheduler,
  ],
  exports: [DiaryService],
})
export class DiaryModule {}
