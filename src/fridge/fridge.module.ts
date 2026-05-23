import { Module } from '@nestjs/common';
import { FridgeController } from './fridge.controller';
import { FridgeService } from './fridge.service';
import { FridgeScheduler } from './fridge.scheduler';
import { ExpiryPresetController } from './expiry-preset.controller';
import { ExpiryPresetService } from './expiry-preset.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [FridgeController, ExpiryPresetController],
  providers: [FridgeService, FridgeScheduler, ExpiryPresetService],
})
export class FridgeModule {}
