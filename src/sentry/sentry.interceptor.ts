import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        error: (exception) => {
          // HTTP 컨텍스트 정보 추가
          const request = context.switchToHttp().getRequest();
          Sentry.withScope((scope) => {
            scope.setContext('http', {
              method: request.method,
              url: request.url,
              headers: request.headers,
              query: request.query,
              body: request.body,
            });
            Sentry.captureException(exception);
          });
        },
      }),
    );
  }
}
