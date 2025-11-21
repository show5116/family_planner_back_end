import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { GroupModule } from './group/group.module';

@Module({
  imports: [PrismaModule, AuthModule, EmailModule, GroupModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
