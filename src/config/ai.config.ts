import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  microserviceUrl: process.env.AI_MICROSERVICE_URL || 'http://localhost:8000',
  microserviceApiKey: process.env.AI_MICROSERVICE_API_KEY || '',
}));
