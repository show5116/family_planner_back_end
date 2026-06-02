import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.userId;
    return Promise.resolve(userId ?? req.ip);
  }

  protected getThrottlers(context: ExecutionContext) {
    if (process.env.NODE_ENV !== 'production') {
      return Promise.resolve([{ ttl: 60000, limit: 10000, name: 'local' }]);
    }

    const req = context.switchToHttp().getRequest();
    const isAuthenticated = !!req.user?.userId;

    if (isAuthenticated) {
      return Promise.resolve([
        { ttl: 60000, limit: 60, name: 'authenticated' },
      ]);
    }
    return Promise.resolve([{ ttl: 60000, limit: 10, name: 'anonymous' }]);
  }
}
