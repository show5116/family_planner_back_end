/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { QnaService } from './qna.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { QuestionStatus } from './enums/question-status.enum';
import { QuestionVisibility } from './enums/question-visibility.enum';
import { QuestionCategory } from './enums/question-category.enum';
import { NotificationCategory } from '@/notification/enums/notification-category.enum';

describe('QnaService', () => {
  let service: QnaService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    question: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    answer: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QnaService,
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

    service = module.get<QnaService>(QnaService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPublicQuestions', () => {
    it('공개(PUBLIC) 질문만 필터링되어야 함', async () => {
      const mockQuestions = [
        {
          id: 'q-1',
          title: '공개 질문',
          content: '내용'.repeat(50),
          visibility: QuestionVisibility.PUBLIC,
          user: { id: 'user-1', name: '사용자1' },
          answers: [],
        },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);
      mockPrismaService.question.count.mockResolvedValue(1);

      const result = await service.findPublicQuestions({
        page: 1,
        limit: 20,
      });

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: QuestionVisibility.PUBLIC,
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('내용이 100자로 미리보기되어야 함', async () => {
      const longContent = 'a'.repeat(200);
      const mockQuestions = [
        {
          id: 'q-1',
          title: '질문',
          content: longContent,
          visibility: QuestionVisibility.PUBLIC,
          user: { id: 'user-1', name: '사용자1' },
          answers: [],
        },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);
      mockPrismaService.question.count.mockResolvedValue(1);

      const result = await service.findPublicQuestions({
        page: 1,
        limit: 20,
      });

      expect(result.data[0].content).toHaveLength(100);
    });

    it('검색어로 제목/내용 검색 가능', async () => {
      mockPrismaService.question.findMany.mockResolvedValue([]);
      mockPrismaService.question.count.mockResolvedValue(0);

      await service.findPublicQuestions({
        page: 1,
        limit: 20,
        search: '검색어',
      });

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: '검색어' } },
              { content: { contains: '검색어' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findMyQuestions', () => {
    it('본인 질문만 조회되어야 함', async () => {
      const userId = 'user-1';
      const mockQuestions = [
        {
          id: 'q-1',
          userId,
          title: '내 질문',
          answers: [],
        },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);
      mockPrismaService.question.count.mockResolvedValue(1);

      await service.findMyQuestions(userId, { page: 1, limit: 20 });

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
          }),
        }),
      );
    });
  });

  describe('findAllQuestionsForAdmin', () => {
    it('PENDING 질문이 우선 정렬되어야 함', async () => {
      mockPrismaService.question.findMany.mockResolvedValue([]);
      mockPrismaService.question.count.mockResolvedValue(0);

      await service.findAllQuestionsForAdmin({ page: 1, limit: 20 });

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('사용자명으로도 검색 가능', async () => {
      mockPrismaService.question.findMany.mockResolvedValue([]);
      mockPrismaService.question.count.mockResolvedValue(0);

      await service.findAllQuestionsForAdmin({
        page: 1,
        limit: 20,
        search: '홍길동',
      });

      expect(prismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { user: { name: { contains: '홍길동' } } },
            ]),
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('질문 작성 후 ADMIN에게 알림 발송', async () => {
      const userId = 'user-1';
      const createDto = {
        title: '질문',
        content: '내용',
        category: QuestionCategory.BUG,
        visibility: QuestionVisibility.PRIVATE,
      };
      const mockQuestion = {
        id: 'q-1',
        ...createDto,
        userId,
        user: { id: userId, name: '사용자' },
      };
      const mockAdmins = [{ id: 'admin-1' }];

      mockPrismaService.question.create.mockResolvedValue(mockQuestion);
      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockNotificationService.sendNotification.mockResolvedValue({});

      const result = await service.create(userId, createDto);

      expect(result).toEqual(mockQuestion);

      // 비동기 알림 발송 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          isAdmin: true,
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
    it('본인 작성 질문만 수정 가능', async () => {
      const questionId = 'q-1';
      const userId = 'user-1';
      const updateDto = { title: '수정된 제목' };
      const mockQuestion = {
        id: questionId,
        userId: 'other-user',
        status: QuestionStatus.PENDING,
        deletedAt: null,
      };

      mockPrismaService.question.findFirst.mockResolvedValue(mockQuestion);

      await expect(
        service.update(questionId, userId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ANSWERED 또는 RESOLVED 상태에서는 수정 불가', async () => {
      const questionId = 'q-1';
      const userId = 'user-1';
      const mockQuestion = {
        id: questionId,
        userId,
        status: QuestionStatus.ANSWERED,
        deletedAt: null,
      };

      mockPrismaService.question.findFirst.mockResolvedValue(mockQuestion);

      await expect(
        service.update(questionId, userId, { title: '수정' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('PENDING 상태일 때 수정 성공', async () => {
      const questionId = 'q-1';
      const userId = 'user-1';
      const updateDto = { title: '수정된 제목' };
      const mockQuestion = {
        id: questionId,
        userId,
        status: QuestionStatus.PENDING,
        deletedAt: null,
      };

      mockPrismaService.question.findFirst.mockResolvedValue(mockQuestion);
      mockPrismaService.question.update.mockResolvedValue({
        ...mockQuestion,
        ...updateDto,
      });

      const result = await service.update(questionId, userId, updateDto);

      expect(result.title).toBe(updateDto.title);
    });
  });

  describe('createAnswer', () => {
    it('답변 작성 시 질문 상태가 ANSWERED로 변경', async () => {
      const questionId = 'q-1';
      const adminId = 'admin-1';
      const createDto = {
        content: '답변 내용',
      };
      const mockQuestion = {
        id: questionId,
        userId: 'user-1',
        user: { id: 'user-1', name: '사용자' },
        deletedAt: null,
      };
      const mockAnswer = {
        id: 'a-1',
        questionId,
        adminId,
        content: createDto.content,
        admin: { id: adminId, name: 'ADMIN' },
      };

      mockPrismaService.question.findFirst.mockResolvedValue(mockQuestion);
      mockPrismaService.$transaction.mockResolvedValue([mockAnswer]);
      mockNotificationService.sendNotification.mockResolvedValue({});

      const result = await service.createAnswer(questionId, adminId, createDto);

      expect(result).toEqual(mockAnswer);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('답변 작성 후 질문 작성자에게 알림 발송', async () => {
      const questionId = 'q-1';
      const adminId = 'admin-1';
      const mockQuestion = {
        id: questionId,
        userId: 'user-1',
        title: '질문 제목',
        user: { id: 'user-1', name: '사용자' },
        deletedAt: null,
      };
      const mockAnswer = {
        id: 'a-1',
        questionId,
        adminId,
        content: '답변',
        admin: { id: adminId, name: 'ADMIN' },
      };

      mockPrismaService.question.findFirst.mockResolvedValue(mockQuestion);
      mockPrismaService.$transaction.mockResolvedValue([mockAnswer]);
      mockNotificationService.sendNotification.mockResolvedValue({});

      await service.createAnswer(questionId, adminId, { content: '답변' });

      // 비동기 알림 발송 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockQuestion.userId,
          category: NotificationCategory.SYSTEM,
        }),
      );
    });
  });

  describe('getStatistics', () => {
    it('통계 데이터를 올바르게 반환', async () => {
      const mockCategoryStats = [
        { category: QuestionCategory.BUG, _count: { category: 5 } },
        { category: QuestionCategory.FEATURE, _count: { category: 3 } },
      ];
      const mockRecentQuestions = [
        {
          id: 'q-1',
          title: '최근 질문',
          category: QuestionCategory.BUG,
          status: QuestionStatus.PENDING,
          visibility: QuestionVisibility.PUBLIC,
          createdAt: new Date(),
          user: { id: 'user-1', name: '사용자' },
        },
      ];

      mockPrismaService.question.count
        .mockResolvedValueOnce(10) // totalQuestions
        .mockResolvedValueOnce(3) // pendingCount
        .mockResolvedValueOnce(5); // answeredCount
      mockPrismaService.question.groupBy.mockResolvedValue(mockCategoryStats);
      mockPrismaService.question.findMany.mockResolvedValue(
        mockRecentQuestions,
      );

      const result = await service.getStatistics();

      expect(result.totalQuestions).toBe(10);
      expect(result.statusStats.pending).toBe(3);
      expect(result.statusStats.answered).toBe(5);
      expect(result.categoryStats).toHaveLength(2);
      expect(result.recentQuestions).toHaveLength(1);
    });
  });
});
