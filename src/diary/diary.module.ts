import { Module } from '@nestjs/common';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { DiaryScheduler } from './diary.scheduler';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiaryController],
  providers: [DiaryService, DiaryScheduler],
  exports: [DiaryService],
})
export class DiaryModule {}
