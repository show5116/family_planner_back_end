import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://family-planner-web.netlify.app',
      ],
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
}));
