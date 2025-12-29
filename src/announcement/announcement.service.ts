import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 공지사항 목록 조회 (고정 공지 우선)
   */
  async findAll(userId: string, query: AnnouncementQueryDto) {
    const where: any = {
      deletedAt: null,
      ...(query.pinnedOnly && { isPinned: true }),
    };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true },
          },
          reads: {
            select: { id: true, userId: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements.map((a) => ({
        ...a,
        readCount: a.reads.length,
        isRead: a.reads.some((r) => r.userId === userId),
        reads: undefined, // 제거
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * 공지사항 상세 조회 + 자동 읽음 처리
   */
  async findOne(id: string, userId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: {
          select: { id: true, name: true },
        },
        reads: {
          select: { id: true },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    // 읽음 처리 (이미 읽었으면 스킵)
    await this.prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId,
        },
      },
      create: {
        announcementId: id,
        userId,
      },
      update: {},
    });

    return {
      ...announcement,
      readCount: announcement.reads.length,
      reads: undefined,
    };
  }

  /**
   * 공지사항 작성 + 전체 알림 발송
   */
  async create(authorId: string, dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.announcement.create({
      data: {
        authorId,
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned,
        attachments: dto.attachments as any,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    // 전체 회원에게 알림 발송 (비동기)
    this.sendAnnouncementNotification(announcement).catch((err) => {
      console.error('공지사항 알림 발송 실패:', err);
    });

    return announcement;
  }

  /**
   * 공지사항 수정
   */
  async update(id: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다');
    }

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        ...(dto.attachments && { attachments: dto.attachments as any }),
      },
    });
  }

  /**
   * 공지사항 삭제 (Soft Delete)
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
