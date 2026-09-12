import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionAdminController } from './subscription-admin.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionAdminService } from './subscription-admin.service';
import { SubscriptionReconcileScheduler } from './subscription-reconcile.scheduler';
import { SubscriptionExpiryScheduler } from './subscription-expiry.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';
import { AdminGuard } from '@/auth/admin.guard';
import { AndroidSubscriptionVerifier } from './verifiers/android-subscription.verifier';
import { IosSubscriptionVerifier } from './verifiers/ios-subscription.verifier';
import {
  ANDROID_SUBSCRIPTION_VERIFIER,
  IOS_SUBSCRIPTION_VERIFIER,
} from './verifiers/subscription-verifier.interface';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [SubscriptionController, SubscriptionAdminController],
  providers: [
    SubscriptionService,
    SubscriptionAdminService,
    SubscriptionReconcileScheduler,
    SubscriptionExpiryScheduler,
    AdminGuard,
    AndroidSubscriptionVerifier,
    IosSubscriptionVerifier,
    {
      provide: ANDROID_SUBSCRIPTION_VERIFIER,
      useExisting: AndroidSubscriptionVerifier,
    },
    {
      provide: IOS_SUBSCRIPTION_VERIFIER,
      useExisting: IosSubscriptionVerifier,
    },
  ],
  exports: [
    SubscriptionService,
    AndroidSubscriptionVerifier,
    IosSubscriptionVerifier,
  ],
})
export class SubscriptionModule {}
