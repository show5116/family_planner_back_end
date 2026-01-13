import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { RedisService } from '@/redis/redis.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// dayjs 플러그인 활성화
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 공지사항 목록 조회 (고정 공지 우선) + Redis 캐싱
   */
  async findAll(userId: string, query: AnnouncementQueryDto) {
    // 1. 캐시 키 생성 (userId 제외 - 공지사항은 모든 사용자가 동일하게 봄)
    const cacheKey = `${query.page}:${query.limit}:${query.category || 'all'}:${query.pinnedOnly || false}`;

    // 2. Redis 캐시 확인
    const cached = await this.redisService.getCachedAnnouncementList(cacheKey);
    if (cached) {
      // 캐시된 데이터에 사용자별 읽음 상태만 추가 (배치 조회)
      const announcementIds = cached.data.map((a: any) => a.id);
      const readStatusMap = await this.redisService.batchIsAnnouncementRead(
        announcementIds,
        userId,
      );

      return {
        ...cached,
        data: cached.data.map((a: any) => ({
          ...a,
          isRead: readStatusMap[a.id] || false,
        })),
      };
    }

    // 3. DB 조회
    const where: any = {
      deletedAt: null,
      ...(query.category && { category: query.category }),
      ...(query.pinnedOnly && { isPinned: true }),
    };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          isPinned: true,
          viewCount: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true },
          },
          _count: {
            select: { reads: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    // 4. 응답 데이터 생성 (배치 Redis 조회로 N+1 문제 해결)
    const announcementIds = announcements.map((a) => a.id);

    // 일괄 조회 (단일 RTT)
    const [readStatusMap, viewCountMap] = await Promise.all([
      this.redisService.batchIsAnnouncementRead(announcementIds, userId),
      this.redisService.batchGetAnnouncementViewCount(announcementIds),
    ]);

    const data = announcements.map((a) => ({
      ...a,
      readCount: a._count.reads,
      isRead: readStatusMap[a.id] || false,
      viewCount: a.viewCount + (viewCountMap[a.id] || 0),
      _count: undefined,
    }));

    const result = {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };

    // 5. Redis에 캐싱 (TTL: 5분)
    await this.redisService.cacheAnnouncementList(cacheKey, result);

    return result;
  }

  /**
   * 공지사항 상세 조회 + 자동 읽음 처리 + 조회수 카운트 + 캐싱
   */
  async findOne(id: string, userId: string) {
    // 1. Redis 캐시 확인
    const cached = await this.redisService.getCachedAnnouncement(id);
    if (cached) {
      // 캐시된 데이터 반환 + 조회수 증가 (비동기)
      void this.incrementViewCountAsync(id, userId);
      return {
        ...cached,
        viewCount:
          cached.viewCount +
          (await this.redisService.getAnnouncementViewCount(id)),
      };
    }

    // 2. DB에서 조회
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        isPinned: true,
        viewCount: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { reads: true },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    // 3. Redis에 캐싱 (TTL: 7일)
    const result = {
      ...announcement,
      readCount: announcement._count.reads,
      _count: undefined,
    };
    await this.redisService.cacheAnnouncement(id, result);

    // 4. 조회수 증가 (비동기)
    void this.incrementViewCountAsync(id, userId);

    return {
      ...result,
      viewCount:
        result.viewCount +
        (await this.redisService.getAnnouncementViewCount(id)),
    };
  }

  /**
   * 조회수 증가 + 읽음 처리 (비동기)
   * Redis Write-Back 전략: Redis에만 기록하고 스케줄러가 DB에 동기화
   */
  private async incrementViewCountAsync(
    announcementId: string,
    userId: string,
  ): Promise<void> {
    // Redis 조회수 증가
    await this.redisService.incrementAnnouncementViewCount(announcementId);

    // Redis 읽음 처리 (Write-Back 전략)
    await this.redisService.markAnnouncementAsRead(announcementId, userId);
  }

  /**
   * 현재 시간이 조용한 시간대(저녁 6시 ~ 오전 9시)인지 확인
   * 한국 시간 기준 (Asia/Seoul)
   *
   * @returns 조용한 시간대이면 true
   */
  private isQuietHours(): boolean {
    const kstHour = dayjs().tz('Asia/Seoul').hour();

    // 저녁 6시(18시) ~ 오전 9시 사이
    return kstHour >= 18 || kstHour < 9;
  }

  /**
   * 다음 오전 9시(KST) 시간 계산
   *
   * @returns 다음 오전 9시(KST)의 Date 객체 (UTC로 저장)
   *
   * 예시:
   * - 현재 KST 08:00 → 오늘 09:00 (1시간 후)
   * - 현재 KST 10:00 → 내일 09:00 (23시간 후)
   * - 현재 KST 23:00 → 내일 09:00 (10시간 후)
   */
  private getNextMorningNine(): Date {
    const now = dayjs().tz('Asia/Seoul');
    let nextMorning = now.hour(9).minute(0).second(0).millisecond(0);

    // 현재 시간이 이미 오전 9시 이후라면 다음날 오전 9시
    if (now.hour() >= 9) {
      nextMorning = nextMorning.add(1, 'day');
    }

    // UTC Date 객체로 변환하여 반환
    return nextMorning.toDate();
  }

  /**
   * 공지사항 작성 + 알림 발송/예약 + 캐시 무효화
   * 저녁 6시 ~ 오전 9시 사이 작성 시 자동으로 다음 오전 9시에 예약
   */
  async create(authorId: string, dto: CreateAnnouncementDto) {
    // 조용한 시간대인지 확인
    const shouldSchedule = this.isQuietHours();
    const scheduledTime = shouldSchedule ? this.getNextMorningNine() : null;

    const announcement = await this.prisma.announcement.create({
      data: {
        authorId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        isPinned: dto.isPinned,
        attachments: dto.attachments as any,
        scheduledNotificationAt: scheduledTime,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    // 목록 캐시 무효화
    await this.redisService.invalidateAllAnnouncementListCache();

    // 알림 발송 또는 예약
    if (shouldSchedule && scheduledTime) {
      // 예약 발송: Redis Sorted Set에 추가
      await this.redisService.scheduleAnnouncementNotification(
        announcement.id,
        announcement.title,
        scheduledTime,
      );
      console.log(
        `공지사항 알림 예약 완료: ${announcement.id} (발송 시간: ${scheduledTime.toISOString()})`,
      );
    } else {
      // 즉시 발송: 전체 회원에게 알림 발송 (비동기)
      this.sendAnnouncementNotification(announcement).catch((err) => {
        console.error('공지사항 알림 발송 실패:', err);
      });
    }

    return announcement;
  }

  /**
   * 공지사항 수정 + 캐시 무효화
   */
  async update(id: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.category && { category: dto.category }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.attachments && { attachments: dto.attachments as any }),
      },
    });

    // 캐시 무효화
    await this.redisService.invalidateAnnouncementCache(id);
    await this.redisService.invalidateAllAnnouncementListCache();

    return updated;
  }

  /**
   * 공지사항 삭제 (Soft Delete) + 캐시 무효화
   */
  async remove(id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    await this.prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 캐시 무효화
    await this.redisService.invalidateAnnouncementCache(id);
    await this.redisService.invalidateAllAnnouncementListCache();
  }

  /**
   * 공지사항 고정/해제
   */
  async togglePin(id: string, isPinned: boolean) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    return this.prisma.announcement.update({
      where: { id },
      data: { isPinned },
    });
  }

  /**
   * 전체 회원에게 알림 발송 (FCM Topic 사용)
   * SYSTEM 알림이 켜진 모든 사용자에게 단일 API 호출로 전송
   */
  private async sendAnnouncementNotification(announcement: any) {
    // FCM Topic으로 알림 전송 (메모리 효율적, 단일 API 호출)
    await this.notificationService.sendAnnouncementNotification({
      id: announcement.id,
      title: announcement.title,
    });
  }
}
