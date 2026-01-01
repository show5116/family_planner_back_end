import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Redis 서비스
 *
 * Cache Manager를 래핑하여 편리한 Redis 조작 메서드 제공
 */
@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 값 저장
   *
   * @param key - 키
   * @param value - 값
   * @param ttl - TTL (밀리초, 선택)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * 값 조회
   *
   * @param key - 키
   * @returns 값 (없으면 null)
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  /**
   * 값 삭제
   *
   * @param key - 키
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * 키 존재 여부 확인
   *
   * @param key - 키
   * @returns 존재하면 true, 없으면 false
   */
  async has(key: string): Promise<boolean> {
    const value = await this.cacheManager.get(key);
    return value !== undefined && value !== null;
  }

  /**
   * TTL(Time To Live) 설정
   *
   * @param key - 키
   * @param ttl - TTL (밀리초)
   */
  async setTtl(key: string, ttl: number): Promise<void> {
    const value = await this.cacheManager.get(key);
    if (value !== undefined && value !== null) {
      await this.cacheManager.set(key, value, ttl);
    }
  }

  /**
   * 여러 키 일괄 삭제
   *
   * @param keys - 키 배열
   */
  async delMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }
}
