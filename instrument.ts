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
    // 외부 API로는 추적 헤더(sentry-trace, baggage)를 보내지 않는다.
    //
    // baggage 에 담기는 'sentry-environment=production' 의 'environment=' 를
    // 공공데이터포털(data.go.kr) WAF 가 파라미터 인젝션으로 오탐해 요청을
    // 400 INVALID_REQUEST_PARAMETER_ERROR 로 거부한다. 샘플링된 요청에만
    // 헤더가 붙어 간헐적으로 실패하는 것처럼 보였다.
    //
    // 이 백엔드는 추적을 이어받을 하위 서비스를 호출하지 않으므로,
    // 전파 대상을 자기 자신으로만 제한해도 잃는 것이 없다.
    tracePropagationTargets: [/^\//],
  });
}
