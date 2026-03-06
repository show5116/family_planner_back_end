import { Module } from '@nestjs/common';
import { MinigameController } from './minigame.controller';
import { MinigameService } from './minigame.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MinigameController],
  providers: [MinigameService],
})
export class MinigameModule {}
