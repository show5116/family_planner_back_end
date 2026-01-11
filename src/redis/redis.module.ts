import { Global, Module, DynamicModule, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

/**
 * ioredis 클라이언트 제공을 위한 토큰
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * BLPOP 전용 ioredis 클라이언트 토큰
 * Blocking 명령어는 연결을 독점하므로 별도 클라이언트 사용
 */
export const REDIS_BLOCKING_CLIENT = 'REDIS_BLOCKING_CLIENT';

/**
 * Redis 모듈
 *
 * @Global - 전역 모듈로 설정하여 다른 모듈에서 import 없이 사용 가능
 */
@Global()
@Module({})
export class RedisModule {
  private static readonly logger = new Logger(RedisModule.name);

  static forRoot(): DynamicModule {
    const redisClientProvider = {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          throw new Error(
            'REDIS_URL 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.',
          );
        }

        const client = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              RedisModule.logger.error('Redis 재연결 시도 초과');
              return null; // 재연결 중단
            }
            return Math.min(times * 100, 3000);
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });

        client.on('connect', () => {
          RedisModule.logger.log('ioredis 클라이언트 연결 성공');
        });

        client.on('error', (error) => {
          RedisModule.logger.error(`ioredis 클라이언트 에러: ${error.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    };

    // BLPOP 전용 Redis 클라이언트 (별도 연결)
    const redisBlockingClientProvider = {
      provide: REDIS_BLOCKING_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          throw new Error(
            'REDIS_URL 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.',
          );
        }

        // ioredis의 duplicate()로 별도 연결 생성
        // Blocking 명령어(BLPOP)는 연결을 독점하므로 분리 필수
        const client = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              RedisModule.logger.error(
                'Redis Blocking Client 재연결 시도 초과',
              );
              return null;
            }
            return Math.min(times * 100, 3000);
          },
          maxRetriesPerRequest: null, // Blocking 명령어는 무제한 재시도
          enableReadyCheck: true,
          lazyConnect: false,
        });

        client.on('connect', () => {
          RedisModule.logger.log(
            'Redis Blocking Client (BLPOP 전용) 연결 성공',
          );
        });

        client.on('error', (error) => {
          RedisModule.logger.error(
            `Redis Blocking Client 에러: ${error.message}`,
          );
        });

        return client;
      },
      inject: [ConfigService],
    };

    return {
      global: true,
      module: RedisModule,
      imports: [
        CacheModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisUrl = configService.get<string>('REDIS_URL');

            if (!redisUrl) {
              throw new Error(
                'REDIS_URL 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.',
              );
            }

            // Redis URL 파싱
            const url = new URL(redisUrl);

            const store = await redisStore({
              socket: {
                host: url.hostname,
                port: parseInt(url.port || '6379'),
                connectTimeout: 5000, // 5초 타임아웃
                reconnectStrategy: (retries) => {
                  if (retries > 3) {
                    RedisModule.logger.error('Redis 재연결 시도 초과');
                    return new Error('Redis 재연결 실패');
                  }
                  return Math.min(retries * 100, 3000);
                },
              },
              password: url.password || undefined,
              username: url.username || undefined,
              ttl: 60 * 60 * 1000, // 기본 TTL: 1시간 (밀리초)
            });

            RedisModule.logger.log('Redis 스토어 생성 완료');

            return {
              store: store as any,
              ttl: 60 * 60 * 1000,
            };
          },
        }),
      ],
      providers: [
        redisClientProvider,
        redisBlockingClientProvider,
        RedisService,
      ],
      exports: [RedisService, CacheModule, REDIS_CLIENT, REDIS_BLOCKING_CLIENT],
    };
  }
}
