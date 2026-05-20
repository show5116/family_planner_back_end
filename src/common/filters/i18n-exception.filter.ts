import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService, I18nValidationException } from 'nestjs-i18n';

@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang = (request as any).i18nLang ?? 'ko';

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

    const message = await this.translateKey(rawMessage, lang);

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name.replace('Exception', ''),
    });
  }

  private async translateKey(key: string, lang: string): Promise<string> {
    try {
      const translated = await this.i18n.translate(key as any, { lang });
      // translate()가 키 그대로 반환하면 번역 실패 → 원문 반환
      if (translated === key) return key;
      return translated as string;
    } catch {
      return key;
    }
  }
}
