import * as Joi from 'joi';

/**
 * 환경 변수 검증 스키마
 * 필수 환경 변수가 없으면 애플리케이션 시작이 중단됩니다.
 */
export const validationSchema = Joi.object({
  // Node 환경
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // 애플리케이션 설정
  PORT: Joi.number().default(3000),
  FRONTEND_URL: Joi.string().uri().required(),

  // 데이터베이스
  DATABASE_URL: Joi.string().required(),

  // JWT 설정
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // SMTP 설정
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_USER: Joi.string().email().required(),
  SMTP_PASSWORD: Joi.string().required(),
  SMTP_FROM: Joi.string().required(),

  // Google OAuth (선택적)
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),

  // Kakao OAuth (선택적)
  KAKAO_CLIENT_ID: Joi.string().optional(),
  KAKAO_CLIENT_SECRET: Joi.string().optional().allow(''),
  KAKAO_CALLBACK_URL: Joi.string().uri().optional(),

  // CORS 설정 (선택적)
  CORS_ORIGINS: Joi.string().optional(),

  // 로그 설정
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),

  // Axiom 설정 (선택적, 하지만 둘 다 있거나 둘 다 없어야 함)
  AXIOM_TOKEN: Joi.string().optional(),
  AXIOM_DATASET: Joi.string().optional(),

  // Sentry 설정 (선택적)
  SENTRY_DSN: Joi.string().uri().optional(),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),

  // Cloudflare R2 설정
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().uri().optional(), // Custom domain이 있는 경우
})
  // Axiom 설정 검증: 토큰이 있으면 dataset도 필수
  .custom((value, helpers) => {
    if (value.AXIOM_TOKEN && !value.AXIOM_DATASET) {
      return helpers.error('any.custom', {
        message: 'AXIOM_DATASET is required when AXIOM_TOKEN is provided',
      });
    }
    if (!value.AXIOM_TOKEN && value.AXIOM_DATASET) {
      return helpers.error('any.custom', {
        message: 'AXIOM_TOKEN is required when AXIOM_DATASET is provided',
      });
    }
    return value;
  });
