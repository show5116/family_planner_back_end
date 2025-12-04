import { Module } from '@nestjs/common';
import { GroupService } from '@/group/group.service';
import { GroupController } from '@/group/group.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
