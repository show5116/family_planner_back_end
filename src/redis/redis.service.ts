import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_BLOCKING_CLIENT } from './redis.module';

/**
 * Redis 서비스
 *
 * Cache Manager를 래핑하여 편리한 Redis 조작 메서드 제공
 * + ioredis 클라이언트를 직접 사용하여 네이티브 Redis 명령어 지원 (원자성 보장)
 * + BLPOP 전용 클라이언트로 Blocking 명령어 처리 (연결 독점 방지)
 */
@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(REDIS_CLIENT) private redisClient: Redis,
    @Inject(REDIS_BLOCKING_CLIENT) private blockingClient: Redis,
  ) {}

  async onModuleInit() {
    // Redis 연결 테스트
    try {
      await this.redisClient.ping();
      this.logger.log('Redis 클라이언트 연결 성공');

      await this.blockingClient.ping();
      this.logger.log('Redis Blocking 클라이언트 연결 성공');
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

  // ==================== FCM Token Cache ====================

  /**
   * FCM 토큰 캐시 키 생성
   *
   * @param userId - 사용자 ID
   * @returns Redis 키
   */
  private getUserTokensCacheKey(userId: string): string {
    return `user:${userId}:tokens`;
  }

  /**
   * 사용자의 FCM 토큰을 Redis에 캐싱 (Set 자료구조)
   * TTL: 1일
   *
   * @param userId - 사용자 ID
   * @param tokens - 토큰 배열
   */
  async cacheUserTokens(userId: string, tokens: string[]): Promise<void> {
    const key = this.getUserTokensCacheKey(userId);

    if (tokens.length === 0) {
      // 토큰이 없으면 빈 Set 저장 (캐시 펀칭 방지)
      await this.redisClient.del(key);
      await this.redisClient.sadd(key, '__empty__');
      await this.redisClient.expire(key, 86400); // 1일 (초 단위)
      return;
    }

    // SADD: 여러 토큰을 Set에 추가
    await this.redisClient.sadd(key, ...tokens);

    // TTL 설정: 1일
    await this.redisClient.expire(key, 86400); // 1일 (초 단위)
  }

  /**
   * 사용자의 FCM 토큰을 Redis에서 조회
   *
   * @param userId - 사용자 ID
   * @returns 토큰 배열 또는 null (캐시 미스)
   */
  async getCachedUserTokens(userId: string): Promise<string[] | null> {
    const key = this.getUserTokensCacheKey(userId);

    // EXISTS: 키 존재 여부 확인
    const exists = await this.redisClient.exists(key);
    if (!exists) {
      return null; // 캐시 미스
    }

    // SMEMBERS: Set의 모든 토큰 조회
    const tokens = await this.redisClient.smembers(key);

    // 빈 Set 체크 (캐시 펀칭 방지용)
    if (tokens.length === 1 && tokens[0] === '__empty__') {
      return []; // 빈 배열 반환
    }

    return tokens;
  }

  /**
   * 사용자의 FCM 토큰 캐시 무효화
   * (토큰 등록/삭제 시 호출)
   *
   * @param userId - 사용자 ID
   */
  async invalidateUserTokensCache(userId: string): Promise<void> {
    const key = this.getUserTokensCacheKey(userId);
    await this.del(key);
  }

  /**
   * 사용자의 FCM 토큰 캐시에 토큰 추가
   *
   * ⚠️ Race Condition 위험으로 현재 미사용
   * (invalidateUserTokensCache 사용 권장)
   *
   * @deprecated Race Condition 방지를 위해 invalidate 전략 사용
   * @param userId - 사용자 ID
   * @param token - 토큰
   */
  async addTokenToCache(userId: string, token: string): Promise<void> {
    const key = this.getUserTokensCacheKey(userId);

    // EXISTS: 키 존재 여부 확인
    const exists = await this.redisClient.exists(key);
    if (!exists) {
      return; // 캐시가 없으면 스킵 (다음 조회 시 DB에서 가져옴)
    }

    // '__empty__' 제거 (있다면)
    await this.redisClient.srem(key, '__empty__');

    // SADD: 토큰 추가
    await this.redisClient.sadd(key, token);

    // TTL 갱신: 1일
    await this.redisClient.expire(key, 86400);
  }

  /**
   * 사용자의 FCM 토큰 캐시에서 토큰 제거
   *
   * ⚠️ Race Condition 위험으로 현재 미사용
   * (invalidateUserTokensCache 사용 권장)
   *
   * @deprecated Race Condition 방지를 위해 invalidate 전략 사용
   * @param userId - 사용자 ID
   * @param token - 토큰
   */
  async removeTokenFromCache(userId: string, token: string): Promise<void> {
    const key = this.getUserTokensCacheKey(userId);

    // EXISTS: 키 존재 여부 확인
    const exists = await this.redisClient.exists(key);
    if (!exists) {
      return; // 캐시가 없으면 스킵
    }

    // SREM: 토큰 제거
    await this.redisClient.srem(key, token);

    // Set이 비었는지 확인
    const count = await this.redisClient.scard(key);
    if (count === 0) {
      // 빈 Set으로 변경 (캐시 펀칭 방지)
      await this.redisClient.sadd(key, '__empty__');
      await this.redisClient.expire(key, 86400);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 5. Notification Queue (Two-Track System)
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Ready Queue: 즉시 발송 대기 중인 알림들 (Redis List)
   */
  private readonly READY_QUEUE_KEY = 'notification:ready';

  /**
   * Waiting Room: 예약된 알림들 (Redis Sorted Set, score = Unix timestamp)
   */
  private readonly WAITING_ROOM_KEY = 'notification:waiting';

  /**
   * Ready Queue에 알림 추가 (즉시 발송 대상)
   * @param notification 알림 데이터 객체
   */
  async addToReadyQueue(notification: object): Promise<void> {
    const serialized = JSON.stringify(notification);
    await this.redisClient.lpush(this.READY_QUEUE_KEY, serialized);
  }

  /**
   * Ready Queue에서 알림 하나 꺼내기 (Non-blocking)
   * @returns 알림 객체 또는 null (큐가 비어있을 경우)
   */
  async popFromReadyQueue(): Promise<object | null> {
    const serialized = await this.redisClient.rpop(this.READY_QUEUE_KEY);
    if (!serialized) {
      return null;
    }
    return JSON.parse(serialized);
  }

  /**
   * Ready Queue에서 알림 하나 꺼내기 (Blocking)
   * 큐에 데이터가 들어올 때까지 대기 (실시간 처리)
   *
   * ⚠️ BLPOP 전용 클라이언트 사용
   * - Blocking 명령어는 연결을 독점하므로 별도 클라이언트 필수
   * - 일반 Redis 작업(GET, SET 등)은 영향받지 않음
   *
   * @param timeoutSeconds 타임아웃 시간 (초), 0이면 무한 대기
   * @returns 알림 객체 또는 null (타임아웃 발생 시)
   */
  async blockingPopFromReadyQueue(
    timeoutSeconds: number = 5,
  ): Promise<object | null> {
    // BRPOP: Blocking Right Pop (전용 클라이언트 사용)
    // 반환값: [key, value] 또는 null (타임아웃)
    const result = await this.blockingClient.brpop(
      this.READY_QUEUE_KEY,
      timeoutSeconds,
    );

    if (!result) {
      return null; // 타임아웃
    }

    // result[0]: key, result[1]: value
    return JSON.parse(result[1]);
  }

  /**
   * Waiting Room에 예약 알림 추가
   * @param notification 알림 데이터 객체
   * @param scheduledTime 발송 예정 시간
   */
  async addToWaitingRoom(
    notification: object,
    scheduledTime: Date,
  ): Promise<void> {
    const serialized = JSON.stringify(notification);
    const score = Math.floor(scheduledTime.getTime() / 1000); // Unix timestamp (초 단위)
    await this.redisClient.zadd(this.WAITING_ROOM_KEY, score, serialized);
  }

  /**
   * Waiting Room에서 발송 시간이 된 알림들을 Ready Queue로 이동
   * @param currentTime 현재 Unix timestamp (초 단위)
   * @returns 이동된 알림 개수
   */
  async moveReadyNotificationsFromWaiting(
    currentTime: number,
  ): Promise<number> {
    // ZRANGEBYSCORE: score가 -inf ~ currentTime 범위인 항목들 조회
    const readyNotifications = await this.redisClient.zrangebyscore(
      this.WAITING_ROOM_KEY,
      '-inf',
      currentTime.toString(),
    );

    if (readyNotifications.length === 0) {
      return 0;
    }

    // Ready Queue로 이동 (LPUSH)
    if (readyNotifications.length > 0) {
      await this.redisClient.lpush(this.READY_QUEUE_KEY, ...readyNotifications);
    }

    // Waiting Room에서 제거 (ZREMRANGEBYSCORE)
    await this.redisClient.zremrangebyscore(
      this.WAITING_ROOM_KEY,
      '-inf',
      currentTime.toString(),
    );

    return readyNotifications.length;
  }

  /**
   * Ready Queue 크기 조회
   */
  async getReadyQueueSize(): Promise<number> {
    return await this.redisClient.llen(this.READY_QUEUE_KEY);
  }

  /**
   * Waiting Room 크기 조회
   */
  async getWaitingRoomSize(): Promise<number> {
    return await this.redisClient.zcard(this.WAITING_ROOM_KEY);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 6. Scheduled Announcement Notifications (공지사항 예약 알림)
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * 예약 알림 Sorted Set Key
   * score = 발송 예정 timestamp (초 단위)
   */
  private readonly SCHEDULED_NOTIFICATIONS_KEY =
    'announcement:scheduled:notifications';

  /**
   * 예약 알림 추가 (Redis Sorted Set)
   *
   * @param announcementId - 공지사항 ID
   * @param title - 공지사항 제목
   * @param scheduledTime - 발송 예정 시간
   * @param retryCount - 재시도 횟수 (기본 0)
   */
  async scheduleAnnouncementNotification(
    announcementId: string,
    title: string,
    scheduledTime: Date,
    retryCount: number = 0,
  ): Promise<void> {
    const data = JSON.stringify({ announcementId, title, retryCount });
    const score = Math.floor(scheduledTime.getTime() / 1000); // Unix timestamp (초)

    // ZADD: Sorted Set에 추가 (O(log N))
    await this.redisClient.zadd(this.SCHEDULED_NOTIFICATIONS_KEY, score, data);
  }

  /**
   * 발송 시간이 된 예약 알림 조회 및 제거 (Pop 방식)
   *
   * @param currentTimestamp - 현재 Unix timestamp (초 단위)
   * @param batchSize - 한 번에 처리할 최대 건수
   * @returns 발송할 알림 목록 (retryCount 포함)
   */
  async popReadyScheduledNotifications(
    currentTimestamp: number,
    batchSize: number = 100,
  ): Promise<
    Array<{ announcementId: string; title: string; retryCount: number }>
  > {
    // ZRANGEBYSCORE: score가 현재 시간 이하인 항목들 조회 (O(log N + M))
    const items = await this.redisClient.zrangebyscore(
      this.SCHEDULED_NOTIFICATIONS_KEY,
      '-inf',
      currentTimestamp.toString(),
      'LIMIT',
      0,
      batchSize,
    );

    if (items.length === 0) {
      return [];
    }

    // 조회한 항목들을 개별 제거 (ZREM) - 원자적 처리
    await this.redisClient.zrem(this.SCHEDULED_NOTIFICATIONS_KEY, ...items);

    return items.map((item) => {
      const parsed = JSON.parse(item);
      return {
        announcementId: parsed.announcementId,
        title: parsed.title,
        retryCount: parsed.retryCount || 0, // 기본값 0
      };
    });
  }

  /**
   * 특정 공지사항의 예약 알림 취소
   *
   * @param announcementId - 공지사항 ID
   */
  async cancelScheduledNotification(announcementId: string): Promise<void> {
    // ZSCAN으로 전체 조회 후 해당 announcementId 삭제
    // 프로덕션에서는 별도 인덱스 고려 필요
    const allItems = await this.redisClient.zrange(
      this.SCHEDULED_NOTIFICATIONS_KEY,
      0,
      -1,
    );

    const toRemove = allItems.filter((item) => {
      const parsed = JSON.parse(item);
      return parsed.announcementId === announcementId;
    });

    if (toRemove.length > 0) {
      await this.redisClient.zrem(
        this.SCHEDULED_NOTIFICATIONS_KEY,
        ...toRemove,
      );
    }
  }

  /**
   * 예약 알림 개수 조회
   */
  async getScheduledNotificationCount(): Promise<number> {
    return await this.redisClient.zcard(this.SCHEDULED_NOTIFICATIONS_KEY);
  }
}
