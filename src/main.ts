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
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Pino Logger 설정
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);

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
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 요청 거부
      transform: true, // 요청 데이터를 DTO 인스턴스로 자동 변환
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
  await app.listen(port);
}
void bootstrap();
