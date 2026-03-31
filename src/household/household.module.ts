import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { HouseholdScheduler } from './household.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    NotificationModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HouseholdController],
  providers: [HouseholdService, HouseholdScheduler],
  exports: [HouseholdService],
})
export class HouseholdModule {}
