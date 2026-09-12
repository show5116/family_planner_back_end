import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { MediaStatus, SubscriptionPlatform } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationService } from '@/notification/notification.service';
import {
  EXPIRY_NOTICE_EVENT,
  SubscriptionExpiryScheduler,
} from './subscription-expiry.scheduler';

const MB = 1024 * 1024;
const GB = 1024 * MB;
const DAY_MS = 24 * 60 * 60 * 1000;

describe('SubscriptionExpiryScheduler', () => {
  let scheduler: SubscriptionExpiryScheduler;

  const mockPrismaService = {
    user: { findMany: jest.fn() },
    subscriptionEvent: { findMany: jest.fn(), create: jest.fn() },
    diaryMedia: { groupBy: jest.fn() },
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  // 키를 그대로 돌려주어 어떤 문구가 선택됐는지 검증한다
  const mockI18nService = {
    t: jest.fn((key: string) => key),
  };

  const mockConfigService = {
    get: jest.fn(() => ({ free: { totalBytes: 500 * MB } })),
  };

  const userRow = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'user-1',
    language: 'ko',
    subscriptionExpiresAt: new Date(Date.now() + 5 * DAY_MS),
    subscription: { platform: SubscriptionPlatform.IOS },
    ...over,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionExpiryScheduler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    scheduler = module.get(SubscriptionExpiryScheduler);

    jest.clearAllMocks();
    process.env.ENABLE_SCHEDULER = 'subscription';
    mockConfigService.get.mockReturnValue({ free: { totalBytes: 500 * MB } });
    mockI18nService.t.mockImplementation((key: string) => key);
    mockPrismaService.subscriptionEvent.findMany.mockResolvedValue([]);
    mockPrismaService.diaryMedia.groupBy.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.ENABLE_SCHEDULER;
  });

  it('스케줄러가 꺼져 있으면 아무것도 하지 않아야 함', async () => {
    delete process.env.ENABLE_SCHEDULER;

    await scheduler.notifyExpiringSubscriptions();

    expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
  });

  it('자동 갱신을 끈 사용자만 조회해야 함 (갱신될 사람에게 보내면 거짓말)', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subscription: { autoRenewing: false },
        }),
      }),
    );
  });

  it('대상이 없으면 알림을 보내지 않아야 함', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
  });

  it('한도를 넘지 않으면 기본 문구를 써야 함', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([userRow()]);
    mockPrismaService.diaryMedia.groupBy.mockResolvedValue([
      { userId: 'user-1', _sum: { fileSize: 100 * MB } },
    ]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        body: 'subscription.notification.expiring_body',
      }),
    );
  });

  it('한도를 넘으면 초과 용량 문구를 쓰고 GB를 채워야 함', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([userRow()]);
    mockPrismaService.diaryMedia.groupBy.mockResolvedValue([
      { userId: 'user-1', _sum: { fileSize: 2 * GB + 500 * MB } },
    ]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'subscription.notification.expiring_body_over_quota',
      }),
    );
    expect(mockI18nService.t).toHaveBeenCalledWith(
      'subscription.notification.expiring_body_over_quota',
      expect.objectContaining({
        args: expect.objectContaining({ usedGb: '2.5', overGb: '2.0' }),
      }),
    );
  });

  it('누적 집계는 CONFIRMED + 미삭제만 세어야 함', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([userRow()]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockPrismaService.diaryMedia.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: MediaStatus.CONFIRMED,
          deletedAt: null,
        }),
      }),
    );
  });

  it('이미 보낸 사용자는 건너뛰어야 함 (한 주기 1회)', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([userRow()]);
    mockPrismaService.subscriptionEvent.findMany.mockResolvedValue([
      { userId: 'user-1' },
    ]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    expect(mockPrismaService.subscriptionEvent.create).not.toHaveBeenCalled();
  });

  it('발송 후 EXPIRY_NOTICE 이벤트를 남겨야 함', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([userRow()]);

    await scheduler.notifyExpiringSubscriptions();

    expect(mockPrismaService.subscriptionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          eventType: EXPIRY_NOTICE_EVENT,
          platform: SubscriptionPlatform.IOS,
        }),
      }),
    );
  });

  it('한 명이 실패해도 나머지는 발송해야 함', async () => {
    mockPrismaService.user.findMany.mockResolvedValue([
      userRow({ id: 'user-1' }),
      userRow({ id: 'user-2' }),
    ]);
    mockNotificationService.sendNotification
      .mockRejectedValueOnce(new Error('FCM 장애'))
      .mockResolvedValueOnce({ queued: true });

    await scheduler.notifyExpiringSubscriptions();

    expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(2);
    expect(mockPrismaService.subscriptionEvent.create).toHaveBeenCalledTimes(1);
  });
});
