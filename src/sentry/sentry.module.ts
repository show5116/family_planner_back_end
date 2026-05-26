import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryModule as SentrySDKModule } from '@sentry/nestjs/setup';
import { SentryInterceptor } from './sentry.interceptor';

@Module({
  imports: [SentrySDKModule.forRoot()],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class SentryModule {}
