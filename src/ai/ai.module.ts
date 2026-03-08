import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from '@/ai/ai.controller';
import { AiService } from '@/ai/ai.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
