import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { RoutineStatsService } from './routine-stats.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoutineController],
  providers: [RoutineService, RoutineStatsService],
  exports: [RoutineService],
})
export class RoutineModule {}
