// Sentry 초기화 (가장 먼저 import)
import '../instrument';

import { execSync } from 'child_process';

// Windows 환경에서 UTF-8 출력 설정 (콘솔 코드페이지도 변경)
if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding('utf-8');
  process.stderr.setDefaultEncoding('utf-8');

  // Windows 콘솔 코드페이지를 UTF-8(65001)로 설정
  try {
    execSync('chcp 65001', { stdio: 'ignore' });
  } catch (error) {
    // 실패해도 계속 진행
  }
}

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationPipe } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { VersioningType } from '@nestjs/common';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true, // Raw body 활성화
  });

  // ETag 비활성화: 304 응답으로 인한 클라이언트 재호출 루프 방지
  app.getHttpAdapter().getInstance().set('etag', false);

  // Pino Logger 설정
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);

  // API URI 버전 관리 (/v1/)
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Cookie 파서 미들웨어 설정
  app.use(cookieParser());

  // 정적 파일 서빙 (Universal Links/App Links 검증 파일용)
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  // CORS 설정
  const allowedOrigins = configService.get<string[]>('app.corsOrigins');

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('가족 플래너 API')
    .setDescription('가족 플래너 백엔드 API 문서')
    .setVersion('1.0')
    .addTag('family-planner')
    .addBearerAuth() // JWT 인증 추가
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('app.port');
  const server = await app.listen(port);

  // 어드민 히스토리 초기화 등 장기 실행 요청을 위해 서버 타임아웃 비활성화
  server.setTimeout(0);
}
void bootstrap();
