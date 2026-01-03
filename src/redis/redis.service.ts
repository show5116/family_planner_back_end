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

  /**
   * 공지사항 조회수 증가 (Write-Back 전략)
   * Redis에만 카운트를 저장하고, 스케줄러가 주기적으로 DB에 동기화
   *
   * @param announcementId - 공지사항 ID
   * @returns 증가된 조회수
   */
  async incrementAnnouncementViewCount(
    announcementId: string,
  ): Promise<number> {
    const key = `announcement:viewCount:${announcementId}`;
    const setKey = 'announcement:viewCount:tracking';

    const currentCount = (await this.get<number>(key)) || 0;
    const newCount = currentCount + 1;
    await this.set(key, newCount); // TTL 없이 저장 (스케줄러가 삭제)

    // 추적 Set에 announcementId 추가
    const trackingSet = (await this.get<string[]>(setKey)) || [];
    if (!trackingSet.includes(announcementId)) {
      trackingSet.push(announcementId);
      await this.set(setKey, trackingSet);
    }

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
   *
   * @returns { announcementId: viewCount }
   */
  async getAllAnnouncementViewCounts(): Promise<Record<string, number>> {
    const setKey = 'announcement:viewCount:tracking';
    const trackingSet = (await this.get<string[]>(setKey)) || [];

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
   * 공지사항 조회수 초기화 (DB 동기화 후 호출)
   *
   * @param announcementId - 공지사항 ID
   */
  async resetAnnouncementViewCount(announcementId: string): Promise<void> {
    const key = `announcement:viewCount:${announcementId}`;
    const setKey = 'announcement:viewCount:tracking';

    await this.del(key);

    // 추적 Set에서 announcementId 제거
    const trackingSet = (await this.get<string[]>(setKey)) || [];
    const filtered = trackingSet.filter((id) => id !== announcementId);
    await this.set(setKey, filtered);
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
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
   * Redis에만 기록하고, 스케줄러가 주기적으로 DB에 동기화
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

    // 이미 읽음 처리된 경우 스킵
    if (await this.has(key)) {
      return;
    }

    // 읽음 표시 (TTL 없이 저장)
    await this.set(key, new Date().toISOString());

    // 추적 목록에 추가
    const trackingList = (await this.get<string[]>(trackingKey)) || [];
    const item = `${announcementId}:${userId}`;
    if (!trackingList.includes(item)) {
      trackingList.push(item);
      await this.set(trackingKey, trackingList);
    }
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
   * 모든 읽음 처리 기록 조회 (DB 동기화용)
   *
   * @returns [{ announcementId, userId, readAt }]
   */
  async getAllAnnouncementReads(): Promise<
    Array<{ announcementId: string; userId: string; readAt: string }>
  > {
    const trackingKey = 'announcement:read:tracking';
    const trackingList = (await this.get<string[]>(trackingKey)) || [];

    const reads: Array<{
      announcementId: string;
      userId: string;
      readAt: string;
    }> = [];

    for (const item of trackingList) {
      const [announcementId, userId] = item.split(':');
      const key = `announcement:read:${announcementId}:${userId}`;
      const readAt = await this.get<string>(key);

      if (readAt) {
        reads.push({ announcementId, userId, readAt });
      }
    }

    return reads;
  }

  /**
   * 읽음 처리 기록 삭제 (DB 동기화 후)
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

    await this.del(key);

    // 추적 목록에서 제거
    const trackingList = (await this.get<string[]>(trackingKey)) || [];
    const item = `${announcementId}:${userId}`;
    const filtered = trackingList.filter((i) => i !== item);
    await this.set(trackingKey, filtered);
  }
}
