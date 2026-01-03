/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';
import { AnnouncementCategory } from '@/announcement/enums/announcement-category.enum';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    announcement: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    announcementRead: {
      upsert: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    // 모든 모의 함수 초기화
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('고정 공지가 우선 정렬되어야 함', async () => {
      const userId = 'user-1';
      const mockAnnouncements = [
        {
          id: 'ann-1',
          title: '고정 공지',
          isPinned: true,
          createdAt: new Date('2025-01-01'),
          reads: [],
        },
        {
          id: 'ann-2',
          title: '일반 공지',
          isPinned: false,
          createdAt: new Date('2025-01-02'),
          reads: [],
        },
      ];

      mockPrismaService.announcement.findMany.mockResolvedValue(
        mockAnnouncements,
      );
      mockPrismaService.announcement.count.mockResolvedValue(2);

      const result = await service.findAll(userId, {
        page: 1,
        limit: 20,
        pinnedOnly: false,
      });

      expect(result.data).toHaveLength(2);
      expect(prismaService.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        }),
      );
    });

    it('사용자별 읽음 여부를 포함해야 함', async () => {
      const userId = 'user-1';
      const mockAnnouncements = [
        {
          id: 'ann-1',
          title: '공지',
          reads: [{ id: 'read-1', userId: 'user-1' }],
        },
      ];

      mockPrismaService.announcement.findMany.mockResolvedValue(
        mockAnnouncements,
      );
      mockPrismaService.announcement.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {
        page: 1,
        limit: 20,
        pinnedOnly: false,
      });

      expect(result.data[0].isRead).toBe(true);
      expect(result.data[0].readCount).toBe(1);
    });

    it('pinnedOnly 옵션이 적용되어야 함', async () => {
      const userId = 'user-1';
      mockPrismaService.announcement.findMany.mockResolvedValue([]);
      mockPrismaService.announcement.count.mockResolvedValue(0);

      await service.findAll(userId, { page: 1, limit: 20, pinnedOnly: true });

      expect(prismaService.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPinned: true,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('공지 상세 조회 시 자동으로 읽음 처리되어야 함', async () => {
      const announcementId = 'ann-1';
      const userId = 'user-1';
      const mockAnnouncement = {
        id: announcementId,
        title: '테스트 공지',
        reads: [],
      };

      mockPrismaService.announcement.findFirst.mockResolvedValue(
        mockAnnouncement,
      );
      mockPrismaService.announcementRead.upsert.mockResolvedValue({});

      await service.findOne(announcementId, userId);

      expect(prismaService.announcementRead.upsert).toHaveBeenCalledWith({
        where: {
          announcementId_userId: {
            announcementId,
            userId,
          },
        },
        create: {
          announcementId,
          userId,
        },
        update: {},
      });
    });

    it('존재하지 않는 공지 조회 시 NotFoundException 발생', async () => {
      mockPrismaService.announcement.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('공지 작성 후 SYSTEM 알림이 켜진 모든 사용자에게 알림 발송', async () => {
      const authorId = 'admin-1';
      const createDto = {
        title: '새 공지',
        content: '내용',
        category: AnnouncementCategory.ANNOUNCEMENT,
        isPinned: false,
      };
      const mockAnnouncement = {
        id: 'ann-1',
        ...createDto,
        authorId,
      };
      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }];

      mockPrismaService.announcement.create.mockResolvedValue(mockAnnouncement);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockNotificationService.sendNotification.mockResolvedValue({});

      const result = await service.create(authorId, createDto);

      expect(result).toEqual(mockAnnouncement);

      // 비동기 알림 발송을 위한 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
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
    });
  });

  describe('update', () => {
    it('공지사항 수정 성공', async () => {
      const announcementId = 'ann-1';
      const updateDto = {
        title: '수정된 제목',
        content: '수정된 내용',
      };
      const mockAnnouncement = {
        id: announcementId,
        title: '원래 제목',
        deletedAt: null,
      };
      const mockUpdated = {
        id: announcementId,
        ...updateDto,
      };

      mockPrismaService.announcement.findFirst.mockResolvedValue(
        mockAnnouncement,
      );
      mockPrismaService.announcement.update.mockResolvedValue(mockUpdated);

      const result = await service.update(announcementId, updateDto);

      expect(result).toEqual(mockUpdated);
      expect(prismaService.announcement.update).toHaveBeenCalledWith({
        where: { id: announcementId },
        data: expect.objectContaining({
          title: updateDto.title,
          content: updateDto.content,
        }),
      });
    });

    it('존재하지 않는 공지 수정 시 NotFoundException 발생', async () => {
      mockPrismaService.announcement.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { title: '수정' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('공지사항 삭제 시 Soft Delete 처리', async () => {
      const announcementId = 'ann-1';
      const mockAnnouncement = {
        id: announcementId,
        deletedAt: null,
      };

      mockPrismaService.announcement.findFirst.mockResolvedValue(
        mockAnnouncement,
      );
      mockPrismaService.announcement.update.mockResolvedValue({});

      await service.remove(announcementId);

      expect(prismaService.announcement.update).toHaveBeenCalledWith({
        where: { id: announcementId },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('togglePin', () => {
    it('공지사항 고정/해제 토글', async () => {
      const announcementId = 'ann-1';
      const mockAnnouncement = {
        id: announcementId,
        isPinned: false,
        deletedAt: null,
      };

      mockPrismaService.announcement.findFirst.mockResolvedValue(
        mockAnnouncement,
      );
      mockPrismaService.announcement.update.mockResolvedValue({
        ...mockAnnouncement,
        isPinned: true,
      });

      await service.togglePin(announcementId, true);

      expect(prismaService.announcement.update).toHaveBeenCalledWith({
        where: { id: announcementId },
        data: { isPinned: true },
      });
    });
  });
});
