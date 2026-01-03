import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { RedisService } from '@/redis/redis.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

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
      // 캐시된 데이터에 사용자별 읽음 상태만 추가
      return {
        ...cached,
        data: await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          cached.data.map(async (a: any) => ({
            ...a,
            isRead: await this.redisService.isAnnouncementRead(a.id, userId),
          })),
        ),
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

    // 4. 응답 데이터 생성
    const data = await Promise.all(
      announcements.map(async (a) => ({
        ...a,
        readCount: a._count.reads,
        isRead: await this.redisService.isAnnouncementRead(a.id, userId),
        viewCount:
          a.viewCount +
          (await this.redisService.getAnnouncementViewCount(a.id)),
        _count: undefined,
      })),
    );

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
   * 공지사항 작성 + 전체 알림 발송 + 캐시 무효화
   */
  async create(authorId: string, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.announcement.create({
      data: {
        authorId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        isPinned: dto.isPinned,
        attachments: dto.attachments as any,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    // 목록 캐시 무효화
    await this.redisService.invalidateAllAnnouncementListCache();

    // 전체 회원에게 알림 발송 (비동기)
    this.sendAnnouncementNotification(announcement).catch((err) => {
      console.error('공지사항 알림 발송 실패:', err);
    });

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
   * 전체 회원에게 알림 발송 (SYSTEM 카테고리 켜진 사용자만)
   */
  private async sendAnnouncementNotification(announcement: any) {
    // SYSTEM 알림이 켜진 모든 사용자 조회
    const users = await this.prisma.user.findMany({
      where: {
        notificationSettings: {
          some: {
            category: NotificationCategory.SYSTEM,
            enabled: true,
          },
        },
      },
      select: { id: true },
    });

    // 배치로 알림 발송
    await Promise.allSettled(
      users.map((user) =>
        this.notificationService.sendNotification({
          userId: user.id,
          category: NotificationCategory.SYSTEM,
          title: '새 공지사항',
          body: announcement.title,
          data: {
            announcementId: announcement.id,
            action: 'view_announcement',
          },
        }),
      ),
    );
  }
}
