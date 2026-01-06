import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

/**
 * Redis 서비스
 *
 * Cache Manager를 래핑하여 편리한 Redis 조작 메서드 제공
 * + ioredis 클라이언트를 직접 사용하여 네이티브 Redis 명령어 지원 (원자성 보장)
 */
@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(REDIS_CLIENT) private redisClient: Redis,
  ) {}

  async onModuleInit() {
    // Redis 연결 테스트
    try {
      await this.redisClient.ping();
      this.logger.log('Redis 클라이언트 연결 성공');
    } catch (error) {
      this.logger.error('Redis 클라이언트 연결 테스트 실패', error);
      throw error; // 연결 실패 시 애플리케이션 시작 중단
    }
  }

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
   * 키 존재 여부 확인 (EXISTS 명령어 사용 - 최적화)
   *
   * @param key - 키
   * @returns 존재하면 true, 없으면 false
   */
  async has(key: string): Promise<boolean> {
    const exists = await this.redisClient.exists(key);
    return exists === 1;
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

  /**
   * 공지사항 조회수 증가 (Write-Back 전략)
   * Redis INCR + SADD 사용으로 원자성 보장
   *
   * @param announcementId - 공지사항 ID
   * @returns 증가된 조회수
   */
  async incrementAnnouncementViewCount(
    announcementId: string,
  ): Promise<number> {
    const key = `announcement:viewCount:${announcementId}`;
    const setKey = 'announcement:viewCount:tracking';

    // INCR: 원자적으로 카운트 증가 (O(1))
    const newCount = await this.redisClient.incr(key);

    // SADD: 원자적으로 Set에 추가 (중복 자동 처리, O(1))
    await this.redisClient.sadd(setKey, announcementId);

    return newCount;
  }

  /**
   * 공지사항 조회수 조회 (Redis)
   *
   * @param announcementId - 공지사항 ID
   * @returns 조회수
   */
  async getAnnouncementViewCount(announcementId: string): Promise<number> {
    const key = `announcement:viewCount:${announcementId}`;
    return (await this.get<number>(key)) || 0;
  }

  /**
   * 모든 공지사항 조회수 조회 (DB 동기화용)
   * SMEMBERS 사용으로 O(N) 대신 Set 자료구조 활용
   *
   * @returns { announcementId: viewCount }
   */
  async getAllAnnouncementViewCounts(): Promise<Record<string, number>> {
    const setKey = 'announcement:viewCount:tracking';

    // SMEMBERS: Set의 모든 멤버 조회
    const trackingSet = await this.redisClient.smembers(setKey);

    const viewCounts: Record<string, number> = {};

    for (const announcementId of trackingSet) {
      const count = await this.getAnnouncementViewCount(announcementId);
      if (count > 0) {
        viewCounts[announcementId] = count;
      }
    }

    return viewCounts;
  }

  /**
   * 공지사항 조회수 차감 (DB 동기화 후 호출)
   * DECRBY 사용으로 Race Condition 방지 (차감 방식)
   *
   * @param announcementId - 공지사항 ID
   * @param count - 차감할 조회수
   */
  async decrementAnnouncementViewCount(
    announcementId: string,
    count: number,
  ): Promise<void> {
    const key = `announcement:viewCount:${announcementId}`;
    const setKey = 'announcement:viewCount:tracking';

    // DECRBY: 원자적으로 카운트 차감 (O(1))
    const newCount = await this.redisClient.decrby(key, count);

    // 0 이하면 키와 tracking 제거
    if (newCount <= 0) {
      await this.del(key);
      await this.redisClient.srem(setKey, announcementId);
    }
  }

  /**
   * 공지사항 내용 캐싱 (TTL: 7일)
   *
   * @param announcementId - 공지사항 ID
   * @param data - 공지사항 데이터
   */
  async cacheAnnouncement(announcementId: string, data: any): Promise<void> {
    const key = `announcement:content:${announcementId}`;
    const ttl = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)
    await this.set(key, data, ttl);
  }

  /**
   * 캐시된 공지사항 조회
   *
   * @param announcementId - 공지사항 ID
   * @returns 공지사항 데이터 또는 null
   */

  async getCachedAnnouncement(announcementId: string): Promise<any | null> {
    const key = `announcement:content:${announcementId}`;
    return await this.get(key);
  }

  /**
   * 공지사항 캐시 무효화 (수정/삭제 시)
   *
   * @param announcementId - 공지사항 ID
   */
  async invalidateAnnouncementCache(announcementId: string): Promise<void> {
    const contentKey = `announcement:content:${announcementId}`;
    await this.del(contentKey);
  }

  /**
   * 공지사항 목록 캐싱 (TTL: 5분)
   *
   * @param cacheKey - 캐시 키
   * @param data - 목록 데이터
   */
  async cacheAnnouncementList(cacheKey: string, data: any): Promise<void> {
    const key = `announcement:list:${cacheKey}`;
    const ttl = 5 * 60 * 1000; // 5분 (밀리초)
    await this.set(key, data, ttl);
  }

  /**
   * 캐시된 공지사항 목록 조회
   *
   * @param cacheKey - 캐시 키
   * @returns 목록 데이터 또는 null
   */

  async getCachedAnnouncementList(cacheKey: string): Promise<any | null> {
    const key = `announcement:list:${cacheKey}`;
    return await this.get(key);
  }

  /**
   * 공지사항 목록 캐시 전체 무효화
   * (새 공지 작성, 수정, 삭제 시)
   */
  async invalidateAllAnnouncementListCache(): Promise<void> {
    // cache-manager는 패턴 삭제를 지원하지 않으므로
    // 실제로는 버전 관리 또는 별도 구현 필요
    // 여기서는 간단히 구현 (실제 프로덕션에서는 개선 필요)
  }

  /**
   * 공지사항 읽음 처리 (Write-Back 전략)
   * SETNX + SADD 사용으로 원자성 보장 및 Race Condition 방지
   *
   * @param announcementId - 공지사항 ID
   * @param userId - 사용자 ID
   */
  async markAnnouncementAsRead(
    announcementId: string,
    userId: string,
  ): Promise<void> {
    const key = `announcement:read:${announcementId}:${userId}`;
    const trackingKey = 'announcement:read:tracking';
    const item = `${announcementId}:${userId}`;

    // SETNX: 키가 없을 때만 설정 (원자적, 중복 방지)
    const wasSet = await this.redisClient.setnx(key, new Date().toISOString());

    // 이미 존재하면 스킵
    if (!wasSet) {
      return;
    }

    // SADD: 원자적으로 Set에 추가 (중복 자동 처리, O(1))
    await this.redisClient.sadd(trackingKey, item);
  }

  /**
   * 사용자가 공지사항을 읽었는지 확인
   *
   * @param announcementId - 공지사항 ID
   * @param userId - 사용자 ID
   * @returns 읽었으면 true
   */
  async isAnnouncementRead(
    announcementId: string,
    userId: string,
  ): Promise<boolean> {
    const key = `announcement:read:${announcementId}:${userId}`;
    return await this.has(key);
  }

  /**
   * 여러 공지사항의 읽음 상태 일괄 조회 (Pipeline 사용)
   * N+1 문제 해결 - 단일 네트워크 RTT로 처리
   *
   * @param announcementIds - 공지사항 ID 배열
   * @param userId - 사용자 ID
   * @returns { announcementId: isRead }
   */
  async batchIsAnnouncementRead(
    announcementIds: string[],
    userId: string,
  ): Promise<Record<string, boolean>> {
    if (announcementIds.length === 0) {
      return {};
    }

    const keys = announcementIds.map(
      (id) => `announcement:read:${id}:${userId}`,
    );

    // Pipeline을 사용하여 단일 RTT로 여러 EXISTS 명령 실행
    const pipeline = this.redisClient.multi();
    keys.forEach((key) => pipeline.exists(key));
    const results = await pipeline.exec();

    // 결과 매핑
    const readStatus: Record<string, boolean> = {};
    announcementIds.forEach((id, index) => {
      // exec() returns [error, result][] format
      const [, result] = results[index];
      readStatus[id] = result === 1;
    });

    return readStatus;
  }

  /**
   * 여러 공지사항의 조회수 일괄 조회 (MGET 사용)
   * N+1 문제 해결 - 단일 네트워크 RTT로 처리
   *
   * @param announcementIds - 공지사항 ID 배열
   * @returns { announcementId: viewCount }
   */
  async batchGetAnnouncementViewCount(
    announcementIds: string[],
  ): Promise<Record<string, number>> {
    if (announcementIds.length === 0) {
      return {};
    }

    const keys = announcementIds.map((id) => `announcement:viewCount:${id}`);

    // MGET: 여러 키의 값을 단일 명령으로 조회 (O(N))
    const values = await this.redisClient.mget(...keys);

    // 결과 매핑
    const viewCounts: Record<string, number> = {};
    announcementIds.forEach((id, index) => {
      viewCounts[id] = values[index] ? parseInt(values[index], 10) : 0;
    });

    return viewCounts;
  }

  /**
   * 모든 읽음 처리 기록 조회 (DB 동기화용)
   * SMEMBERS 사용 + Promise.all로 병렬 처리
   *
   * @returns [{ announcementId, userId, readAt }]
   */
  async getAllAnnouncementReads(): Promise<
    Array<{ announcementId: string; userId: string; readAt: string }>
  > {
    const trackingKey = 'announcement:read:tracking';

    // SMEMBERS: Set의 모든 멤버 조회

    const trackingList = await this.redisClient.smembers(trackingKey);

    // Promise.all로 병렬 처리 (N+1 문제 해결)
    const readPromises = trackingList.map(async (item: string) => {
      const [announcementId, userId] = item.split(':');
      const key = `announcement:read:${announcementId}:${userId}`;
      const readAt = await this.get<string>(key);

      if (readAt) {
        return { announcementId, userId, readAt };
      }
      return null;
    });

    const results = await Promise.all(readPromises);

    // null 필터링
    return results.filter(
      (
        read,
      ): read is { announcementId: string; userId: string; readAt: string } =>
        read !== null,
    );
  }

  /**
   * 배치 크기만큼 읽음 처리 기록 조회 및 삭제 (Pop 방식)
   * SPOP 사용으로 원자적 Pop 연산 보장 (메모리 보호 + Race Condition 방지)
   * Promise.all로 병렬 처리
   *
   * @param batchSize - 한 번에 처리할 최대 건수
   * @returns [{ announcementId, userId, readAt }]
   */
  async popAnnouncementReads(
    batchSize: number,
  ): Promise<
    Array<{ announcementId: string; userId: string; readAt: string }>
  > {
    const trackingKey = 'announcement:read:tracking';

    // SPOP: Set에서 원자적으로 N개 제거하며 반환 (O(N))
    // 동시 요청에도 안전 - 각 요청이 다른 아이템을 가져감
    const items = await this.redisClient.spop(trackingKey, batchSize);

    if (!items || items.length === 0) {
      return [];
    }

    // Promise.all로 병렬 처리 (N+1 문제 해결)
    const readPromises = items.map(async (item: string) => {
      const [announcementId, userId] = item.split(':');
      const key = `announcement:read:${announcementId}:${userId}`;
      const readAt = await this.get<string>(key);

      if (readAt) {
        return { announcementId, userId, readAt, key };
      }
      return null;
    });

    const results = await Promise.all(readPromises);

    // null 필터링 및 삭제할 키 추출
    const validReads = results.filter((read) => read !== null);
    const deleteKeys = validReads.map((read) => read.key);

    // 개별 키 일괄 삭제
    if (deleteKeys.length > 0) {
      await this.delMany(deleteKeys);
    }

    // key 필드 제거하여 반환
    return validReads.map(({ announcementId, userId, readAt }) => ({
      announcementId,
      userId,
      readAt,
    }));
  }

  /**
   * 읽음 처리 기록 삭제 (DB 동기화 후)
   * SREM 사용으로 원자적 제거
   *
   * @param announcementId - 공지사항 ID
   * @param userId - 사용자 ID
   */
  async deleteAnnouncementRead(
    announcementId: string,
    userId: string,
  ): Promise<void> {
    const key = `announcement:read:${announcementId}:${userId}`;
    const trackingKey = 'announcement:read:tracking';
    const item = `${announcementId}:${userId}`;

    await this.del(key);

    // SREM: Set에서 원자적으로 제거 (O(1))
    await this.redisClient.srem(trackingKey, item);
  }

  /**
   * 모든 읽음 처리 기록 일괄 삭제 (DB 동기화 후)
   * SMEMBERS + DEL 사용
   */
  async clearAllAnnouncementReads(): Promise<void> {
    const trackingKey = 'announcement:read:tracking';

    // SMEMBERS: Set의 모든 멤버 조회
    const trackingList = await this.redisClient.smembers(trackingKey);

    // 모든 읽음 처리 키 삭제
    const deleteKeys = trackingList.map((item: string) => {
      const [announcementId, userId] = item.split(':');
      return `announcement:read:${announcementId}:${userId}`;
    });

    // 추적 목록 키도 삭제
    deleteKeys.push(trackingKey);

    // 일괄 삭제
    await this.delMany(deleteKeys);
  }
}
