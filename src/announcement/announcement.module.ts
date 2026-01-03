import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AnnouncementScheduler } from './announcement.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule, ScheduleModule.forRoot()],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, AnnouncementScheduler],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
