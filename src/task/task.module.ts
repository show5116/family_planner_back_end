import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { CategoryService } from './category.service';
import { RecurringService } from './recurring.service';
import { TaskSchedulerService } from './task-scheduler.service';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    CategoryService,
    RecurringService,
    TaskSchedulerService,
  ],
  exports: [TaskService, CategoryService, RecurringService],
})
export class TaskModule {}
