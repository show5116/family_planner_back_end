import { Module } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';
import { RedisModule } from '@/redis/redis.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AccountService } from './account.service';
import { AccountRecordService } from './account-record.service';
import { HoldingRecordService } from './holding-record.service';
import { AssetsStatisticsService } from './assets-statistics.service';
import { GoldAssetScheduler } from './scheduler/gold-asset.scheduler';

@Module({
  imports: [PrismaModule, NotificationModule, RedisModule],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    AccountService,
    AccountRecordService,
    HoldingRecordService,
    AssetsStatisticsService,
    GoldAssetScheduler,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
