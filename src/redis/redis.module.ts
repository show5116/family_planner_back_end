import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisService } from './redis.service';

/**
 * Redis 모듈
 *
 * @Global - 전역 모듈로 설정하여 다른 모듈에서 import 없이 사용 가능
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          throw new Error('REDIS_URL 환경 변수가 설정되지 않았습니다.');
        }

        const store = await redisStore({
          url: redisUrl,
          ttl: 60 * 60 * 1000, // 기본 TTL: 1시간 (밀리초)
        });

        return {
          store: store as any,
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {}
