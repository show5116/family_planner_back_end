import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionAdminController } from './subscription-admin.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionAdminService } from './subscription-admin.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminGuard } from '@/auth/admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionController, SubscriptionAdminController],
  providers: [SubscriptionService, SubscriptionAdminService, AdminGuard],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
