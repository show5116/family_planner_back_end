import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { CategoryService } from './category.service';
import { RecurringService } from './recurring.service';
import { TaskSchedulerService } from './task-scheduler.service';
import { TaskHistoryListener, TaskNotificationListener } from './listeners';
import { HolidayService } from './holiday.service';
import { NotificationModule } from '@/notification/notification.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [NotificationModule, RedisModule, HttpModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    CategoryService,
    RecurringService,
    TaskSchedulerService,
    TaskHistoryListener,
    TaskNotificationListener,
    HolidayService,
  ],
  exports: [TaskService, CategoryService, RecurringService],
})
export class TaskModule {}
