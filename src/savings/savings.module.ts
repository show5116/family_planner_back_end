import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import { SavingsScheduler } from './savings.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule, ScheduleModule.forRoot()],
  controllers: [SavingsController],
  providers: [SavingsService, SavingsScheduler],
  exports: [SavingsService],
})
export class SavingsModule {}
