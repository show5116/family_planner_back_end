import { Module } from '@nestjs/common';
import { ChildcareController } from './childcare.controller';
import { ChildcareService } from './childcare.service';
import { ChildcareScheduler } from './childcare.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [PrismaModule, NotificationModule, RedisModule],
  controllers: [ChildcareController],
  providers: [ChildcareService, ChildcareScheduler],
  exports: [ChildcareService],
})
export class ChildcareModule {}
