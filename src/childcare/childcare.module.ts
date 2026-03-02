import { Module } from '@nestjs/common';
import { ChildcareController } from './childcare.controller';
import { ChildcareService } from './childcare.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ChildcareController],
  providers: [ChildcareService],
  exports: [ChildcareService],
})
export class ChildcareModule {}
