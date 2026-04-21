import { SetMetadata } from '@nestjs/common';
import { TIMEOUT_KEY } from '@/common/interceptors/timeout.interceptor';

export const Timeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);
