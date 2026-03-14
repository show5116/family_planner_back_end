import { registerAs } from '@nestjs/config';

export default registerAs('weather', () => ({
  kmaServiceKey: process.env.KMA_SERVICE_KEY || '',
}));
