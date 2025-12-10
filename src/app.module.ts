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
import axiomConfig from '@/config/axiom.config';
import { validationSchema } from '@/config/env.validation';
import { SentryModule } from '@/sentry/sentry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, smtpConfig, oauthConfig, axiomConfig],
      envFilePath: '.env',
      validationSchema: validationSchema,
      validationOptions: {
        abortEarly: false, // 모든 에러를 한 번에 표시
        allowUnknown: true, // 정의되지 않은 환경 변수 허용
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('app.nodeEnv') === 'production';
        const axiomToken = config.get<string>('axiom.token');
        const axiomDataset = config.get<string>('axiom.dataset');

        // Axiom transport 설정 (프로덕션 + Axiom 토큰이 있을 때)
        const axiomTransport =
          isProduction && axiomToken
            ? {
                target: '@axiomhq/pino',
                options: {
                  dataset: axiomDataset,
                  token: axiomToken,
                },
              }
            : undefined;

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport:
              axiomTransport ||
              (isProduction
                ? undefined
                : {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'yyyy-mm-dd HH:MM:ss',
                      ignore: 'pid,hostname',
                    },
                  }),
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
    SentryModule,
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
