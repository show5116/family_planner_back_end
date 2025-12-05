import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { EmailModule } from '@/email/email.module';
import { GroupModule } from '@/group/group.module';
import { PermissionModule } from '@/permission/permission.module';
import { RoleModule } from './role/role.module';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import appConfig from '@/config/app.config';
import jwtConfig from '@/config/jwt.config';
import smtpConfig from '@/config/smtp.config';
import oauthConfig from '@/config/oauth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, smtpConfig, oauthConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    EmailModule,
    GroupModule,
    PermissionModule,
    RoleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
