import * as Sentry from '@sentry/nestjs';

// Sentry 초기화 (프로덕션 환경에서만)
const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env.SENTRY_DSN;

if (isProduction && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),
  });
}
