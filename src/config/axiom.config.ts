import { registerAs } from '@nestjs/config';

export default registerAs('axiom', () => ({
  token: process.env.AXIOM_TOKEN,
  dataset: process.env.AXIOM_DATASET || 'family-planner',
}));
