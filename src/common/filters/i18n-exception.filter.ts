import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService, I18nValidationException, I18nContext } from 'nestjs-i18n';

@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const acceptLang = request.headers['accept-language'];
    const lang = acceptLang
      ? acceptLang.split(',')[0].trim().split('-')[0]
      : (I18nContext.current()?.lang ?? 'ko');

    if (exception instanceof I18nValidationException) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.errors
          .flatMap((e) => Object.values(e.constraints ?? {}))
          .filter(Boolean),
        error: 'Bad Request',
      });
    }

    if (!(exception instanceof HttpException)) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });
    }

    const status = exception.getStatus();
    const rawMessage = exception.message;

    const message = this.translateKey(rawMessage, lang);

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name.replace('Exception', ''),
    });
  }

  private translateKey(key: string, lang: string): string {
    try {
      const translated = this.i18n.t(key as any, { lang });
      if (!translated || translated === key) return key;
      return translated as string;
    } catch {
      return key;
    }
  }
}
