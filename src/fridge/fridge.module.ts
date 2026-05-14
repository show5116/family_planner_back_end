import { Module } from '@nestjs/common';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { FridgeScheduler } from './fridge.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [FridgeController],
  providers: [FridgeService, FridgeScheduler],
})
export class FridgeModule {}
