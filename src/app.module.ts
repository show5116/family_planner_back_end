import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
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
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('app.nodeEnv') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                },
            customProps: () => ({
              context: 'HTTP',
            }),
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
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
